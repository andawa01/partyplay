import { Router } from "express";

import { getEquipment, listEquipment } from "../controllers/equipment";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(listEquipment));

router.get("/:slug", asyncHandler(getEquipment));

export default router;
