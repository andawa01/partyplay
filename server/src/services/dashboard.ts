import { Prisma } from "@prisma/client";

import { db } from "../config/db";
import { formatCalendarDate, todayInNairobi } from "../lib/dates";
import { money } from "../lib/money";
import { getReservedQuantities } from "./availability";
import { expireOverdueBookings } from "./hold-expiry";
import { derivePaymentStatus } from "./payments";

/**
 * Dashboard summaries (F10). Everything here is computed from the same tables the rest of
 * the admin surface reads — no counters and no stored snapshots — so a number on the
 * dashboard cannot disagree with the board, the payment history or psql.
 */

/** How far ahead "low stock" looks. Seven days covers a full booking week. */
const LOW_STOCK_HORIZON_DAYS = 7;

/** Jobs the owner should be preparing for right now. */
const UPCOMING_LIMIT = 5;

/**
 * Nairobi is UTC+3 with no DST, so a local month begins three hours before UTC midnight.
 * Calendar dates (`startDate`) stay UTC dates; only timestamps need this shift.
 */
function nairobiMonthStart(today: Date): Date {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1) - 3 * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

async function lowStock(equipmentIds: string[]): Promise<
  Array<{
    equipmentId: string;
    name: string;
    total: number;
    availableToday: number;
    reservedToday: number;
    daysFullyBooked: number;
    firstFullDate: string;
  }>
> {
  if (equipmentIds.length === 0) {
    return [];
  }

  const equipment = await db.equipment.findMany({
    where: { id: { in: equipmentIds } },
    select: { id: true, name: true, inventory: { select: { total: true } } },
  });

  const today = todayInNairobi();
  const byId = new Map(
    equipment.map((item) => [item.id, { name: item.name, total: item.inventory[0]?.total ?? 0 }]),
  );

  const state = new Map<string, { daysFullyBooked: number; firstFullDate: string | null }>();
  const reservedOnDay = new Map<string, number>();

  for (let offset = 0; offset < LOW_STOCK_HORIZON_DAYS; offset += 1) {
    const day = addDays(today, offset);
    const reserved = await getReservedQuantities({
      equipmentIds,
      startDate: day,
      endDate: day,
    });

    for (const equipmentId of equipmentIds) {
      const item = byId.get(equipmentId);
      if (!item) continue;

      const reservedUnits = reserved.get(equipmentId) ?? 0;
      if (offset === 0) {
        reservedOnDay.set(equipmentId, reservedUnits);
      }

      // Only equipment someone is actually holding can be "low": an item with zero
      // units and no bookings is inactive stock, not a shortage.
      if (item.total - reservedUnits > 0 || reservedUnits === 0) {
        continue;
      }

      const entry = state.get(equipmentId) ?? { daysFullyBooked: 0, firstFullDate: null };
      entry.daysFullyBooked += 1;
      entry.firstFullDate ??= formatCalendarDate(day);
      state.set(equipmentId, entry);
    }
  }

  return [...state.entries()]
    .map(([equipmentId, entry]) => {
      const item = byId.get(equipmentId)!;
      const reservedToday = reservedOnDay.get(equipmentId) ?? 0;
      return {
        equipmentId,
        name: item.name,
        total: item.total,
        availableToday: Math.max(0, item.total - reservedToday),
        reservedToday,
        daysFullyBooked: entry.daysFullyBooked,
        firstFullDate: entry.firstFullDate!,
      };
    })
    .sort((a, b) => b.daysFullyBooked - a.daysFullyBooked || a.name.localeCompare(b.name));
}

/**
 * Money still owed on live jobs. Clamped per booking so one overpayment cannot hide
 * another booking's debt, which a single `SUM(total - paid)` would.
 */
async function outstandingRevenue(): Promise<Prisma.Decimal> {
  const rows = await db.$queryRaw<Array<{ outstanding: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT COALESCE(SUM(GREATEST("totalAmount" - "paidAmount", 0)), 0) AS outstanding
    FROM "Booking"
    WHERE "status" IN ('CONFIRMED'::"BookingStatus", 'COMPLETED'::"BookingStatus")
  `);

  return rows[0]?.outstanding ?? new Prisma.Decimal(0);
}

const upcomingSelect = {
  id: true,
  code: true,
  status: true,
  startDate: true,
  endDate: true,
  fulfilmentMethod: true,
  totalAmount: true,
  paidAmount: true,
  createdAt: true,
  customer: { select: { name: true, phone: true } },
} satisfies Prisma.BookingSelect;

type UpcomingRow = Prisma.BookingGetPayload<{ select: typeof upcomingSelect }>;

function toUpcoming(row: UpcomingRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    customer: row.customer,
    startDate: formatCalendarDate(row.startDate),
    endDate: formatCalendarDate(row.endDate),
    fulfilmentMethod: row.fulfilmentMethod,
    totalAmount: money(row.totalAmount),
    paidAmount: money(row.paidAmount),
    paymentStatus: derivePaymentStatus(Number(row.paidAmount), Number(row.totalAmount)),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDashboard() {
  // Same bounded lazy expiry as the booking board: a lapsed hold must not keep inflating
  // the pending count. The sweep is idempotent and capped, so it cannot become a long read.
  await expireOverdueBookings({ take: 200 });

  const today = todayInNairobi();
  const monthStart = nairobiMonthStart(today);
  const nextMonthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1) - 3 * 60 * 60 * 1000,
  );

  const activeEquipment = await db.equipment.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const [
    pending,
    confirmedThisMonth,
    completed,
    collected,
    collectedThisMonth,
    outstanding,
    settings,
    upcomingRows,
    lowStockRows,
  ] = await Promise.all([
    db.booking.count({ where: { status: "PENDING" } }),
    db.booking.count({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        // Approval activity, not event dates: what the owner won this month.
        approvedAt: { gte: monthStart, lt: nextMonthStart },
      },
    }),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: {
        status: "PAID",
        // Payments recorded without an explicit paidAt are dated by when they were entered.
        OR: [
          { paidAt: { gte: monthStart, lt: nextMonthStart } },
          { paidAt: null, createdAt: { gte: monthStart, lt: nextMonthStart } },
        ],
      },
      _sum: { amount: true },
    }),
    outstandingRevenue(),
    db.siteSetting.findFirst({ select: { currency: true } }),
    db.booking.findMany({
      where: { status: "CONFIRMED", endDate: { gte: today } },
      select: upcomingSelect,
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      take: UPCOMING_LIMIT,
    }),
    lowStock(activeEquipment.map((item) => item.id)),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    asOf: formatCalendarDate(today),
    month: `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`,
    bookings: { pending, confirmedThisMonth, completed },
    revenue: {
      currency: settings?.currency ?? "KES",
      collected: money(collected._sum.amount) ?? "0.00",
      thisMonth: money(collectedThisMonth._sum.amount) ?? "0.00",
      // Only live jobs owe money; rejected, cancelled and lapsed requests do not.
      outstanding: money(outstanding) ?? "0.00",
    },
    inventory: {
      horizonDays: LOW_STOCK_HORIZON_DAYS,
      lowStock: lowStockRows,
    },
    upcoming: upcomingRows.map(toUpcoming),
  };
}
