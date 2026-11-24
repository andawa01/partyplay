import { z } from "zod";

import { phoneSchema } from "./common";

export const createTransportProviderSchema = z.object({
  name: z.string().trim().min(1).max(128),
  phone: phoneSchema,
  serviceArea: z.string().trim().max(200).nullish(),
  notes: z.string().max(1000).nullish(),
  isActive: z.boolean().optional(),
});

export const updateTransportProviderSchema = createTransportProviderSchema.partial();

export type CreateTransportProviderInput = z.infer<typeof createTransportProviderSchema>;
export type UpdateTransportProviderInput = z.infer<typeof updateTransportProviderSchema>;
