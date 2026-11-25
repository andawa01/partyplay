import { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { toCsv } from "../lib/csv";
import { badRequest } from "../lib/api-error";
import { formatCalendarDate, parseCalendarDate, todayInNairobi } from "../lib/dates";
import { money } from "../lib/money";
import type { ReportExportQuery, ReportQuery } from "../schemas/reports";

/**
 * F16 reports. Everything is derived from booking, payment and refund rows at read time —
 * the same tables the board and dashboard use — so an exported figure cannot disagree with
 * the screen it came from.
 *
 * Money timestamps are stored as instants; a Nairobi calendar day starts three hours
 * before UTC midnight, so the requested from/to dates are shifted before filtering.
 */

const MAX_RANGE_DAYS = 366;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

const STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED", "EXPIRED"] as const;

type Range = {
  from: Date;
  to: Date;
  days: number;
  /** Inclusive start and exclusive end as instants for timestamp filters. */
  start: Date;
  endExclusive: Date;
  fromIso: string;
  toIso: string;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function nairobiStart(date: Date): Date {
  return new Date(date.getTime() - NAIROBI_OFFSET_MS);
}

function resolveRange(query: ReportQuery): Range {
  const today = todayInNairobi();
  const from = query.from
    ? parseCalendarDate(query.from)
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const to = query.to ? parseCalendarDate(query.to) : today;

  if (to.getTime() < from.getTime()) {
    throw badRequest("to must be on or after from", {
      from: formatCalendarDate(from),
      to: formatCalendarDate(to),
    });
  }

  const days = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw badRequest(`Report ranges cannot exceed ${MAX_RANGE_DAYS} days`, {
      from: formatCalendarDate(from),
      to: formatCalendarDate(to),
      days,
    });
  }

  return {
    from,
    to,
    days,
    start: nairobiStart(from),
    endExclusive: nairobiStart(addDays(to, 1)),
    fromIso: formatCalendarDate(from),
    toIso: formatCalendarDate(to),
  };
}

/** `YYYY-MM` in Nairobi, for bucketing instant timestamps into calendar months. */
function monthKey(instant: Date): string {
  return new Date(instant.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 7);
}

function monthKeys(range: Range): string[] {
  const keys: string[] = [];
  let cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));
  const last = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1));
  while (cursor.getTime() <= last.getTime()) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return keys;
}

const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  status: true,
  providerRef: true,
  description: true,
  paidAt: true,
  createdAt: true,
  booking: { select: { code: true, currency: true, customer: { select: { name: true } } } },
} satisfies Prisma.PaymentSelect;

const refundSelect = {
  id: true,
  amount: true,
  reason: true,
  reference: true,
  refundedAt: true,
  payment: {
    select: {
      booking: { select: { code: true, currency: true, customer: { select: { name: true } } } },
    },
  },
} satisfies Prisma.PaymentRefundSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type RefundRow = Prisma.PaymentRefundGetPayload<{ select: typeof refundSelect }>;

function paymentDate(row: PaymentRow): Date {
  return row.paidAt ?? row.createdAt;
}

async function loadMoney(range: Range): Promise<{ payments: PaymentRow[]; refunds: RefundRow[] }> {
  const [payments, refunds] = await Promise.all([
    db.payment.findMany({
      where: {
        status: { in: ["PAID", "REFUNDED"] },
        OR: [
          { paidAt: { gte: range.start, lt: range.endExclusive } },
          { paidAt: null, createdAt: { gte: range.start, lt: range.endExclusive } },
        ],
      },
      select: paymentSelect,
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    }),
    db.paymentRefund.findMany({
      where: { refundedAt: { gte: range.start, lt: range.endExclusive } },
      select: refundSelect,
      orderBy: { refundedAt: "asc" },
    }),
  ]);

  return { payments, refunds };
}

function sum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));
}

const bookingReportSelect = {
  id: true,
  status: true,
  createdAt: true,
  startDate: true,
  endDate: true,
  items: { select: { equipmentId: true, quantity: true } },
  packages: {
    select: { items: { select: { equipmentId: true, quantity: true } } },
  },
} satisfies Prisma.BookingSelect;


