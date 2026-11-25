import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { authConfig, sessionCookieOptions } from "../config/auth";
import { forbidden, unauthorized } from "../lib/api-error";
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

    const claims = readSessionToken(token);
    if (!claims) {
      res.clearCookie(authConfig.cookieName, sessionCookieOptions);
      next(unauthorized("Your session has expired. Sign in again."));
      return;
    }

    const admin = await findAdminForSession(claims.adminId);
    if (!admin || admin.sessionVersion !== claims.sessionVersion || !admin.isActive) {
      res.clearCookie(authConfig.cookieName, sessionCookieOptions);
      next(unauthorized("Your session is no longer valid. Sign in again."));
      return;
    }

    const { sessionVersion: _sessionVersion, isActive: _isActive, ...summary } = admin;
    req.admin = summary;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Route-level authorisation. `requireAdmin` proves who the caller is; this decides what
 * their role may do. Use it per route so the permission stays next to the action.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      next(unauthorized("Authentication required"));
      return;
    }
    if (!roles.includes(req.admin.role)) {
      next(forbidden("You do not have access to this action."));
      return;
    }
    next();
  };
}
