import { z } from "zod";

export type AdminRole = "OWNER" | "STAFF";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}export const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .pipe(z.email("Enter a valid email address"));

export const loginFormSchema = z.object({
  email: emailFieldSchema,
  password: z.string().min(1, "Enter your password").max(200, "Password is too long"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: emailFieldSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Use 200 characters or fewer")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .superRefine((input, ctx) => {
    if (input.newPassword !== input.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "The new passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (input.currentPassword === input.newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a password different from your current one",
        path: ["newPassword"],
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .superRefine((input, ctx) => {
    if (input.newPassword !== input.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "The new passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

/**
 * Only return to an admin path supplied by the guard. The value comes from router state,
 * but treating it as untrusted keeps a crafted `from` from turning login into an open
 * redirect.
 */
export function adminReturnPath(from: unknown): string {
  if (!from || typeof from !== "object") {
    return "/admin/dashboard";
  }

  const pathname = "pathname" in from ? from.pathname : undefined;
  if (
    typeof pathname !== "string" ||
    (pathname !== "/admin" && !pathname.startsWith("/admin/")) ||
    pathname === "/admin/login"
  ) {
    return "/admin/dashboard";
  }

  const search =
    "search" in from && typeof from.search === "string" && from.search.startsWith("?")
      ? from.search
      : "";
  const hash =
    "hash" in from && typeof from.hash === "string" && from.hash.startsWith("#")
      ? from.hash
      : "";

  return `${pathname}${search}${hash}`;
}