/**
 * Unit-days are the honest utilisation measure: one unit held for three days consumes
 * three unit-days of capacity, and only the part of the rental inside the report window
 * counts. Packages contribute the equipment they contain.
 */
function utilisation(range: Range) {
  return db.booking
    .findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        startDate: { lte: range.to },
        endDate: { gte: range.from },
      },
      select: bookingReportSelect,
    })
    .then((bookings) => {
      const unitDays = new Map<string, number>();
      const equipmentBookings = new Map<string, Set<string>>();

      for (const booking of bookings) {
        const start = Math.max(booking.startDate.getTime(), range.from.getTime());
        const end = Math.min(booking.endDate.getTime(), range.to.getTime());
        const days = Math.round((end - start) / MS_PER_DAY) + 1;
        if (days <= 0) {
          continue;
        }

        // Package rows keep an equipment id only while the item still exists; a removed
        // catalogue item contributes no stock and therefore no utilisation.
        const packageLines = booking.packages
          .flatMap((pkg) => pkg.items)
          .filter(
            (line): line is { equipmentId: string; quantity: number } => line.equipmentId !== null,
          );
        const lines = [...booking.items, ...packageLines];

        for (const line of lines) {
          unitDays.set(
            line.equipmentId,
            (unitDays.get(line.equipmentId) ?? 0) + line.quantity * days,
          );
          const seen = equipmentBookings.get(line.equipmentId) ?? new Set<string>();
          seen.add(booking.id);
          equipmentBookings.set(line.equipmentId, seen);
        }
      }

      return { unitDays, equipmentBookings };
    });
}

export type Report = Awaited<ReturnType<typeof getReport>>;

export async function getReport(query: ReportQuery) {
  const range = resolveRange(query);

  const [{ payments, refunds }, bookingRows, equipmentRows, utilisationRows, settings] =
    await Promise.all([
      loadMoney(range),
      db.booking.findMany({
        where: { createdAt: { gte: range.start, lt: range.endExclusive } },
        select: { status: true, createdAt: true },
      }),
      db.equipment.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          inventory: { select: { total: true }, take: 1 },
        },
        orderBy: { name: "asc" },
      }),
      utilisation(range),
      db.siteSetting.findFirst({ select: { currency: true } }),
    ]);

  const gross = sum(payments.map((payment) => payment.amount));
  const refunded = sum(refunds.map((refund) => refund.amount));
  const net = gross.minus(refunded);

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
    (typeof STATUSES)[number],
    number
  >;
  for (const booking of bookingRows) {
    byStatus[booking.status] += 1;
  }

  const months = new Map(
    monthKeys(range).map((month) => [
      month,
      {
        month,
        gross: new Prisma.Decimal(0),
        refunded: new Prisma.Decimal(0),
        bookings: 0,
      },
    ]),
  );

  for (const payment of payments) {
    const bucket = months.get(monthKey(paymentDate(payment)));
    if (bucket) {
      bucket.gross = bucket.gross.plus(payment.amount);
    }
  }
  for (const refund of refunds) {
    const bucket = months.get(monthKey(refund.refundedAt));
    if (bucket) {
      bucket.refunded = bucket.refunded.plus(refund.amount);
    }
  }
  for (const booking of bookingRows) {
    const bucket = months.get(monthKey(booking.createdAt));
    if (bucket) {
      bucket.bookings += 1;
    }
  }

  const equipment = equipmentRows
    .map((item) => {
      const inventory = item.inventory[0]?.total ?? 0;
      const bookedUnitDays = utilisationRows.unitDays.get(item.id) ?? 0;
      const capacityUnitDays = inventory * range.days;
      return {
        equipmentId: item.id,
        name: item.name,
        isActive: item.isActive,
        inventory,
        bookings: utilisationRows.equipmentBookings.get(item.id)?.size ?? 0,
        bookedUnitDays,
        capacityUnitDays,
        utilisation:
          capacityUnitDays > 0 ? Math.round((bookedUnitDays / capacityUnitDays) * 1000) / 10 : 0,
      };
    })
    .filter((item) => item.inventory > 0 || item.bookedUnitDays > 0)
    .sort((a, b) => b.utilisation - a.utilisation || a.name.localeCompare(b.name));

  const currency = settings?.currency ?? payments[0]?.booking.currency ?? "KES";

  return {
    generatedAt: new Date().toISOString(),
    currency,
    range: { from: range.fromIso, to: range.toIso, days: range.days },
    revenue: {
      gross: money(gross) ?? "0.00",
      refunded: money(refunded) ?? "0.00",
      net: money(net) ?? "0.00",
      paymentCount: payments.length,
      refundCount: refunds.length,
    },
    bookings: {
      created: bookingRows.length,
      byStatus,
    },
    monthly: [...months.values()].map((bucket) => ({
      month: bucket.month,
      gross: money(bucket.gross) ?? "0.00",
      refunded: money(bucket.refunded) ?? "0.00",
      net: money(bucket.gross.minus(bucket.refunded)) ?? "0.00",
      bookings: bucket.bookings,
    })),
    equipment,
  };
}

