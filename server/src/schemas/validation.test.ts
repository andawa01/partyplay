import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  PASSWORD_MIN_LENGTH,
  resetPasswordSchema,
} from "./auth";
import { createBookingSchema } from "./bookings";
import { updateSettingsSchema } from "./settings";
import { createTransportProviderSchema } from "./transport-providers";

const booking = {
  customer: { name: "Jane Wanjiku", phone: "0712345678" },
  startDate: "2026-12-01",
  endDate: "2026-12-02",
  packages: [],
  equipment: [{ equipmentId: "equipment-1", quantity: 1 }],
  fulfilmentMethod: "COLLECTION",
  pickupAddress: "PartyPlay shop, Nairobi",
};

describe("phone validation", () => {
  it("accepts exactly 10 digits for a booking", () => {
    expect(createBookingSchema.safeParse(booking).success).toBe(true);
  });

  it.each(["071234567", "07123456789", "+254712345678", "0712 345 678", "07123abc78"])(
    "rejects %s",
    (phone) => {
      const result = createBookingSchema.safeParse({
        ...booking,
        customer: { ...booking.customer, phone },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Phone number must be exactly 10 digits");
      }
    },
  );

  it("applies the same rule to transport providers", () => {
    expect(
      createTransportProviderSchema.safeParse({ name: "Driver", phone: "0712345678" }).success,
    ).toBe(true);
    expect(
      createTransportProviderSchema.safeParse({ name: "Driver", phone: "071234567" }).success,
    ).toBe(false);
  });

  it("applies to configured contact numbers", () => {
    expect(updateSettingsSchema.safeParse({ contactPhone: "0712345678" }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ contactPhone: "071234567" }).success).toBe(false);
  });
});

describe("email validation", () => {
  it("normalises a valid customer email", () => {
    const result = createBookingSchema.safeParse({
      ...booking,
      customer: { ...booking.customer, email: "  Jane@Example.COM " },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customer.email).toBe("jane@example.com");
    }
  });

  it("rejects a malformed customer email", () => {
    const result = createBookingSchema.safeParse({
      ...booking,
      customer: { ...booking.customer, email: "jane.example.com" },
    });
    expect(result.success).toBe(false);
  });

  it("keeps email optional for a booking", () => {
    expect(createBookingSchema.safeParse(booking).success).toBe(true);
  });

  it("validates login and contact emails", () => {
    expect(loginSchema.safeParse({ email: "owner@partyplay.co.ke", password: "secret" }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(
      false,
    );
    expect(updateSettingsSchema.safeParse({ contactEmail: "hello@partyplay.co.ke" }).success).toBe(
      true,
    );
    expect(updateSettingsSchema.safeParse({ contactEmail: "hello" }).success).toBe(false);
  });
});

describe("password validation", () => {
  const change = (newPassword: string) =>
    changePasswordSchema.safeParse({ currentPassword: "old-password", newPassword });

  it("requires at least 8 characters", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(change("Password1").success).toBe(true);
    expect(change("Pass123").success).toBe(false);
  });

  it.each([
    ["PASSWORD1", "Password must include a lowercase letter"],
    ["password1", "Password must include an uppercase letter"],
    ["Password", "Password must include a number"],
  ])("rejects %s when a character class is missing", (password, message) => {
    const result = change(password);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it("caps passwords below bcrypt's 72-byte limit", () => {
    expect(change(`Aa1${"a".repeat(197)}`).success).toBe(true);
    expect(change(`Aa1${"a".repeat(198)}`).success).toBe(false);
  });
});

describe("forgot password validation", () => {
  it("normalises a valid admin email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "  Owner@Example.COM " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("owner@example.com");
    }
  });

  it("rejects a malformed admin email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "owner" }).success).toBe(false);
  });
});

describe("password reset validation", () => {
  const token = "a".repeat(43);

  it("accepts a strong password with a valid token", () => {
    expect(resetPasswordSchema.safeParse({ token, newPassword: "Password1" }).success).toBe(
      true,
    );
  });

  it("rejects malformed tokens and weak passwords", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "short", newPassword: "Password1" }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "not a token", newPassword: "Password1" })
        .success,
    ).toBe(false);
    expect(resetPasswordSchema.safeParse({ token, newPassword: "password" }).success).toBe(
      false,
    );
  });
});
