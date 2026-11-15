import type { BookingStatus } from "@prisma/client";

import { ApiError } from "../lib/api-error";

/**
 * F8 transition table, in code. This is the only place that decides which status changes
 * are legal; the endpoint cannot be used to jump straight to a system-only state such as
 * EXPIRED, because that edge is absent here.
 *
 * | From      | To                    |
 * |-----------|-----------------------|
 * | PENDING   | CONFIRMED, REJECTED, CANCELLED |
 * | CONFIRMED | CANCELLED, COMPLETED  |
 * | everything else | nothing      |
 */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  EXPIRED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws the standard 409 envelope when an operator tries an edge that is not allowed. */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (canTransition(from, to)) {
    return;
  }

  throw new ApiError(
    409,
    "INVALID_TRANSITION",
    `A booking cannot move from ${from} to ${to}`,
    { from, to, allowed: ALLOWED_TRANSITIONS[from] },
  );
}
