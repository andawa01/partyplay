import type { NextFunction, Request, Response } from "express";

/**
 * One line per request with the fields needed to investigate a slow or failed call.
 * Bodies, cookies and query strings are deliberately excluded: they can carry customer
 * contact details or booking codes.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test" || process.env.LOG_REQUESTS === "false") {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  // `req.path` can be relative to the current router in Express 5; `originalUrl` is the
  // full request path. Strip the query string so search terms and codes are not logged.
  const path = req.originalUrl.split("?")[0] || "/";

  res.once("finish", () => {
    // The compose health check runs frequently; successful probes would be noise.
    if (path === "/api/health" && res.statusCode < 400) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        time: new Date().toISOString(),
        type: "request",
        requestId: req.id,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      }),
    );
  });

  next();
}
