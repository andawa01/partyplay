import { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { badRequest, conflict, notFound } from "../lib/api-error";
import { money } from "../lib/money";
import type {
  CreatePaymentInput,
  RefundPaymentInput,
  UpdatePaymentInput,
} from "../schemas/payments";

/**
 * Payments (F9) and refunds (F12). `Booking.paidAmount` is a cache of
 * PAID/REFUNDED payment rows minus refund rows, so it is always recomputed inside the
 * same transaction as the change — never incremented, which would drift the moment a
 * payment is edited, refunded or deleted.
 *
 * Policy: a payment may not exceed the outstanding balance. Money that has to go back
 * is recorded as a refund against the original paid payment, never by editing history.
 */

export type DerivedPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/** D2: derived from the amount, never stored, so it cannot disagree with the rows. */
export function derivePaymentStatus(paidAmount: number, totalAmount: number): DerivedPaymentStatus {
  if (paidAmount <= 0) {
    return "UNPAID";
  }
  if (paidAmount < totalAmount) {
    return "PARTIALLY_PAID";
  }
  return "PAID";
}

const refundFields = {
  id: true,
  amount: true,
  reason: true,
  reference: true,
  refundedAt: true,
  createdAt: true,
  refundedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PaymentRefundSelect;

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
  refunds: {
    select: refundFields,
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentFields }>;

function refundedAmount(payment: { refunds: Array<{ amount: Prisma.Decimal }> }): Prisma.Decimal {
  return payment.refunds.reduce((sum, refund) => sum.plus(refund.amount), new Prisma.Decimal(0));
}

function toPayment(row: PaymentRow) {
  const refunded = refundedAmount(row);
  const refundable = row.amount.minus(refunded);

  return {
    ...row,
    amount: money(row.amount),
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    refundedAmount: money(refunded),
    refundableAmount: money(refundable.isNegative() ? new Prisma.Decimal(0) : refundable),
    refunds: row.refunds.map((refund) => ({
      ...refund,
      amount: money(refund.amount),
      refundedAt: refund.refundedAt.toISOString(),
      createdAt: refund.createdAt.toISOString(),
    })),
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

/**
 * Serializes payment writes for one booking. The namespace prefix keeps this lock from
 * colliding with the equipment advisory locks used by bookings and blackouts.
 */
async function lockBooking(tx: Prisma.TransactionClient, bookingId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${bookingId}`}))`;
}

/** No new payment may take the booking past its total. Overpayment is rejected, not credited. */
function assertCanAcceptPayment(booking: BookingPaymentRow, amount: Prisma.Decimal): void {
  const outstanding = booking.totalAmount.minus(booking.paidAmount);
  const amountDue = outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding;

  if (amount.gt(amountDue)) {
    throw conflict("Payment exceeds the outstanding balance", {
      amount: money(amount),
      amountDue: money(amountDue),
      paidAmount: money(booking.paidAmount),
      totalAmount: money(booking.totalAmount),
    });
  }
}

/** Sum of collected money minus refunds, clamped at zero if legacy data is inconsistent. */
async function recomputePaidAmount(
  tx: Prisma.TransactionClient,
  bookingId: string,
): Promise<Prisma.Decimal> {
  const [payments, refunds] = await Promise.all([
    tx.payment.aggregate({
      where: { bookingId, status: { in: ["PAID", "REFUNDED"] } },
      _sum: { amount: true },
    }),
    tx.paymentRefund.aggregate({
      where: { payment: { bookingId } },
      _sum: { amount: true },
    }),
  ]);

  const gross = payments._sum.amount ?? new Prisma.Decimal(0);
  const refunded = refunds._sum.amount ?? new Prisma.Decimal(0);
  const net = gross.minus(refunded);
  const paidAmount = net.isNegative() ? new Prisma.Decimal(0) : net;

  await tx.booking.update({ where: { id: bookingId }, data: { paidAmount } });
  return paidAmount;
}

/** Books one refund against a paid payment and marks the payment REFUNDED when covered. */
async function insertRefund(
  tx: Prisma.TransactionClient,
  paymentId: string,
  input: RefundPaymentInput,
  adminId: string,
) {
  const basic = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { bookingId: true },
  });

  if (!basic) {
    throw notFound(`Payment "${paymentId}" was not found`);
  }

  await lockBooking(tx, basic.bookingId);

  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      status: true,
      booking: { select: bookingPaymentFields },
      refunds: { select: { amount: true } },
    },
  });

  if (!payment) {
    throw notFound(`Payment "${paymentId}" was not found`);
  }

  if (payment.status !== "PAID") {
    throw conflict("Only a paid payment can be refunded", {
      paymentStatus: payment.status,
    });
  }

  const refunded = refundedAmount(payment);
  const refundable = payment.amount.minus(refunded);
  const amount = new Prisma.Decimal(input.amount.toFixed(2));

  if (amount.gt(refundable)) {
    throw badRequest("Refund exceeds the unrefunded amount on this payment", {
      amount: money(amount),
      refundableAmount: money(refundable),
      refundedAmount: money(refunded),
      paymentAmount: money(payment.amount),
    });
  }

  await tx.paymentRefund.create({
    data: {
      paymentId,
      amount,
      reason: input.reason.trim(),
      reference: input.reference ?? null,
      refundedAt: input.refundedAt ? new Date(input.refundedAt) : new Date(),
      refundedById: adminId,
    },
  });

  const nextRefunded = refunded.plus(amount);
  if (nextRefunded.equals(payment.amount)) {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
  }

  const paidAmount = await recomputePaidAmount(tx, basic.bookingId);
  const updated = await tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: paymentFields,
  });

  return {
    payment: updated,
    booking: { ...payment.booking, paidAmount },
  };
}

