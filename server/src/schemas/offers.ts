import { z } from "zod";

import { slugSchema } from "./common";

const discountTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);
const appliesToSchema = z.enum([
  "ALL_BOOKINGS",
  "ALL_EQUIPMENT",
  "ALL_PACKAGES",
  "ONE_EQUIPMENT",
  "ONE_PACKAGE",
]);

/** Bounds that depend on `discountType` are checked in the service, where the effective
 * values of a partial update are known too. */
export const createOfferSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(128),
  description: z.string().max(2000).nullish(),
  discountType: discountTypeSchema,
  discountValue: z.number().positive().max(99_999_999.99).transform((value) => value.toFixed(2)),
  appliesTo: appliesToSchema,
  appliesToId: z.string().min(1).max(64).nullish(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((value) => value.toUpperCase())
    .nullish(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  isActive: z.boolean().optional(),
});

/** `slug` is absent on purpose: it is the stable public identifier. */
export const updateOfferSchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    description: z.string().max(2000).nullable(),
    discountType: discountTypeSchema,
    discountValue: z.number().positive().max(99_999_999.99).transform((value) => value.toFixed(2)),
    appliesTo: appliesToSchema,
    appliesToId: z.string().min(1).max(64).nullable(),
    code: z.string().trim().min(1).max(64).transform((value) => value.toUpperCase()).nullable(),
    startsAt: z.coerce.date().nullable(),
    endsAt: z.coerce.date().nullable(),
    isActive: z.boolean(),
  })
  .partial();

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
