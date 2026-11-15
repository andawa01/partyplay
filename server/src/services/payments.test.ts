import { describe, expect, it } from "vitest";

import { derivePaymentStatus } from "./payments";

describe("derivePaymentStatus", () => {
  it("is UNPAID with nothing paid", () => {
    expect(derivePaymentStatus(0, 2000)).toBe("UNPAID");
  });

  it("is PARTIALLY_PAID below the total", () => {
    expect(derivePaymentStatus(500, 2000)).toBe("PARTIALLY_PAID");
    expect(derivePaymentStatus(1999.99, 2000)).toBe("PARTIALLY_PAID");
  });

  it("is PAID at exactly the total", () => {
    expect(derivePaymentStatus(2000, 2000)).toBe("PAID");
  });

  it("stays PAID when overpaid", () => {
    expect(derivePaymentStatus(2500, 2000)).toBe("PAID");
  });

  it("treats a zero-total booking with no payment as UNPAID and any payment as PAID", () => {
    expect(derivePaymentStatus(0, 0)).toBe("UNPAID");
    expect(derivePaymentStatus(1, 0)).toBe("PAID");
  });
});
