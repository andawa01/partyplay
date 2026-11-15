import { Prisma } from "@prisma/client";
import type { BookingStatus, FulfilmentMethod } from "@prisma/client";

import { db } from "../config/db";
import { ApiError, badRequest, conflict, notFound } from "../lib/api-error";
import { generateBookingCode, isBookingCode } from "../lib/booking-code";
import { money } from "../lib/money";
import {
  formatCalendarDate,
  isPastDate,
  parseCalendarDate,
  rentalDays,
  todayInNairobi,
} from "../lib/dates";
import type {
  AdminBookingListQuery,
  CreateBookingInput,
  UpdateBookingStatusInput,
  UpdateBookingTransportInput,
} from "../schemas/bookings";
import { findShortages, type DemandLine } from "./availability";
import { assertTransition } from "./booking-status";
import { expireOverdueBookings } from "./hold-expiry";
import {
  expandPackages,
  priceBooking,
  type BookingPrice,
  type PricedEquipment,
  type PricedPackage,
} from "./pricing";

/**
 * Booking creation (F6b). Everything that decides whether the request may exist happens
 * inside one Serializable transaction: catalogue reads, the stock check, the customer and
 * the hold rows. If any step fails, nothing is written.
 */

type BookingTx = Prisma.TransactionClient;

type BookableEquipment = PricedEquipment & { maxQuantity: number };

type Catalogue = {
  equipment: Map<string, BookableEquipment>;
  packages: PricedPackage[];
};

const SERIALIZATION_ATTEMPTS = 3;
const CODE_ATTEMPTS = 5;

async function loadCatalogue(tx: BookingTx, input: CreateBookingInput): Promise<Catalogue> {
  const equipmentIds = [...new Set(input.equipment.map((line) => line.equipmentId))];
  const packageIds = [...new Set(input.packages.map((line) => line.packageId))];

  const [equipmentRows, packageRows] = await Promise.all([
    equipmentIds.length === 0
      ? Promise.resolve([])
      : tx.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: {
            id: true,
            name: true,
            isActive: true,
            maxQuantity: true,
            pricingMode: true,
            pricePerDay: true,
            flatPrice: true,
          },
        }),
    packageIds.length === 0
      ? Promise.resolve([])
      : tx.package.findMany({
          where: { id: { in: packageIds } },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            items: {
              select: {
                equipmentId: true,
                quantity: true,
                equipment: { select: { name: true, isActive: true } },
              },
            },
          },
        }),
  ]);

  const available = equipmentRows.filter((row) => row.isActive);
  const missingEquipmentIds = equipmentIds.filter(
    (id) => !available.some((row) => row.id === id),
  );
  if (missingEquipmentIds.length > 0) {
    throw notFound("Some equipment items were not found or are no longer available", {
      missingEquipmentIds,
    });
  }

  const activePackages = packageRows.filter((row) => row.isActive);
  const missingPackageIds = packageIds.filter((id) => !activePackages.some((row) => row.id === id));
  if (missingPackageIds.length > 0) {
    throw notFound("Some packages were not found or are no longer available", { missingPackageIds });
  }

  // A package that still lists a retired item cannot be fulfilled; refuse rather than
  // silently leave part of the bundle out.
  const inactiveInsidePackages = [
    ...new Set(
      activePackages.flatMap((pkg) =>
        pkg.items.filter((item) => !item.equipment.isActive).map((item) => item.equipmentId),
      ),
    ),
  ];
  if (inactiveInsidePackages.length > 0) {
    throw badRequest("Some packages include equipment that is no longer available", {
      unavailableEquipmentIds: inactiveInsidePackages,
    });
  }

  const equipment = new Map<string, BookableEquipment>();
  for (const row of available) {
    equipment.set(row.id, {
      id: row.id,
      name: row.name,
      pricingMode: row.pricingMode,
      pricePerDay: row.pricePerDay === null ? null : Number(row.pricePerDay),
      flatPrice: row.flatPrice === null ? null : Number(row.flatPrice),
      maxQuantity: row.maxQuantity,
    });
  }

  for (const line of input.equipment) {
    const item = equipment.get(line.equipmentId);
    if (item && line.quantity > item.maxQuantity) {
      throw badRequest(`Only ${item.maxQuantity} × "${item.name}" can be booked`, {
        equipmentId: item.id,
        maxQuantity: item.maxQuantity,
      });
    }
  }

  const packages: PricedPackage[] = activePackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    price: Number(pkg.price),
    items: pkg.items.map((item) => ({
      equipmentId: item.equipmentId,
      equipmentName: item.equipment.name,
      quantity: item.quantity,
    })),
  }));

  return { equipment, packages };
}

