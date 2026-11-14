import type { Prisma } from "@prisma/client";

/**
 * Money crosses the API as a string with two decimals, never as a JSON number: a
 * Decimal(10,2) cannot survive the trip through a JS float without risking a rounding
 * change, and the client should not do arithmetic on it anyway.
 */
export function money(value: Prisma.Decimal | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toFixed(2);
}
