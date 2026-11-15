import { randomInt } from "node:crypto";

/**
 * Booking codes are the public capability for a booking (F6c), so they are random rather
 * than sequential: guessing `PP-000001` must not reveal anyone else's booking.
 *
 * RFC 4648 base32 (A–Z, 2–7) is 32 characters, so six of them give 32^6 ≈ 1.07 billion
 * combinations. Lower- and upper-case are never confused because only upper-case leaves
 * this module.
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CODE_LENGTH = 6;

export const BOOKING_CODE_PATTERN = /^PP-[A-Z2-7]{6}$/;

/** A fresh `PP-XXXXXX` code. Uniqueness is the caller's job (retry on `P2002`). */
export function generateBookingCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += BASE32_ALPHABET[randomInt(BASE32_ALPHABET.length)];
  }
  return `PP-${code}`;
}

/** True for a well-formed code; used by the public lookup in F6c before querying. */
export function isBookingCode(value: string): boolean {
  return BOOKING_CODE_PATTERN.test(value);
}
