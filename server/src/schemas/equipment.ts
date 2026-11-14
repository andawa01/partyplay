import { z } from "zod";

import { slugSchema } from "./common";

/**
 * Prices arrive as numbers and leave as two-decimal strings, which is exactly what the
 * Decimal(10,2) columns want; nothing here ever becomes a float downstream.
 */
export const priceSchema = z
  .number()
  .min(0)
  .max(99_999_999.99)
  .transform((value) => value.toFixed(2));

const createFields = {
  slug: slugSchema,
  name: z.string().trim().min(1).max(128),
  categoryId: z.string().min(1).max(64),
  description: z.string().max(2000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  note: z.string().max(1000).nullish(),
  pricePerDay: priceSchema.nullish(),
  pricePerWeek: priceSchema.nullish(),
  flatPrice: priceSchema.nullish(),
  minQuantity: z.number().int().min(1).max(10_000).default(1),
  maxQuantity: z.number().int().min(1).max(10_000).default(10),
  isActive: z.boolean().optional(),
};

export const createEquipmentSchema = z
  .object(createFields)
  .refine((input) => input.maxQuantity >= input.minQuantity, {
    message: "maxQuantity must be at least minQuantity",
    path: ["maxQuantity"],
  });

/** `slug` is absent on purpose: it is the stable public identifier. */
export const updateEquipmentSchema = z
  .object({
    name: createFields.name,
    categoryId: createFields.categoryId,
    description: createFields.description,
    imageUrl: createFields.imageUrl,
    note: createFields.note,
    pricePerDay: priceSchema.nullable(),
    pricePerWeek: priceSchema.nullable(),
    flatPrice: priceSchema.nullable(),
    minQuantity: createFields.minQuantity,
    maxQuantity: createFields.maxQuantity,
    isActive: z.boolean(),
  })
  .partial();

export const inventorySchema = z.object({
  total: z.number().int().min(0).max(100_000),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
