import { z } from "zod";

import type { AdminRole } from "./auth";
import { emailFieldSchema } from "./auth";

export type StaffRole = AdminRole;

export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const staffRoleOptions: Array<{ value: StaffRole; label: string; hint: string }> = [
  {
    value: "STAFF",
    label: "Staff",
    hint: "Bookings and dashboard. No payments, catalogue or settings changes.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    hint: "Everything day to day, including payments and the catalogue. No team management.",
  },
  {
    value: "OWNER",
    label: "Owner",
    hint: "Full access, including adding and disabling team accounts.",
  },
];

const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Use 200 characters or fewer")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

export const createStaffFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120, "Name is too long"),
  email: emailFieldSchema,
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
  password: newPasswordSchema,
});

export type CreateStaffFormValues = z.infer<typeof createStaffFormSchema>;

export const setStaffPasswordFormSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm the new password"),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });

export type SetStaffPasswordFormValues = z.infer<typeof setStaffPasswordFormSchema>;

export function staffDisplayName(member: Pick<StaffMember, "name" | "email">): string {
  return member.name?.trim() || member.email;
}

export function roleLabel(role: StaffRole): string {
  return role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Staff";
}