// ---------------------------------------------------------------------------
// CSV exports (F16). These return the file body; the controller sets the headers.
// ---------------------------------------------------------------------------

function fileRange(range: Range): string {
  return `${range.fromIso}-to-${range.toIso}`;
}

export async function bookingsCsv(query: ReportQuery) {
  const range = resolveRange(query);
  const rows = await db.booking.findMany({
    where: { createdAt: { gte: range.start, lt: range.endExclusive } },
    select: {
      code: true,
      createdAt: true,
      startDate: true,
      endDate: true,
      status: true,
      fulfilmentMethod: true,
      totalAmount: true,
      paidAmount: true,
      currency: true,
      customer: { select: { name: true, phone: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const body = toCsv([
    [
      "Reference",
      "Created",
      "Start date",
      "End date",
      "Status",
      "Customer",
      "Phone",
      "Email",
      "Fulfilment",
      "Total",
      "Paid",
      "Balance",
      "Currency",
    ],
    ...rows.map((row) => [
      row.code,
      row.createdAt.toISOString(),
      formatCalendarDate(row.startDate),
      formatCalendarDate(row.endDate),
      row.status,
      row.customer.name,
      row.customer.phone,
      row.customer.email,
      row.fulfilmentMethod,
      row.totalAmount.toFixed(2),
      row.paidAmount.toFixed(2),
      row.totalAmount.minus(row.paidAmount).toFixed(2),
      row.currency,
    ]),
  ]);

  return { filename: `partyplay-bookings-${fileRange(range)}.csv`, body };
}

export async function paymentsCsv(query: ReportExportQuery) {
  const range = resolveRange(query);
  const { payments, refunds } = await loadMoney(range);

  const lines = [
    ...payments.map((payment) => ({
      date: paymentDate(payment),
      type: "Payment",
      code: payment.booking.code,
      customer: payment.booking.customer.name,
      amount: payment.amount.toFixed(2),
      currency: payment.booking.currency,
      method: payment.method,
      status: payment.status,
      reference: payment.providerRef ?? "",
      notes: payment.description ?? "",
    })),
    ...refunds.map((refund) => ({
      date: refund.refundedAt,
      type: "Refund",
      code: refund.payment.booking.code,
      customer: refund.payment.booking.customer.name,
      amount: `-${refund.amount.toFixed(2)}`,
      currency: refund.payment.booking.currency,
      method: "",
      status: "REFUNDED",
      reference: refund.reference ?? "",
      notes: refund.reason,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const body = toCsv([
    [
      "Date",
      "Type",
      "Booking reference",
      "Customer",
      "Amount",
      "Currency",
      "Method",
      "Status",
      "Reference",
      "Notes",
    ],
    ...lines.map((line) => [
      line.date.toISOString(),
      line.type,
      line.code,
      line.customer,
      line.amount,
      line.currency,
      line.method,
      line.status,
      line.reference,
      line.notes,
    ]),
  ]);

  return { filename: `partyplay-payments-${fileRange(range)}.csv`, body };
}
