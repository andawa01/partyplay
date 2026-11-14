import { Router } from "express";

import { getPackage, listPackages } from "../controllers/packages";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(listPackages));

router.get("/:slug", asyncHandler(getPackage));

export default router;
