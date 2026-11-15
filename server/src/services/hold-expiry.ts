import type { Prisma } from "@prisma/client";

import { db } from "../config/db";

/**
 * Hold expiry (F7). A pending request reserves stock only until its hold window lapses;
 * after that it must stop holding units and must stop looking like a live request.
 *
 * Availability already ignores expired holds by comparing `expiresAt > now`, so this
 * service exists to move the *state* forward: booking `EXPIRED`, holds `EXPIRED` with
 * `releasedAt`, and a history row. It is deliberately idempotent.
 */

export type ExpiryScope = {
  /** Only this booking code (used by the public lookup). */
  code?: string;
  /** Only bookings holding at least one of these equipment items (used by availability). */
  equipmentIds?: string[];
  /** Cap for a single transaction; the sweeper picks up the rest next pass. */
  take?: number;
};

const DEFAULT_SWEEP_LIMIT = 500;

/**
 * Expires pending bookings whose own hold deadline has passed, or that still carry an
 * active hold that has lapsed. Returns how many bookings actually changed state.
 */
export async function expireOverdueBookings(scope: ExpiryScope = {}): Promise<number> {
  const now = new Date();

  const overdueWhere: Prisma.BookingWhereInput = {
    status: "PENDING",
    OR: [
      { holdExpiresAt: { lt: now } },
      { stockHolds: { some: { status: "ACTIVE", expiresAt: { lt: now } } } },
    ],
    ...(scope.code ? { code: scope.code.trim().toUpperCase() } : {}),
    ...(scope.equipmentIds && scope.equipmentIds.length > 0
      ? { stockHolds: { some: { equipmentId: { in: scope.equipmentIds } } } }
      : {}),
  };

  return db.$transaction(async (tx) => {
    const overdue = await tx.booking.findMany({
      where: overdueWhere,
      select: {
        id: true,
        stockHolds: { where: { status: "ACTIVE" }, select: { id: true } },
      },
      orderBy: { holdExpiresAt: "asc" },
      take: scope.take ?? DEFAULT_SWEEP_LIMIT,
    });

    let expired = 0;

    for (const booking of overdue) {
      // The status guard is what makes overlapping sweeps safe: only the transaction
      // that actually flips the row writes the history entry.
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      if (changed.count === 0) {
        continue;
      }

      expired += 1;

      if (booking.stockHolds.length > 0) {
        await tx.stockHold.updateMany({
          where: { id: { in: booking.stockHolds.map((hold) => hold.id) }, status: "ACTIVE" },
          data: { status: "EXPIRED", releasedAt: now },
        });
      }

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "PENDING",
          toStatus: "EXPIRED",
          note: "Hold window lapsed",
        },
      });
    }

    return expired;
  });
}