/**
 * Units of each equipment the booking occupies. Rule B: a requested unit that a package
 * already includes is the same physical unit, so demand is the larger of the two rather
 * than their sum — charging for 2 units while holding 3 would be a lie about stock.
 */
function buildDemand(input: CreateBookingInput, catalogue: Catalogue): Map<string, number> {
  const demand = new Map<string, number>();

  for (const line of expandPackages(input.packages, catalogue.packages)) {
    for (const item of line.items) {
      demand.set(item.equipmentId, (demand.get(item.equipmentId) ?? 0) + item.quantity);
    }
  }

  for (const line of input.equipment) {
    demand.set(line.equipmentId, Math.max(line.quantity, demand.get(line.equipmentId) ?? 0));
  }

  return demand;
}

/**
 * Phone is the guest's primary handle, then email. The email upsert avoids a `P2002` on
 * `Customer.email` (unique) without catching inside the transaction, where a failed
 * statement would abort every later query.
 */
async function resolveCustomer(
  tx: BookingTx,
  customer: CreateBookingInput["customer"],
): Promise<{ id: string }> {
  const existing = await tx.customer.findFirst({
    where: {
      OR: [{ phone: customer.phone }, ...(customer.email ? [{ email: customer.email }] : [])],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  if (customer.email) {
    return tx.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: { name: customer.name, phone: customer.phone, email: customer.email },
      select: { id: true },
    });
  }

  return tx.customer.create({
    data: { name: customer.name, phone: customer.phone },
    select: { id: true },
  });
}

/** Codes are random; a pre-check keeps a collision from aborting the whole transaction. */
async function allocateBookingCode(tx: BookingTx): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = generateBookingCode();
    const taken = await tx.booking.findUnique({ where: { code }, select: { id: true } });
    if (!taken) {
      return code;
    }
  }

  throw new ApiError(500, "BOOKING_CODE_UNAVAILABLE", "Could not allocate a booking code");
}

type CreatedBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  fulfilmentMethod: FulfilmentMethod;
};

type BookingCreationResult = {
  booking: CreatedBooking;
  price: BookingPrice;
  days: number;
  holdMinutes: number;
  expiresAt: Date;
  currency: string;
};

/**
 * Creates the request. Retries the whole transaction on a serialization/deadlock failure
 * or a booking-code collision, because a failed statement cannot be retried in place.
 */
