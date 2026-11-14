import { Router } from "express";

import { listOffers } from "../controllers/offers";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(listOffers));

export default router;
