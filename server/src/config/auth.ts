/**
 * All admin-session settings in one place. Read once at import time so a missing or
 * too-short JWT_SECRET fails at startup instead of at the first login.
 */

const MIN_SECRET_LENGTH = 32;
const DEFAULT_SESSION_HOURS = 12;

export const SESSION_COOKIE_NAME = "pp_session";

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters. Copy the entry from server/.env.example and give it a random value.`,
    );
  }
  return secret;
}

function readSessionHours(): number {
  const raw = process.env.ADMIN_SESSION_HOURS;
  if (!raw) {
    return DEFAULT_SESSION_HOURS;
  }
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("ADMIN_SESSION_HOURS must be a positive number of hours.");
  }
  return hours;
}

export const authConfig = {
  jwtSecret: readJwtSecret(),
  sessionHours: readSessionHours(),
  cookieName: SESSION_COOKIE_NAME,
  isProduction: process.env.NODE_ENV === "production",
} as const;

/** Shared by `res.cookie()` and `res.clearCookie()` so both agree on scope. */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: authConfig.isProduction,
  path: "/",
} as const;

export const sessionCookieMaxAgeMs = authConfig.sessionHours * 60 * 60 * 1000;
