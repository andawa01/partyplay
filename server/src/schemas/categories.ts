import { z } from "zod";

/** Category slugs are kebab-case and immutable once created. */
export const categorySlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

export const categorySlugParamsSchema = z.object({ slug: categorySlugSchema });

export const createCategorySchema = z.object({
  slug: categorySlugSchema,
  name: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  isGroup: z.boolean().optional(),
  parentId: z.string().max(255).optional(),
});

/** `slug` is omitted so it can never be patched; references stay stable. */
export const updateCategorySchema = createCategorySchema.partial().omit({ slug: true });
