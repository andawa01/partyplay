import { z } from "zod";

import { slugParamsSchema, slugSchema } from "./common";

/** Category slugs are kebab-case and immutable once created. */
export const categorySlugSchema = slugSchema;

export const categorySlugParamsSchema = slugParamsSchema;

export const createCategorySchema = z.object({
  slug: categorySlugSchema,
  name: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  isGroup: z.boolean().optional(),
  parentId: z.string().max(255).optional(),
});

/** `slug` is omitted so it can never be patched; references stay stable. */
export const updateCategorySchema = createCategorySchema.partial().omit({ slug: true });
