import type { Request, Response } from "express";
import {
  categorySlugParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/categories";
import * as categories from "../services/categories";

export async function listCategories(_req: Request, res: Response): Promise<void> {
  res.json({ data: await categories.listCategories() });
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const { slug } = categorySlugParamsSchema.parse(req.params);
  res.json({ data: await categories.getCategoryBySlug(slug) });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const input = createCategorySchema.parse(req.body);
  res.status(201).json({ data: await categories.createCategory(input) });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { slug } = categorySlugParamsSchema.parse(req.params);
  const input = updateCategorySchema.parse(req.body);
  res.json({ data: await categories.updateCategory(slug, input) });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { slug } = categorySlugParamsSchema.parse(req.params);
  await categories.deleteCategory(slug);
  res.status(204).send();
}
