import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "../controllers/categories";
import { asyncHandler } from "../lib/async";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", asyncHandler(listCategories));

router.get("/:slug", asyncHandler(getCategory));

router.post("/", requireAdmin, asyncHandler(createCategory));

router.patch("/:slug", requireAdmin, asyncHandler(updateCategory));

router.delete("/:slug", requireAdmin, asyncHandler(deleteCategory));

export default router;
