import jwt from "jsonwebtoken";

import { authConfig } from "../config/auth";

const ALGORITHM = "HS256";

/**
 * The token carries only the admin id. Everything else is read from the database on
 * each request, so a renamed admin or a changed role takes effect without re-login.
 */
export function signSessionToken(adminId: string): string {
  return jwt.sign({ sub: adminId }, authConfig.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: authConfig.sessionHours * 60 * 60,
  });
}

/** Returns the admin id, or null for anything that is not a valid, unexpired token. */
export function readSessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, authConfig.jwtSecret, { algorithms: [ALGORITHM] });
    if (typeof payload === "string" || typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