/**
 * Records a payment. Cash, M-Pesa and bank transfers are PAID immediately when the caller
 * supplies `paidAt`; MANUAL/OTHER start PENDING and are confirmed with PATCH.
 */
export async function recordPayment(bookingId: string, input: CreatePaymentInput, adminId: string) {
  const result = await db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await loadBooking(tx, bookingId);

    const amount = new Prisma.Decimal(input.amount.toFixed(2));
    assertCanAcceptPayment(booking, amount);

    const settlesImmediately =
      (input.method === "CASH" || input.method === "MPESA" || input.method === "BANK_TRANSFER") &&
      input.paidAt !== undefined &&
      input.paidAt !== null;

    const payment = await tx.payment.create({
      data: {
        bookingId,
        amount,
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

/** Payment history plus a net running total and the derived status of the booking. */
export async function listPayments(bookingId: string) {
  const booking = await loadBooking(db, bookingId);

  const rows = await db.payment.findMany({
    where: { bookingId },
    select: paymentFields,
    orderBy: { createdAt: "asc" },
  });

  const paidTotal = rows.reduce((sum, row) => {
    if (row.status !== "PAID" && row.status !== "REFUNDED") {
      return sum;
    }
    return sum.plus(row.amount).minus(refundedAmount(row));
  }, new Prisma.Decimal(0));
  const refundedTotal = rows.reduce(
    (sum, row) => sum.plus(refundedAmount(row)),
    new Prisma.Decimal(0),
  );

  return {
    data: rows.map(toPayment),
    meta: {
      total: rows.length,
      paidTotal: money(paidTotal.isNegative() ? new Prisma.Decimal(0) : paidTotal),
      refundedTotal: money(refundedTotal),
      booking: paymentSummary(booking),
    },
  };
}

/**
 * Deleting a payment is allowed only while the booking is PENDING. A PAID row can be
 * removed there because the booking is not agreed yet; once it is confirmed or closed,
 * money is changed by recording a refund instead.
 */
export async function deletePayment(paymentId: string) {
  const result = await db.$transaction(async (tx) => {
    const basic = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { bookingId: true },
    });

    if (!basic) {
      throw notFound(`Payment "${paymentId}" was not found`);
    }

    await lockBooking(tx, basic.bookingId);

    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        bookingId: true,
        booking: { select: bookingPaymentFields },
        refunds: { select: { id: true } },
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

    if (payment.refunds.length > 0) {
      throw conflict("A payment with refunds cannot be deleted", {
        refundCount: payment.refunds.length,
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
    const basic = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { bookingId: true },
    });

    if (!basic) {
      throw notFound(`Payment "${paymentId}" was not found`);
    }

    await lockBooking(tx, basic.bookingId);

    const existing = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        status: true,
        paidAt: true,
        booking: { select: bookingPaymentFields },
        refunds: { select: { amount: true } },
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

    if (existing.status === "REFUNDED") {
      throw conflict("A fully refunded payment cannot be changed", {
        paymentStatus: existing.status,
      });
    }

    const refunded = refundedAmount(existing);
    if (input.status === "FAILED" && refunded.gt(0)) {
      throw conflict("A payment with refunds cannot be marked failed", {
        refundedAmount: money(refunded),
      });
    }

    const markingPaid = input.status === "PAID" && existing.status !== "PAID";
    if (markingPaid) {
      assertCanAcceptPayment(existing.booking, existing.amount);
    }

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

/** Records money returned to the customer against one paid payment. */
export async function refundPayment(paymentId: string, input: RefundPaymentInput, adminId: string) {
  const result = await db.$transaction(async (tx) => insertRefund(tx, paymentId, input, adminId), {
    isolationLevel: "Serializable",
    timeout: 10_000,
  });

  return {
    payment: toPayment(result.payment),
    booking: paymentSummary(result.booking),
  };
}
