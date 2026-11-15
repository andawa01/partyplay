import { Router } from "express";

import { createBooking } from "../controllers/bookings";
import { asyncHandler } from "../lib/async";

const router = Router();

router.post("/", asyncHandler(createBooking));

export default router;
