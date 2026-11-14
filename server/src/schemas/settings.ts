import { z } from "zod";

/** Every field is optional so the settings form can save a partial draft. */
export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(1).max(128),
  contactPhone: z.string().trim().max(32).nullable(),
  contactWhatsApp: z.string().trim().max(32).nullable(),
  contactEmail: z.email().max(254).nullable(),
  address: z.string().trim().max(300).nullable(),
  aboutText: z.string().max(4000).nullable(),
  facebookUrl: z.url().max(2048).nullable(),
  instagramUrl: z.url().max(2048).nullable(),
  tiktokUrl: z.url().max(2048).nullable(),
  xUrl: z.url().max(2048).nullable(),
  defaultDurationDays: z.number().int().min(1).max(365),
  holdMinutes: z.number().int().min(5).max(1440),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
}).partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
