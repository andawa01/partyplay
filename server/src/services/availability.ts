import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, notFound } from "../lib/api-error";
import { formatCalendarDate, isPastDate, parseCalendarDate, todayInNairobi } from "../lib/dates";
import { money } from "../lib/money";
import { expireOverdueBookings } from "./hold-expiry";

// ---------------------------------------------------------------------------
// Inventory availability (Phase 2.2, rules A and C)
//
// What counts as "reserved" for an equipment item over a date range:
//   1. BookingItem rows of confirmed bookings that overlap the range.
//   2. BookingPackageItem rows of confirmed bookings that overlap the range —
//      a package consumes the equipment it includes, not just its own line.
//   3. ACTIVE StockHold rows that have not expired, owned by pending bookings.
//
// Confirmed bookings deliberately do NOT rely on StockHold: their item rows are
// the source of truth, so stock stays reserved after the hold window closes.
// Pending holds and approved items are keyed off different statuses, so the
// same units are never counted twice.
// ---------------------------------------------------------------------------

/** Booking statuses that consume inventory until cancelled or completed. */
export const CONFIRMED_BOOKING_STATUSES = ["CONFIRMED"] as const;

/** Booking statuses that reserve inventory through a temporary hold. */
export const HOLDING_BOOKING_STATUSES = ["PENDING"] as const;

/** The shared client, or a transaction so booking writes read a consistent snapshot. */
export type AvailabilityClient = Prisma.TransactionClient | PrismaClient;

export type AvailabilityInput = {
  equipmentIds: string[];
  startDate: Date;
  endDate: Date;
  /** Ignore this booking's own reservations (used when editing a booking). */
  excludeBookingId?: string;
  /** Injectable clock so expiry logic is testable. */
  now?: Date;
  /** Read through a transaction when called inside booking creation. */
  client?: AvailabilityClient;
};

export type AvailabilityRow = {
  equipmentId: string;
  name: string;
  total: number;
  reserved: number;
  available: number;
};

