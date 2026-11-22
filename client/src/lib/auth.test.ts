import { describe, expect, it } from "vitest";

import { changePasswordFormSchema } from "./auth";

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
