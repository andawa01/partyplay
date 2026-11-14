import { z } from "zod";

import { slugSchema } from "./common";
import { priceSchema } from "./equipment";

const createFields = {
  slug: slugSchema,
  name: z.string().trim().min(1).max(128),
  description: z.string().max(2000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  price: priceSchema,
  minQuantity: z.number().int().min(1).max(10_000).default(1),
  maxQuantity: z.number().int().min(1).max(10_000).nullish(),
  duration: z.number().int().min(1).max(365).nullish(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createPackageSchema = z
  .object(createFields)
  .refine((input) => input.maxQuantity === null || input.maxQuantity === undefined || input.maxQuantity >= input.minQuantity, {
    message: "maxQuantity must be at least minQuantity",
    path: ["maxQuantity"],
  });

/** `slug` is absent on purpose: it is the stable public identifier. */
export const updatePackageSchema = z
  .object({
    name: createFields.name,
    description: createFields.description,
    imageUrl: createFields.imageUrl,
    price: priceSchema,
    minQuantity: createFields.minQuantity,
    maxQuantity: z.number().int().min(1).max(10_000).nullable(),
    duration: z.number().int().min(1).max(365).nullable(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
  })
  .partial();

/**
 * The whole item set is sent at once; the service replaces it in one transaction. An
 * equipment line may appear only once, because the table has a unique pair.
 */
export const packageItemsSchema = z.object({
  items: z
    .array(
      z.object({
        equipmentId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(10_000),
      }),
    )
    .max(100)
    .refine(
      (items) => new Set(items.map((item) => item.equipmentId)).size === items.length,
      { message: "An equipment item can only appear once" },
    ),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type PackageItemsInput = z.infer<typeof packageItemsSchema>;