/** Normalise to a UTC calendar date so @db.Date columns compare cleanly. */
export function toDateOnly(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isValidRange(startDate: Date, endDate: Date): boolean {
  return startDate.getTime() <= endDate.getTime();
}

/**
 * Sum of units reserved per equipment for the given range.
 * Equipment with no reservations are absent from the map.
 */
export async function getReservedQuantities(input: AvailabilityInput): Promise<Map<string, number>> {
  const { equipmentIds, excludeBookingId, now = new Date() } = input;
  const client = input.client ?? db;
  const startDate = toDateOnly(input.startDate);
  const endDate = toDateOnly(input.endDate);

  if (equipmentIds.length === 0) {
    return new Map();
  }
  if (!isValidRange(startDate, endDate)) {
    throw new Error("startDate must be on or before endDate");
  }

  // A booking overlaps when its inclusive range intersects the requested range.
  const overlappingBooking = {
    status: { in: [...CONFIRMED_BOOKING_STATUSES] },
    startDate: { lte: endDate },
    endDate: { gte: startDate },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
  };

  const [standaloneItems, packageItems, activeHolds] = await Promise.all([
    client.bookingItem.groupBy({
      by: ["equipmentId"],
      where: {
        equipmentId: { in: equipmentIds },
        booking: overlappingBooking,
      },
      _sum: { quantity: true },
    }),
    client.bookingPackageItem.groupBy({
      by: ["equipmentId"],
      where: {
        equipmentId: { in: equipmentIds },
        packageBooking: { booking: overlappingBooking },
      },
      _sum: { quantity: true },
    }),
    client.stockHold.groupBy({
      by: ["equipmentId"],
      where: {
        equipmentId: { in: equipmentIds },
        status: "ACTIVE",
        expiresAt: { gt: now },
        booking: {
          status: { in: [...HOLDING_BOOKING_STATUSES] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  const reserved = new Map<string, number>();
  const add = (equipmentId: string | null, quantity: number | null) => {
    if (!equipmentId || !quantity) return;
    reserved.set(equipmentId, (reserved.get(equipmentId) ?? 0) + quantity);
  };

  for (const row of standaloneItems) add(row.equipmentId, row._sum.quantity);
  for (const row of packageItems) add(row.equipmentId, row._sum.quantity);
  for (const row of activeHolds) add(row.equipmentId, row._sum.quantity);

  return reserved;
}

/** Availability per equipment for a date range. */
export async function getAvailability(input: AvailabilityInput): Promise<AvailabilityRow[]> {
  const client = input.client ?? db;
  const [equipment, reserved] = await Promise.all([
    client.equipment.findMany({
      where: { id: { in: input.equipmentIds } },
      select: { id: true, name: true, inventory: { select: { total: true } } },
    }),
    getReservedQuantities(input),
  ]);

  return equipment.map((item) => {
    // EquipmentInventory is unique per equipment but declared as a list relation.
    const total = item.inventory[0]?.total ?? 0;
    const reservedUnits = reserved.get(item.id) ?? 0;
    return {
      equipmentId: item.id,
      name: item.name,
      total,
      reserved: reservedUnits,
      available: Math.max(0, total - reservedUnits),
    };
  });
}

// ---------------------------------------------------------------------------
// Public API (F5). These functions add request validation, active-only lookups and
// response shaping on top of the reservation queries above; the counting logic stays
// in one place so booking creation (F6b) sees exactly what the calendar showed.
// ---------------------------------------------------------------------------

type DateRangeQuery = { startDate: string; endDate: string };

function parsePublicRange(input: DateRangeQuery): { startDate: Date; endDate: Date } {
  const startDate = parseCalendarDate(input.startDate);
  const endDate = parseCalendarDate(input.endDate);

  if (!isValidRange(startDate, endDate)) {
    throw badRequest("endDate must be on or after startDate", {
      startDate: formatCalendarDate(startDate),
      endDate: formatCalendarDate(endDate),
    });
  }

  if (isPastDate(startDate)) {
    throw badRequest("startDate has already passed", {
      startDate: formatCalendarDate(startDate),
      today: formatCalendarDate(todayInNairobi()),
    });
  }

  return { startDate, endDate };
}

/**
 * Availability for an explicit set of equipment ids. Ids that are unknown or inactive
 * are a 404 rather than a zero row: the calendar should not silently accept a request
 * for something the site no longer offers.
 */
export async function getPublicAvailability(input: { equipmentIds: string[] } & DateRangeQuery) {
  const range = parsePublicRange(input);

  const found = await db.equipment.findMany({
    where: { id: { in: input.equipmentIds }, isActive: true },
    select: { id: true },
  });
  const bookable = new Set(found.map((row) => row.id));
  const missingEquipmentIds = input.equipmentIds.filter((id) => !bookable.has(id));

  if (missingEquipmentIds.length > 0) {
    throw notFound("Some equipment items were not found", { missingEquipmentIds });
  }

  // Bounded lazy expiry: only bookings holding one of the items being asked about.
  await expireOverdueBookings({ equipmentIds: input.equipmentIds });

  const rows = await getAvailability({ equipmentIds: input.equipmentIds, ...range });

  // Answer in the order the caller asked, not whatever order the database returned.
  const requestedOrder = new Map(input.equipmentIds.map((id, index) => [id, index]));
  rows.sort(
    (a, b) => (requestedOrder.get(a.equipmentId) ?? 0) - (requestedOrder.get(b.equipmentId) ?? 0),
  );

  return {
    data: rows,
    meta: {
      startDate: formatCalendarDate(range.startDate),
      endDate: formatCalendarDate(range.endDate),
      note: "Informational only: availability is re-checked when the booking is created.",
    },
  };
}

type CalendarDay = { date: string; available: number };

/**
 * Expands a package into its equipment demand for the requested number of packages
 * (Rule A) and reports the largest quantity that fits. `minAvailable` is the floor of
 * the tightest item, because one short item makes the whole package unbookable.
 */
export async function getPackageAvailability(
  slug: string,
  input: { quantity: number } & DateRangeQuery,
) {
  const range = parsePublicRange(input);

  const pkg = await db.package.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      items: {
        select: {
          equipmentId: true,
          quantity: true,
          equipment: { select: { name: true, isActive: true } },
        },
        orderBy: { equipmentId: "asc" },
      },
    },
  });

  if (!pkg) {
    throw notFound(`Package "${slug}" was not found`);
  }

  const summary = {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    price: money(pkg.price),
  };
  const meta = {
    startDate: formatCalendarDate(range.startDate),
    endDate: formatCalendarDate(range.endDate),
  };

  // An empty package can never be booked, whatever its price says.
  if (pkg.items.length === 0) {
    return {
      data: {
        package: summary,
        ...meta,
        requestedQuantity: input.quantity,
        minAvailable: 0,
        bookable: false,
        items: [],
      },
    };
  }

  const packageEquipmentIds = pkg.items.map((item) => item.equipmentId);
  await expireOverdueBookings({ equipmentIds: packageEquipmentIds });

  const availability = await getAvailability({
    equipmentIds: packageEquipmentIds,
    ...range,
  });
  const byEquipmentId = new Map(availability.map((row) => [row.equipmentId, row]));

  const items = pkg.items.map((item) => {
    const row = byEquipmentId.get(item.equipmentId);
    // A deactivated item cannot be booked even while the package still lists it.
    const available = item.equipment.isActive ? (row?.available ?? 0) : 0;
    const required = item.quantity * input.quantity;

    return {
      equipmentId: item.equipmentId,
      name: row?.name ?? item.equipment.name,
      total: row?.total ?? 0,
      reserved: row?.reserved ?? 0,
      available,
      quantityPerPackage: item.quantity,
      required,
      shortfall: Math.max(0, required - available),
    };
  });

  const minAvailable = Math.min(
    ...items.map((item) => Math.floor(item.available / item.quantityPerPackage)),
  );

  return {
    data: {
      package: summary,
      ...meta,
      requestedQuantity: input.quantity,
      minAvailable,
      bookable: minAvailable >= input.quantity,
      items,
    },
  };
}

/**
 * Per-day availability for one equipment over a month, for the booking date picker.
 * Days are walked one at a time: 31 days x 3 grouped queries fired together would
 * swamp the connection pool for a screen that only needs a few hundred milliseconds.
 */
export async function getEquipmentCalendar(equipmentId: string, month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);

  if (year < 2000 || year > 2100) {
    throw badRequest("month must be a year between 2000 and 2100", { month });
  }

  const equipment = await db.equipment.findFirst({
    where: { id: equipmentId, isActive: true },
    select: { id: true, name: true, inventory: { select: { total: true } } },
  });

  if (!equipment) {
    throw notFound(`Equipment "${equipmentId}" was not found`);
  }

  await expireOverdueBookings({ equipmentIds: [equipment.id] });

  const total = equipment.inventory[0]?.total ?? 0;
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const days: CalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex - 1, day));
    const reserved = await getReservedQuantities({
      equipmentIds: [equipmentId],
      startDate: date,
      endDate: date,
    });

    days.push({
      date: formatCalendarDate(date),
      available: Math.max(0, total - (reserved.get(equipmentId) ?? 0)),
    });
  }

  return {
    data: days,
    meta: { equipmentId: equipment.id, name: equipment.name, total, month },
  };
}

export type DemandLine = { equipmentId: string; quantity: number };

/**
 * Which equipment is short for the requested lines, and by how many units.
 * Empty array means the whole request can be fulfilled.
 */
export async function findShortages(
  input: AvailabilityInput & { demand: DemandLine[] },
): Promise<Array<AvailabilityRow & { requested: number; shortfall: number }>> {
  const requested = new Map<string, number>();
  for (const line of input.demand) {
    requested.set(line.equipmentId, (requested.get(line.equipmentId) ?? 0) + line.quantity);
  }

  const availability = await getAvailability({
    ...input,
    equipmentIds: [...requested.keys()],
  });

  const shortages: Array<AvailabilityRow & { requested: number; shortfall: number }> = [];

  for (const equipmentId of requested.keys()) {
    const row = availability.find((entry) => entry.equipmentId === equipmentId);
    const requestedUnits = requested.get(equipmentId) ?? 0;
    const available = row?.available ?? 0;
    if (requestedUnits > available) {
      shortages.push({
        equipmentId,
        name: row?.name ?? equipmentId,
        total: row?.total ?? 0,
        reserved: row?.reserved ?? 0,
        available,
        requested: requestedUnits,
        shortfall: requestedUnits - available,
      });
    }
  }

  return shortages;
}
