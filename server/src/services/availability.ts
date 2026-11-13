import { db } from "../config/db";

// ---------------------------------------------------------------------------
// Inventory availability (Phase 2.2, rules A and C)
//
// What counts as "reserved" for an equipment item over a date range:
//   1. BookingItem rows of confirmed bookings that overlap the range.
//   2. BookingPackageItem rows of confirmed bookings that overlap the range —
//      a package consumes the equipment it includes, not just its own line.
//   3. ACTIVE StockHold rows that have not expired, owned by pending bookings.
//
// Approved bookings deliberately do NOT rely on StockHold: their item rows are
// the source of truth, so stock stays reserved after the hold window closes.
// Pending holds and approved items are keyed off different statuses, so the
// same units are never counted twice.
// ---------------------------------------------------------------------------

/** Booking statuses that consume inventory until cancelled or completed. */
export const CONFIRMED_BOOKING_STATUSES = ["APPROVED"] as const;

/** Booking statuses that reserve inventory through a temporary hold. */
export const HOLDING_BOOKING_STATUSES = ["PENDING"] as const;

export type AvailabilityInput = {
  equipmentIds: string[];
  startDate: Date;
  endDate: Date;
  /** Ignore this booking's own reservations (used when editing a booking). */
  excludeBookingId?: string;
  /** Injectable clock so expiry logic is testable. */
  now?: Date;
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
    db.bookingItem.groupBy({
      by: ["equipmentId"],
      where: {
        equipmentId: { in: equipmentIds },
        booking: overlappingBooking,
      },
      _sum: { quantity: true },
    }),
    db.bookingPackageItem.groupBy({
      by: ["equipmentId"],
      where: {
        equipmentId: { in: equipmentIds },
        packageBooking: { booking: overlappingBooking },
      },
      _sum: { quantity: true },
    }),
    db.stockHold.groupBy({
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
  const [equipment, reserved] = await Promise.all([
    db.equipment.findMany({
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
