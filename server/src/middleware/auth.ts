import type { NextFunction, Request, Response } from "express";

import { authConfig, sessionCookieOptions } from "../config/auth";
import { unauthorized } from "../lib/api-error";
import { readSessionToken } from "../lib/tokens";
import { findAdminForSession, type AdminSummary } from "../services/auth";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminSummary;
    }
  }
}

function readSessionCookie(req: Request): string | null {
  const cookies: unknown = req.cookies;
  if (!cookies || typeof cookies !== "object") {
    return null;
  }
  const token = (cookies as Record<string, unknown>)[authConfig.cookieName];
  return typeof token === "string" && token.length > 0 ? token : null;
}

/**
 * Guards every admin route. A missing, malformed, expired or orphaned session is all
 * the same answer to the client: 401, sign in again.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      next(unauthorized("Authentication required"));
      return;
    }

    const adminId = readSessionToken(token);
    if (!adminId) {
      res.clearCookie(authConfig.cookieName, sessionCookieOptions);
      next(unauthorized("Your session has expired. Sign in again."));
      return;
    }

    const admin = await findAdminForSession(adminId);
    if (!admin) {
      res.clearCookie(authConfig.cookieName, sessionCookieOptions);
      next(unauthorized("Your session is no longer valid. Sign in again."));
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}
