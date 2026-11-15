import { Router } from "express";

import { createBooking, getBooking } from "../controllers/bookings";
import { asyncHandler } from "../lib/async";

const router = Router();

router.post("/", asyncHandler(createBooking));

// Public: the code itself is the capability, no session required.
router.get("/:code", asyncHandler(getBooking));

export default router;
