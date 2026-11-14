import { Router } from "express";

import { getSite } from "../controllers/site";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(getSite));

export default router;
