import { Router } from "express";

import { getCalendar } from "../controllers/availability";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(getCalendar));

export default router;
