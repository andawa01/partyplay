import { Router } from "express";

import { changePassword, login, logout, me } from "../controllers/auth";
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

router.post("/login", loginRateLimiter, asyncHandler(login));

router.post("/logout", requireAdmin, asyncHandler(logout));

router.get("/me", requireAdmin, asyncHandler(me));

router.post("/password", requireAdmin, asyncHandler(changePassword));

export default router;
