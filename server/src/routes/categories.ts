import { Router } from "express";
import { z } from "zod";
import { db } from "../config/db";
import { requireAdmin } from "../middleware/auth";

const router = Router();

const slugSchema = z.object({ slug: z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case") });

export function categorySlugSchema() {
  return slugSchema;
}

router.get("/", async (_req, res) => {
  const categories = await db.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: { children: true },
      },
      equipment: {
        where: { isActive: true },
        select: { id: true, slug: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  res.json({ data: categories });
});

router.get("/:slug", async (req, res) => {
  const parsed = slugSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const category = await db.category.findUnique({
    where: { slug: parsed.data.slug },
    include: {
      parent: true,
      children: { include: { children: true } },
      equipment: {
        where: { isActive: true },
        select: { id: true, slug: true, name: true },
      },
    },
  });

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  res.json({ data: category });
});

const createCategorySchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  name: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  isGroup: z.boolean().optional(),
  parentId: z.string().max(255).optional(),
});

router.post("/", requireAdmin, async (req, res) => {
  const input = createCategorySchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid input", details: input.error.flatten() });
  }

  const { parentId } = input.data;
  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      return res.status(404).json({ error: "Parent category not found" });
    }
  }

  const existing = await db.category.findUnique({ where: { slug: input.data.slug } });
  if (existing) {
    return res.status(409).json({ error: "A category with this slug already exists" });
  }

  const category = await db.category.create({ data: input.data });
  res.status(201).json({ data: category });
});

const updateCategorySchema = createCategorySchema.partial().extend({
  // slug is immutable after creation to keep references stable
});

router.patch("/:slug", requireAdmin, async (req, res) => {
  const parsed = slugSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const input = updateCategorySchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Invalid input", details: input.error.flatten() });
  }

  const { slug } = parsed.data;

  // prevent changing slug
  const body = { ...input.data };
  delete body.slug;

  const category = await db.category.update({
    where: { slug },
    data: body,
  });

  res.json({ data: category });
});

router.delete("/:slug", requireAdmin, async (req, res) => {
  const parsed = slugSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const { slug } = parsed.data;

  // Only allow deletion if no equipment is directly assigned to this category.
  // Sub-categories can be deleted even if they still have their own sub-categories;
  // the admin can reorganize as needed.
  const directEquipment = await db.equipment.count({
    where: { category: { slug } },
  });

  if (directEquipment > 0) {
    return res.status(400).json({
      error: "Remove or reassign equipment in this category before deleting it",
    });
  }

  await db.category.delete({ where: { slug } });
  res.status(204).send();
});

export default router;
