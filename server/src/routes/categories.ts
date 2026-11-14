import { Router } from "express";

import { getCategory, listCategories } from "../controllers/categories";
import { asyncHandler } from "../lib/async";

/**
 * Public reads only. Category mutations moved to `/api/admin/categories` in F4.
 */
const router = Router();

router.get("/", asyncHandler(listCategories));

router.get("/:slug", asyncHandler(getCategory));

export default router;
