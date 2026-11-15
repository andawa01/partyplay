import { Router } from "express";

import { createBooking, getBooking } from "../controllers/bookings";
import { asyncHandler } from "../lib/async";
import { createRateLimiter } from "../middleware/rate-limit";

const router = Router();

/**
 * These are the only unauthenticated writes and enumerable reads. A booking reference is
 * a capability, so lookup is throttled to make guessing codes impractical rather than
 * merely slow; creation is throttled so one client cannot flood the hold table.
 */
const createBookingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many booking requests. Please wait a few minutes and try again.",
});

const lookupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many booking lookups. Please wait a few minutes and try again.",
});

router.post("/", createBookingRateLimiter, asyncHandler(createBooking));

// Public: the code itself is the capability, no session required.
router.get("/:code", lookupRateLimiter, asyncHandler(getBooking));

export default router;
