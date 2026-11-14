import type { RequestHandler } from "express";

import { tooManyRequests } from "../lib/api-error";

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

/**
 * Fixed-window, in-memory limiter. This is enough for the single-instance MVP: state
 * lives in the process, so a restart clears it and a second instance would keep its
 * own counters. Move to a shared store (or the proxy) before scaling horizontally.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}): RequestHandler {
  const { windowMs, max, message } = options;
  const buckets = new Map<string, Bucket>();

  function sweep(now: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    if (buckets.size > MAX_TRACKED_KEYS) {
      sweep(now);
    }

    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      next(tooManyRequests(message, { retryAfterSeconds }));
      return;
    }

    next();
  };
}
