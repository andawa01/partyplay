import { Router } from "express";

import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
} from "../controllers/auth";
import { asyncHandler } from "../lib/async";
import { requireAdmin } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rate-limit";

const router = Router();

/** 10 attempts per IP per 15 minutes, the same budget for every login attempt. */
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Try again in a few minutes.",
});

/** Reset tokens are long and single-use; the limit still slows automated guessing. */
const resetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many reset attempts. Try again in a few minutes.",
});

/** Keep reset-mail requests from becoming an email-bombing or enumeration tool. */
const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many reset emails requested. Try again in a few minutes.",
});

router.post("/login", loginRateLimiter, asyncHandler(login));

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  asyncHandler(forgotPassword),
);

router.post("/reset-password", resetRateLimiter, asyncHandler(resetPassword));

router.post("/logout", requireAdmin, asyncHandler(logout));

router.get("/me", requireAdmin, asyncHandler(me));

router.post("/password", requireAdmin, asyncHandler(changePassword));

export default router;
