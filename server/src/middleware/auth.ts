import { Request, Response, NextFunction } from "express";

// Placeholder. Real session-based admin auth is built in Phase 4.
// For now, every route that calls requireAdmin returns 501 until we wire it.
export function requireAdmin(_req: Request, res: Response, _next: NextFunction): void {
  res.status(501).json({ error: "Admin authentication is not yet implemented. Protected routes will work in Phase 4." });
}
