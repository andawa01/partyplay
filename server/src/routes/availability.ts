import { Router } from "express";

import { getAvailability } from "../controllers/availability";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(getAvailability));

export default router;
