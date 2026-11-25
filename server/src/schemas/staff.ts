import { z } from "zod";

import { emailSchema } from "./common";
import { passwordSchema } from "./auth";

export const staffRoleSchema = z.enum(["OWNER", "ADMIN", "STAFF"]);

const nameSchema = z.string().trim().min(1, "Enter a name").max(120, "Name is too long");

export const createStaffSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: staffRoleSchema.default("STAFF"),
  password: passwordSchema,
});

export const updateStaffSchema = z
  .object({
    name: nameSchema.optional(),
    role: staffRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.role !== undefined || input.isActive !== undefined,
    { message: "Send at least one change" },
  );

export const setStaffPasswordSchema = z.object({
  password: passwordSchema,
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type SetStaffPasswordInput = z.infer<typeof setStaffPasswordSchema>;
