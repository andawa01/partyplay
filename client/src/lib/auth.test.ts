import { describe, expect, it } from "vitest";

import {
  changePasswordFormSchema,
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
} from "./auth";

function change(newPassword: string) {
  return changePasswordFormSchema.safeParse({
    currentPassword: "Old-password1",
    newPassword,
    confirmPassword: newPassword,
  });
}

describe("change password form", () => {
  it("accepts a password with all required character classes", () => {
    expect(change("Password1").success).toBe(true);
  });

  it("requires at least 8 characters", () => {
    expect(change("Pass123").success).toBe(false);
  });

  it.each(["PASSWORD1", "password1", "Password"])(
    "rejects %s when a character class is missing",
    (password) => {
      expect(change(password).success).toBe(false);
    },
  );

  it("still requires matching confirmation", () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: "Old-password1",
      newPassword: "Password1",
      confirmPassword: "Password2",
    });
    expect(result.success).toBe(false);
  });
});

describe("forgot password form", () => {
  it("normalises a valid email", () => {
    const result = forgotPasswordFormSchema.safeParse({ email: "  Owner@Example.COM " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("owner@example.com");
    }
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "owner" }).success).toBe(false);
  });
});

describe("reset password form", () => {
  it("accepts a strong matching password", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        newPassword: "Password1",
        confirmPassword: "Password1",
      }).success,
    ).toBe(true);
  });

  it("rejects weak or mismatched passwords", () => {
    expect(
      resetPasswordFormSchema.safeParse({
        newPassword: "password",
        confirmPassword: "password",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordFormSchema.safeParse({
        newPassword: "Password1",
        confirmPassword: "Password2",
      }).success,
    ).toBe(false);
  });
});
