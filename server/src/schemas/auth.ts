import { z } from "zod";

import { emailSchema } from "./common";

export const PASSWORD_MIN_LENGTH = 8;

/** New passwords need three character classes as well as a length floor. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200, "Password must be at most 200 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(200, "Password is too long"),
    newPassword: passwordSchema,
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "This reset link is invalid")
    .max(200, "This reset link is invalid")
    .regex(/^[A-Za-z0-9_-]+$/, "This reset link is invalid"),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
