import { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, conflict, notFound } from "../lib/api-error";
import { money } from "../lib/money";
import type { CreatePaymentInput, UpdatePaymentInput } from "../schemas/payments";

/**
 * Payments (F9). `Booking.paidAmount` is a cache of the sum of PAID payment rows, so it is
 * always recomputed inside the same transaction as the change — never incremented, which
 * would drift the moment a payment is edited or deleted.
 */

export type DerivedPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/** D2: derived from the amount, never stored, so it cannot disagree with the rows. */
export function derivePaymentStatus(
  paidAmount: number,
  totalAmount: number,
): DerivedPaymentStatus {
  if (paidAmount <= 0) {
    return "UNPAID";
  }
  if (paidAmount < totalAmount) {
    return "PARTIALLY_PAID";
  }
  return "PAID";
}

const paymentFields = {
  id: true,
  bookingId: true,
  amount: true,
  method: true,
  status: true,
  providerRef: true,
  description: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  paidBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentFields }>;

function toPayment(row: PaymentRow) {
  return {
    ...row,
    amount: money(row.amount),
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const bookingPaymentFields = {
  id: true,
  code: true,
  status: true,
  totalAmount: true,
  paidAmount: true,
} satisfies Prisma.BookingSelect;

type BookingPaymentRow = Prisma.BookingGetPayload<{ select: typeof bookingPaymentFields }>;

/** The payment view of a booking, shared by every endpoint that touches money. */
function paymentSummary(booking: BookingPaymentRow) {
  const outstanding = booking.totalAmount.minus(booking.paidAmount);
  const amountDue = outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding;
  const surplus = booking.paidAmount.minus(booking.totalAmount);
  const overpaidBy = surplus.isNegative() ? new Prisma.Decimal(0) : surplus;

  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    totalAmount: money(booking.totalAmount),
    paidAmount: money(booking.paidAmount),
    amountDue: money(amountDue),
    overpaidBy: money(overpaidBy),
    paymentStatus: derivePaymentStatus(Number(booking.paidAmount), Number(booking.totalAmount)),
  };
}

async function loadBooking(
  client: Prisma.TransactionClient | typeof db,
  bookingId: string,
): Promise<BookingPaymentRow> {
  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: bookingPaymentFields,
  });

  if (!booking) {
    throw notFound(`Booking "${bookingId}" was not found`);
  }

  return booking;
}

/** Sum of PAID rows, written back to the booking. Returns the new cached amount. */
async function recomputePaidAmount(
  tx: Prisma.TransactionClient,
  bookingId: string,
): Promise<Prisma.Decimal> {
  const aggregate = await tx.payment.aggregate({
    where: { bookingId, status: "PAID" },
    _sum: { amount: true },
  });

  const paidAmount = aggregate._sum.amount ?? new Prisma.Decimal(0);
  await tx.booking.update({ where: { id: bookingId }, data: { paidAmount } });
  return paidAmount;
}

/**
 * Records a payment. Cash, M-Pesa and bank transfers are PAID immediately when the caller
 * supplies `paidAt`; MANUAL/OTHER start PENDING and are confirmed with PATCH.
 */
export async function recordPayment(
  bookingId: string,
  input: CreatePaymentInput,
  adminId: string,
) {
  const result = await db.$transaction(async (tx) => {
    const booking = await loadBooking(tx, bookingId);

    const settlesImmediately =
      (input.method === "CASH" || input.method === "MPESA" || input.method === "BANK_TRANSFER") &&
      input.paidAt !== undefined &&
      input.paidAt !== null;

    const payment = await tx.payment.create({
      data: {
        bookingId,
        amount: input.amount.toFixed(2),
        method: input.method,
        status: settlesImmediately ? "PAID" : "PENDING",
        providerRef: input.providerRef ?? null,
        description: input.description ?? null,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        paidById: adminId,
      },
      select: paymentFields,
    });

    const paidAmount = await recomputePaidAmount(tx, bookingId);

    return {
      payment,
      booking: { ...booking, paidAmount },
    };
  });

  return {
    payment: toPayment(result.payment),
    booking: paymentSummary(result.booking),
  };
}

/** Payment history plus a running total and the derived status of the booking. */
export async function listPayments(bookingId: string) {
  const booking = await loadBooking(db, bookingId);

  const rows = await db.payment.findMany({
    where: { bookingId },
    select: paymentFields,
    orderBy: { createdAt: "asc" },
  });

  const paidTotal = rows
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));

  return {
    data: rows.map(toPayment),
    meta: {
      total: rows.length,
      paidTotal: money(paidTotal),
      booking: paymentSummary(booking),
    },
  };
}

/**
 * Deleting a payment is allowed only while the booking is PENDING. A PAID row can be
 * removed there because the booking is not agreed yet; once it is confirmed or closed,
 * money is changed by recording a refund instead (deferred, §11).
 */
export async function deletePayment(paymentId: string) {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        bookingId: true,
        booking: { select: bookingPaymentFields },
      },
    });

    if (!payment) {
      throw notFound(`Payment "${paymentId}" was not found`);
    }

    if (payment.booking.status !== "PENDING") {
      throw conflict("Payments can only be deleted while the booking is pending", {
        bookingStatus: payment.booking.status,
      });
    }

    await tx.payment.delete({ where: { id: paymentId } });
    const paidAmount = await recomputePaidAmount(tx, payment.bookingId);

    return {
      deletedPaymentId: paymentId,
      booking: { ...payment.booking, paidAmount },
    };
  });

  return {
    deletedPaymentId: result.deletedPaymentId,
    booking: paymentSummary(result.booking),
  };
}

/** Marks a payment PAID or FAILED and sets the provider reference; recomputes the cache. */
export async function updatePayment(paymentId: string, input: UpdatePaymentInput) {
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        bookingId: true,
        paidAt: true,
        booking: { select: bookingPaymentFields },
      },
    });

    if (!existing) {
      throw notFound(`Payment "${paymentId}" was not found`);
    }

    if (
      input.status === undefined &&
      input.providerRef === undefined &&
      input.paidAt === undefined
    ) {
      throw badRequest("Provide status, providerRef or paidAt");
    }

    const markingPaid = input.status === "PAID";
    const paidAt =
      input.paidAt !== undefined
        ? input.paidAt === null
          ? null
          : new Date(input.paidAt)
        : markingPaid && existing.paidAt === null
          ? new Date()
          : undefined;

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.providerRef !== undefined ? { providerRef: input.providerRef } : {}),
        ...(paidAt !== undefined ? { paidAt } : {}),
      },
      select: paymentFields,
    });

    const paidAmount = await recomputePaidAmount(tx, existing.bookingId);

    return {
      payment,
      booking: { ...existing.booking, paidAmount },
    };
  });

  return {
    payment: toPayment(result.payment),
    booking: paymentSummary(result.booking),
  };
}
