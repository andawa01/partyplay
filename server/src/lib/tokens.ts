import jwt from "jsonwebtoken";

import { authConfig } from "../config/auth";

const ALGORITHM = "HS256";

export interface SessionTokenClaims {
  adminId: string;
  sessionVersion: number;
}

/**
 * The token carries the admin id and the session version. Everything else is read from
 * the database on each request, so a renamed admin or a changed role takes effect without
 * re-login. Bumping `sessionVersion` invalidates every token issued before the reset.
 */
export function signSessionToken(adminId: string, sessionVersion: number): string {
  return jwt.sign({ sub: adminId, ver: sessionVersion }, authConfig.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: authConfig.sessionHours * 60 * 60,
  });
}

/** Returns the claims, or null for anything that is not a valid, unexpired token. */
export function readSessionToken(token: string): SessionTokenClaims | null {
  try {
    const payload = jwt.verify(token, authConfig.jwtSecret, { algorithms: [ALGORITHM] });
    if (typeof payload === "string" || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }

    // Tokens issued before session versioning have no `ver`; version 0 is their
    // effective value, which matches the database default.
    const sessionVersion =
      typeof payload.ver === "number" && Number.isInteger(payload.ver) && payload.ver >= 0
        ? payload.ver
        : 0;

    return { adminId: payload.sub, sessionVersion };
  } catch {
    return null;
  }
}
