import { Prisma } from "@prisma/client";
import { db } from "../config/db";
import { conflict, notFound } from "../lib/api-error";
import type { createCategorySchema, updateCategorySchema } from "../schemas/categories";
import type { z } from "zod";

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/** Two levels of sub-categories, plus the active equipment that can be rented from it. */
const categoryDetail = {
  children: { include: { children: true } },
  equipment: {
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  },
} satisfies Prisma.CategoryInclude;

export async function listCategories() {
  return db.category.findMany({
    where: { parentId: null },
    include: categoryDetail,
    orderBy: { name: "asc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await db.category.findUnique({
    where: { slug },
    include: { parent: true, ...categoryDetail },
  });

  if (!category) {
    throw notFound(`Category "${slug}" was not found`);
  }

  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  await assertParentExists(input.parentId);

  const existing = await db.category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existing) {
    throw conflict(`A category with slug "${input.slug}" already exists`, { field: "slug" });
  }

  return db.category.create({ data: input });
}

export async function updateCategory(slug: string, input: UpdateCategoryInput) {
  const category = await findIdBySlugOrThrow(slug);
  await assertParentExists(input.parentId);

  return db.category.update({ where: { id: category.id }, data: input });
}

export async function deleteCategory(slug: string) {
  const category = await findIdBySlugOrThrow(slug);

  const equipmentCount = await db.equipment.count({ where: { categoryId: category.id } });
  if (equipmentCount > 0) {
    throw conflict(
      `Remove or reassign the ${equipmentCount} equipment item(s) in this category before deleting it`,
      { equipmentCount },
    );
  }

  await db.category.delete({ where: { id: category.id } });
}

async function findIdBySlugOrThrow(slug: string) {
  const category = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (!category) {
    throw notFound(`Category "${slug}" was not found`);
  }
  return category;
}

async function assertParentExists(parentId: string | undefined) {
  if (!parentId) {
    return;
  }

  const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) {
    throw notFound(`Parent category "${parentId}" was not found`);
  }
}
