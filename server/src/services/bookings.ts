import { Prisma } from "@prisma/client";
import type { BookingStatus, FulfilmentMethod } from "@prisma/client";

import { db } from "../config/db";
import { ApiError, badRequest, conflict, notFound } from "../lib/api-error";
import { generateBookingCode, isBookingCode } from "../lib/booking-code";
import {
  formatCalendarDate,
  isPastDate,
  parseCalendarDate,
  rentalDays,
  todayInNairobi,
} from "../lib/dates";
import type { CreateBookingInput } from "../schemas/bookings";
import { findShortages } from "./availability";
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