export async function createBookingRequest(input: CreateBookingInput) {
  const startDate = parseCalendarDate(input.startDate);
  const endDate = parseCalendarDate(input.endDate);

  if (endDate.getTime() < startDate.getTime()) {
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

  const days = rentalDays(startDate, endDate);

  for (let attempt = 1; attempt <= SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await createInTransaction(input, startDate, endDate, days);
      return toPublicBooking(result);
    } catch (error) {
      const retryable = isRetryableTransactionError(error) || isBookingCodeCollision(error);
      if (!retryable || attempt === SERIALIZATION_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new ApiError(500, "BOOKING_CREATE_FAILED", "The booking could not be created");
}

async function createInTransaction(
  input: CreateBookingInput,
  startDate: Date,
  endDate: Date,
  days: number,
): Promise<BookingCreationResult> {
  return db.$transaction(
    async (tx) => {
      const catalogue = await loadCatalogue(tx, input);
      const demand = buildDemand(input, catalogue);
      const equipmentIds = [...demand.keys()].sort();

      // One advisory lock per overlapping request, keyed on the sorted equipment set, so
      // two requests for the same last unit cannot both pass the shortage check.
      // `$executeRaw` is required: the lock function returns void, which `$queryRaw`
      // cannot deserialize.
      if (equipmentIds.length > 0) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${equipmentIds.join(",")}))`;
      }

      const shortages = await findShortages({
        equipmentIds,
        startDate,
        endDate,
        client: tx,
        demand: equipmentIds.map((equipmentId) => ({
          equipmentId,
          quantity: demand.get(equipmentId) ?? 0,
        })),
      });

      if (shortages.length > 0) {
        throw conflict("Not enough stock for the requested dates", {
          startDate: formatCalendarDate(startDate),
          endDate: formatCalendarDate(endDate),
          shortages,
        });
      }

      const price = priceBooking({
        days,
        equipment: input.equipment.map((line) => ({
          // loadCatalogue guarantees every requested id is present and active.
          equipment: catalogue.equipment.get(line.equipmentId) as BookableEquipment,
          quantity: line.quantity,
        })),
        packages: input.packages,
        packageCatalogue: catalogue.packages,
      });

      const settings = await tx.siteSetting.findFirst({
        select: { holdMinutes: true, currency: true },
      });
      const holdMinutes = settings?.holdMinutes ?? 120;
      const currency = settings?.currency ?? "KES";
      const expiresAt = new Date(Date.now() + holdMinutes * 60_000);

      const customer = await resolveCustomer(tx, input.customer);

      const booking = await tx.booking.create({
        data: {
          code: await allocateBookingCode(tx),
          customerId: customer.id,
          startDate,
          endDate,
          status: "PENDING",
          fulfilmentMethod: input.fulfilmentMethod,
          dropoffAddress: input.dropoffAddress ?? null,
          pickupAddress: input.pickupAddress ?? null,
          notes: input.notes ?? null,
          specialRequests: input.specialRequests ?? null,
          totalAmount: price.totalAmount.toFixed(2),
          transportCharge: price.transportCharge.toFixed(2),
          discountAmount: price.discountAmount.toFixed(2),
          paidAmount: "0.00",
          currency,
          holdExpiresAt: expiresAt,
        },
        select: {
          id: true,
          code: true,
          status: true,
          startDate: true,
          endDate: true,
          fulfilmentMethod: true,
        },
      });

      if (price.items.length > 0) {
        await tx.bookingItem.createMany({
          data: price.items.map((line) => ({
            bookingId: booking.id,
            equipmentId: line.equipmentId,
            quantity: line.quantity,
            unitPrice: line.unitPrice.toFixed(2),
            priceForPeriod: line.priceForPeriod.toFixed(2),
            days: line.days,
          })),
        });
      }

      for (const pkg of price.packages) {
        const packageBooking = await tx.packageBooking.create({
          data: {
            bookingId: booking.id,
            packageId: pkg.packageId,
            quantity: pkg.quantity,
            packageName: pkg.packageName,
            packagePrice: pkg.packagePrice.toFixed(2),
          },
          select: { id: true },
        });

        if (pkg.items.length > 0) {
          await tx.bookingPackageItem.createMany({
            data: pkg.items.map((item) => ({
              packageBookingId: packageBooking.id,
              equipmentId: item.equipmentId,
              equipmentName: item.equipmentName,
              quantity: item.quantity,
            })),
          });
        }
      }

      if (equipmentIds.length > 0) {
        await tx.stockHold.createMany({
          data: equipmentIds.map((equipmentId) => ({
            bookingId: booking.id,
            equipmentId,
            quantity: demand.get(equipmentId) ?? 0,
            status: "ACTIVE",
            expiresAt,
          })),
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: "PENDING",
          note: "Booking request submitted",
        },
      });

      return { booking, price, days, holdMinutes, expiresAt, currency };
    },
    { isolationLevel: "Serializable", timeout: 10_000 },
  );
}

/**
 * The public response. No admin id, no customer id, no internal statuses — and a notice
 * that the request is not a confirmation (requirement §3.10).
 */
function toPublicBooking(result: BookingCreationResult) {
  const { booking, price, days, holdMinutes, expiresAt, currency } = result;

  return {
    code: booking.code,
    status: booking.status,
    startDate: formatCalendarDate(booking.startDate),
    endDate: formatCalendarDate(booking.endDate),
    rentalDays: days,
    fulfilmentMethod: booking.fulfilmentMethod,
    currency,
    holdMinutes,
    holdExpiresAt: expiresAt.toISOString(),
    items: price.items.map((line) => ({
      equipmentId: line.equipmentId,
      equipmentName: line.equipmentName,
      quantity: line.quantity,
      days: line.days,
      unitPrice: line.unitPrice.toFixed(2),
      priceForPeriod: line.priceForPeriod.toFixed(2),
    })),
    packages: price.packages.map((pkg) => ({
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      packagePrice: pkg.packagePrice.toFixed(2),
      quantity: pkg.quantity,
      lineTotal: pkg.lineTotal.toFixed(2),
      items: pkg.items,
    })),
    subtotal: price.subtotal.toFixed(2),
    discountAmount: price.discountAmount.toFixed(2),
    transportCharge: price.transportCharge.toFixed(2),
    totalAmount: price.totalAmount.toFixed(2),
    notice:
      "This is a booking request, not a confirmed booking. PartyPlay will contact you to confirm availability and delivery.",
  };
}

/**
 * Public lookup (F6c). Knowing the code is the whole permission, so the query is scoped to
 * that one row, internal ids never leave the service, and contact details are masked. An
 * unknown or malformed code is the same 404, which keeps the endpoint unenumerable.
 */
export async function getBookingByCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  if (!isBookingCode(code)) {
    throw notFound("No booking matches that code");
  }

  // Lazy expiry for this one booking, so an expired request never reads as live.
  await expireOverdueBookings({ code });

  const booking = await db.booking.findUnique({
    where: { code },
    select: {
      code: true,
      status: true,
      startDate: true,
      endDate: true,
      fulfilmentMethod: true,
      holdExpiresAt: true,
      totalAmount: true,
      transportCharge: true,
      discountAmount: true,
      paidAmount: true,
      currency: true,
      notes: true,
      specialRequests: true,
      dropoffAddress: true,
      pickupAddress: true,
      createdAt: true,
      customer: { select: { name: true, phone: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          priceForPeriod: true,
          days: true,
          equipment: { select: { name: true } },
        },
      },
      packages: {
        select: {
          quantity: true,
          packageName: true,
          packagePrice: true,
          items: { select: { equipmentName: true, quantity: true } },
        },
      },
    },
  });

  if (!booking) {
    throw notFound("No booking matches that code");
  }

  const outstanding = booking.totalAmount.minus(booking.paidAmount);
  const amountDue = outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding;
  // Subtotal is not stored: total = subtotal - discount + transport, so invert it.
  const subtotal = booking.totalAmount.plus(booking.discountAmount).minus(booking.transportCharge);
  const holdExpired =
    booking.status === "PENDING" &&
    booking.holdExpiresAt !== null &&
    booking.holdExpiresAt.getTime() <= Date.now();

  return {
    code: booking.code,
    status: booking.status,
    startDate: formatCalendarDate(booking.startDate),
    endDate: formatCalendarDate(booking.endDate),
    rentalDays: rentalDays(booking.startDate, booking.endDate),
    fulfilmentMethod: booking.fulfilmentMethod,
    customer: {
      name: booking.customer.name,
      // The code holder may not be the person who submitted the request.
      phone: maskPhone(booking.customer.phone),
    },
    items: booking.items.map((line) => ({
      equipmentName: line.equipment.name,
      quantity: line.quantity,
      days: line.days,
      unitPrice: line.unitPrice.toFixed(2),
      priceForPeriod: line.priceForPeriod.toFixed(2),
    })),
    packages: booking.packages.map((pkg) => ({
      packageName: pkg.packageName,
      packagePrice: pkg.packagePrice.toFixed(2),
      quantity: pkg.quantity,
      lineTotal: pkg.packagePrice.mul(pkg.quantity).toFixed(2),
      items: pkg.items,
    })),
    subtotal: subtotal.toFixed(2),
    discountAmount: booking.discountAmount.toFixed(2),
    transportCharge: booking.transportCharge.toFixed(2),
    totalAmount: booking.totalAmount.toFixed(2),
    amountDue: amountDue.toFixed(2),
    paymentDue: amountDue.gt(0),
    currency: booking.currency,
    notes: booking.notes,
    specialRequests: booking.specialRequests,
    dropoffAddress: booking.dropoffAddress,
    pickupAddress: booking.pickupAddress,
    holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    holdExpired,
    createdAt: booking.createdAt.toISOString(),
    notice: bookingNotice(booking.status),
  };
}

function bookingNotice(status: BookingStatus): string | null {
  if (status === "PENDING") {
    return "This booking is still a request. PartyPlay will contact you to confirm availability and delivery.";
  }
  if (status === "EXPIRED") {
    return "This request expired before it was confirmed. Please submit a new request.";
  }
  return null;
}

/** Kept on the bookings service for the callers described in the plan (F8 admin ops). */
export { expireOverdueBookings };

/** `07•• ••• 123`: first two and last three digits stay, everything between is dropped. */
function maskPhone(phone: string | null): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 5) {
    return "•".repeat(Math.max(digits.length, 1));
  }

  return `${digits.slice(0, 2)}•• ••• ${digits.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// Admin operations (F8). Reads return snapshots and totals as strings; the only status
// writer is changeBookingStatus, guarded by services/booking-status.ts.
// ---------------------------------------------------------------------------

type AdminBookingClient = Prisma.TransactionClient | typeof db;

const adminBookingSummarySelect = {
  id: true,
  code: true,
  status: true,
  startDate: true,
  endDate: true,
  fulfilmentMethod: true,
  holdExpiresAt: true,
  totalAmount: true,
  paidAmount: true,
  currency: true,
  createdAt: true,
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.BookingSelect;

type AdminBookingSummaryRow = Prisma.BookingGetPayload<{ select: typeof adminBookingSummarySelect }>;

const adminBookingDetailSelect = {
  id: true,
  code: true,
  status: true,
  startDate: true,
  endDate: true,
  fulfilmentMethod: true,
  holdExpiresAt: true,
  totalAmount: true,
  transportCharge: true,
  discountAmount: true,
  paidAmount: true,
  currency: true,
  notes: true,
  specialRequests: true,
  approvedAt: true,
  cancelledAt: true,
  fulfilmentDate: true,
  dropoffAddress: true,
  dropoffNotes: true,
  pickupAddress: true,
  pickupNotes: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, email: true, phone: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  items: {
    select: {
      id: true,
      equipmentId: true,
      quantity: true,
      unitPrice: true,
      priceForPeriod: true,
      days: true,
      equipment: { select: { name: true, slug: true } },
    },
    orderBy: { equipmentId: "asc" },
  },
  packages: {
    select: {
      id: true,
      packageId: true,
      quantity: true,
      packageName: true,
      packagePrice: true,
      items: { select: { equipmentId: true, equipmentName: true, quantity: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  stockHolds: {
    select: {
      id: true,
      equipmentId: true,
      quantity: true,
      status: true,
      expiresAt: true,
      releasedAt: true,
    },
    orderBy: { equipmentId: "asc" },
  },
  statusHistories: {
    select: {
      fromStatus: true,
      toStatus: true,
      reason: true,
      note: true,
      createdAt: true,
      admin: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      providerRef: true,
      description: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BookingSelect;

type AdminBookingDetailRow = Prisma.BookingGetPayload<{ select: typeof adminBookingDetailSelect }>;

function holdExpired(status: BookingStatus, holdExpiresAt: Date | null): boolean {
  return status === "PENDING" && holdExpiresAt !== null && holdExpiresAt.getTime() <= Date.now();
}

/**
 * A pending hold has lapsed when either the booking's deadline or any surviving ACTIVE
 * hold has passed — availability ignores lapsed holds by exactly this rule, so approval
 * must use the same one or it would confirm stock nobody is holding.
 */
function holdLapsed(holdExpiresAt: Date | null, activeHolds: Array<{ expiresAt: Date }>): boolean {
  const now = Date.now();
  return (
    (holdExpiresAt !== null && holdExpiresAt.getTime() <= now) ||
    activeHolds.some((hold) => hold.expiresAt.getTime() <= now)
  );
}

function toAdminBookingSummary(row: AdminBookingSummaryRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    customer: row.customer,
    startDate: formatCalendarDate(row.startDate),
    endDate: formatCalendarDate(row.endDate),
    rentalDays: rentalDays(row.startDate, row.endDate),
    fulfilmentMethod: row.fulfilmentMethod,
    totalAmount: money(row.totalAmount),
    paidAmount: money(row.paidAmount),
    currency: row.currency,
    holdExpiresAt: row.holdExpiresAt?.toISOString() ?? null,
    holdExpired: holdExpired(row.status, row.holdExpiresAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function toAdminBookingDetail(row: AdminBookingDetailRow) {
  // Matches the public lookup: total = subtotal - discount + transport, inverted here.
  const subtotal = row.totalAmount.plus(row.discountAmount).minus(row.transportCharge);
  const outstanding = row.totalAmount.minus(row.paidAmount);
  const amountDue = outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding;

  return {
    id: row.id,
    code: row.code,
    status: row.status,
    customer: row.customer,
    createdBy: row.createdBy,
    startDate: formatCalendarDate(row.startDate),
    endDate: formatCalendarDate(row.endDate),
    rentalDays: rentalDays(row.startDate, row.endDate),
    fulfilmentMethod: row.fulfilmentMethod,
    holdExpiresAt: row.holdExpiresAt?.toISOString() ?? null,
    holdExpired:
      holdExpired(row.status, row.holdExpiresAt) ||
      (row.status === "PENDING" &&
        holdLapsed(
          null,
          row.stockHolds.filter((hold) => hold.status === "ACTIVE"),
        )),
    items: row.items.map((line) => ({
      id: line.id,
      equipmentId: line.equipmentId,
      equipmentName: line.equipment.name,
      equipmentSlug: line.equipment.slug,
      quantity: line.quantity,
      days: line.days,
      unitPrice: money(line.unitPrice),
      priceForPeriod: money(line.priceForPeriod),
    })),
    packages: row.packages.map((pkg) => ({
      id: pkg.id,
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      packagePrice: money(pkg.packagePrice),
      quantity: pkg.quantity,
      lineTotal: money(pkg.packagePrice.mul(pkg.quantity)),
      items: pkg.items,
    })),
    stockHolds: row.stockHolds.map((hold) => ({
      ...hold,
      expiresAt: hold.expiresAt.toISOString(),
      releasedAt: hold.releasedAt?.toISOString() ?? null,
    })),
    payments: row.payments.map((payment) => ({
      ...payment,
      amount: money(payment.amount),
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    statusHistory: row.statusHistories.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    totals: {
      subtotal: money(subtotal),
      discountAmount: money(row.discountAmount),
      transportCharge: money(row.transportCharge),
      totalAmount: money(row.totalAmount),
      paidAmount: money(row.paidAmount),
      amountDue: money(amountDue),
    },
    currency: row.currency,
    notes: row.notes,
    specialRequests: row.specialRequests,
    dropoffAddress: row.dropoffAddress,
    dropoffNotes: row.dropoffNotes,
    pickupAddress: row.pickupAddress,
    pickupNotes: row.pickupNotes,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    fulfilmentDate: row.fulfilmentDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Units this booking physically occupies, from its frozen snapshots. */
async function bookingDemand(client: AdminBookingClient, bookingId: string): Promise<DemandLine[]> {
  const [items, packageItems] = await Promise.all([
    client.bookingItem.findMany({
      where: { bookingId },
      select: { equipmentId: true, quantity: true },
    }),
    client.bookingPackageItem.findMany({
      where: { packageBooking: { bookingId } },
      select: { equipmentId: true, quantity: true },
    }),
  ]);

  const demand = new Map<string, number>();
  for (const line of [...items, ...packageItems]) {
    if (!line.equipmentId) {
      continue;
    }
    demand.set(line.equipmentId, (demand.get(line.equipmentId) ?? 0) + line.quantity);
  }

  return [...demand.entries()].map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
}

/** Detail without side effects, for the write endpoints that just changed the row. */
async function loadAdminBooking(id: string) {
  const row = await db.booking.findUnique({ where: { id }, select: adminBookingDetailSelect });
  if (!row) {
    throw notFound(`Booking "${id}" was not found`);
  }
  return toAdminBookingDetail(row);
}

/** Admin detail runs lazy expiry first, so the page never presents a lapsed hold as live. */
export async function getAdminBookingById(id: string) {
  await expireOverdueBookings({ bookingId: id });
  return loadAdminBooking(id);
}

/**
 * Board filters: `status`, an overlapping rental window (`from`/`to`), and free text over
 * code, customer name and phone. Expiry is swept (bounded) so the board is never stale.
 */
export async function listAdminBookings(query: AdminBookingListQuery) {
  await expireOverdueBookings({ take: 200 });

  const fromDate = query.from ? parseCalendarDate(query.from) : null;
  const toDate = query.to ? parseCalendarDate(query.to) : null;
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw badRequest("to must be on or after from", {
      from: formatCalendarDate(fromDate),
      to: formatCalendarDate(toDate),
    });
  }

  const where: Prisma.BookingWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(toDate ? { startDate: { lte: toDate } } : {}),
    ...(fromDate ? { endDate: { gte: fromDate } } : {}),
    ...(query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: "insensitive" } },
            { customer: { name: { contains: query.q, mode: "insensitive" } } },
            { customer: { phone: { contains: query.q } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await db.$transaction([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      select: adminBookingSummarySelect,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: rows.map(toAdminBookingSummary),
    meta: { total, page: query.page, pageSize: query.pageSize },
  };
}

/**
 * The only status writer. Stock effects follow the transition table: confirming consumes
 * the holds (item rows take over), rejecting or cancelling releases them, completing just
 * records the date.
 *
 * An approval whose hold window lapsed is re-checked here, because that is exactly the
 * case the owner may still rescue: enough stock confirms, too little is HOLD_EXPIRED. A
 * booking the sweeper already moved to EXPIRED stays blocked by the transition guard.
 */
export async function changeBookingStatus(
  id: string,
  input: UpdateBookingStatusInput,
  adminId: string,
) {
  const changedId = await db.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          holdExpiresAt: true,
          fulfilmentDate: true,
          stockHolds: { where: { status: "ACTIVE" }, select: { expiresAt: true } },
        },
      });

      if (!booking) {
        throw notFound(`Booking "${id}" was not found`);
      }

      assertTransition(booking.status, input.status);

      const now = new Date();
      const demand = await bookingDemand(tx, id);
      const equipmentIds = demand.map((line) => line.equipmentId).sort();
      const lapsed = booking.status === "PENDING" && holdLapsed(booking.holdExpiresAt, booking.stockHolds);

      if (input.status === "CONFIRMED") {
        if (equipmentIds.length > 0) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${equipmentIds.join(",")}))`;
        }

        if (lapsed) {
          const shortages = await findShortages({
            equipmentIds,
            startDate: booking.startDate,
            endDate: booking.endDate,
            excludeBookingId: booking.id,
            client: tx,
            demand,
          });

          if (shortages.length > 0) {
            throw new ApiError(
              409,
              "HOLD_EXPIRED",
              "The hold has expired and the stock is no longer available. Ask the customer to rebook.",
              {
                shortages,
                holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
              },
            );
          }
        }
      }

      const guard = await tx.booking.updateMany({
        where: { id, status: booking.status },
        data: {
          status: input.status,
          ...(input.status === "CONFIRMED" ? { approvedAt: now } : {}),
          ...(input.status === "CANCELLED" ? { cancelledAt: now } : {}),
          ...(input.status === "COMPLETED"
            ? { fulfilmentDate: booking.fulfilmentDate ?? now }
            : {}),
        },
      });

      if (guard.count === 0) {
        throw new ApiError(409, "INVALID_TRANSITION", "The booking changed while it was being updated", {
          from: booking.status,
          to: input.status,
        });
      }

      if (input.status === "CONFIRMED") {
        await tx.stockHold.updateMany({
          where: { bookingId: id, status: "ACTIVE" },
          data: { status: "CONSUMED", releasedAt: now },
        });
      } else if (input.status === "REJECTED" || input.status === "CANCELLED") {
        await tx.stockHold.updateMany({
          where: { bookingId: id, status: "ACTIVE" },
          data: { status: "RELEASED", releasedAt: now },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: input.status,
          reason: input.reason ?? null,
          note: input.note ?? null,
          adminId,
        },
      });

      return id;
    },
    { isolationLevel: "Serializable", timeout: 10_000 },
  );

  return loadAdminBooking(changedId);
}

/**
 * Recomputes the total instead of adding a delta to it: total = subtotal - discount +
 * transport, so only the transport component moves. Allowed while the booking is still
 * open, and the response tells the caller whether the customer must be told.
 */
export async function updateBookingTransportCharge(
  id: string,
  input: UpdateBookingTransportInput,
  adminId: string,
) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      fulfilmentMethod: true,
      dropoffAddress: true,
      transportCharge: true,
      totalAmount: true,
    },
  });

  if (!booking) {
    throw notFound(`Booking "${id}" was not found`);
  }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw conflict("The transport charge can only change before the booking is completed or closed", {
      status: booking.status,
    });
  }

  if (booking.fulfilmentMethod === "DELIVERY" && !booking.dropoffAddress) {
    throw badRequest("A delivery booking needs a dropoff address before transport can be charged");
  }

  const nextTransport = new Prisma.Decimal(input.transportCharge.toFixed(2));
  const nextTotal = booking.totalAmount.minus(booking.transportCharge).plus(nextTransport);

  const guard = await db.booking.updateMany({
    where: { id, status: booking.status },
    data: { transportCharge: nextTransport, totalAmount: nextTotal },
  });

  if (guard.count === 0) {
    throw conflict("The booking changed while the transport charge was being updated", {
      status: booking.status,
    });
  }

  const detail = await loadAdminBooking(id);

  return {
    ...detail,
    totalChanged: !nextTotal.equals(booking.totalAmount),
    changedBy: adminId,
  };
}

/** Explicit re-check before approving a lapsed hold; read-only by design. */
export async function checkAdminBookingAvailability(id: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      holdExpiresAt: true,
      stockHolds: { where: { status: "ACTIVE" }, select: { expiresAt: true } },
    },
  });

  if (!booking) {
    throw notFound(`Booking "${id}" was not found`);
  }

  const demand = await bookingDemand(db, id);
  const shortages = await findShortages({
    equipmentIds: demand.map((line) => line.equipmentId),
    startDate: booking.startDate,
    endDate: booking.endDate,
    excludeBookingId: booking.id,
    demand,
  });

  return {
    bookingId: booking.id,
    status: booking.status,
    startDate: formatCalendarDate(booking.startDate),
    endDate: formatCalendarDate(booking.endDate),
    holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    holdExpired:
      booking.status === "PENDING" && holdLapsed(booking.holdExpiresAt, booking.stockHolds),
    available: shortages.length === 0,
    shortages,
  };
}

function isRetryableTransactionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return true;
  }

  const meta = (error as { meta?: { code?: unknown } }).meta;
  return meta?.code === "40001" || meta?.code === "40P01";
}

function isBookingCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("code");
  }
  return typeof target === "string" && target.includes("code");
}
