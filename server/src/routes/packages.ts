import { Router } from "express";

import { getPackageAvailability } from "../controllers/availability";
import { getPackage, listPackages } from "../controllers/packages";
import { asyncHandler } from "../lib/async";

const router = Router();

router.get("/", asyncHandler(listPackages));

// Must come before the plain slug route so the extra segment is not swallowed.
router.get("/:slug/availability", asyncHandler(getPackageAvailability));

router.get("/:slug", asyncHandler(getPackage));

export default router;
