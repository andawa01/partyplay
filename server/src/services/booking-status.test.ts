import type { BookingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { ApiError } from "../lib/api-error";
import { ALLOWED_TRANSITIONS, assertTransition, canTransition } from "./booking-status";

const allowed: Array<[BookingStatus, BookingStatus]> = [
  ["PENDING", "CONFIRMED"],
  ["PENDING", "REJECTED"],
  ["PENDING", "CANCELLED"],
  ["CONFIRMED", "CANCELLED"],
  ["CONFIRMED", "COMPLETED"],
];

const disallowed: Array<[BookingStatus, BookingStatus]> = [
  // System-only: expiry is the sweeper's job, never an operator's.
  ["PENDING", "EXPIRED"],
  // Cannot skip approval.
  ["PENDING", "COMPLETED"],
  // Cannot reject something already confirmed.
  ["CONFIRMED", "REJECTED"],
  // Terminal states stay terminal.
  ["COMPLETED", "CANCELLED"],
  ["CANCELLED", "CONFIRMED"],
  ["REJECTED", "CONFIRMED"],
  ["EXPIRED", "CONFIRMED"],
  // Self-transitions are not edits.
  ["PENDING", "PENDING"],
];

describe("booking status transitions", () => {
  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each(disallowed)("rejects %s -> %s with INVALID_TRANSITION", (from, to) => {
    expect(canTransition(from, to)).toBe(false);

    try {
      assertTransition(from, to);
      throw new Error("expected a transition error");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
      expect((error as ApiError).code).toBe("INVALID_TRANSITION");
      expect((error as ApiError).details).toEqual({
        from,
        to,
        allowed: ALLOWED_TRANSITIONS[from],
      });
    }
  });

  it("leaves every terminal state with no outgoing edges", () => {
    for (const status of ["REJECTED", "CANCELLED", "COMPLETED", "EXPIRED"] as BookingStatus[]) {
      expect(ALLOWED_TRANSITIONS[status]).toEqual([]);
    }
  });
});
