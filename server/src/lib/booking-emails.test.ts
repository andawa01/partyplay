import { describe, expect, it } from "vitest";

import {
  bookingReceivedEmail,
  bookingStatusEmail,
  ownerBookingAlertEmail,
  type BookingEmailFacts,
} from "./booking-emails";

const facts: BookingEmailFacts = {
  businessName: "PartyPlay",
  code: "PP-7K2M9Q",
  customerName: "Amina",
  customerPhone: "0712345678",
  startDate: new Date("2026-12-05T00:00:00.000Z"),
  endDate: new Date("2026-12-06T00:00:00.000Z"),
  totalAmount: "1800.00",
  currency: "KES",
  statusUrl: "https://partyplay.test/booking/status",
  adminUrl: "https://partyplay.test/admin/bookings/abc",
  holdExpiresAt: new Date("2026-11-25T10:30:00.000Z"),
  contactEmail: "hello@partyplay.test",
  contactPhone: "0700000000",
};

describe("booking emails", () => {
  it("acknowledges a request with the reference, dates and hold window", () => {
    const message = bookingReceivedEmail(facts);

    expect(message.subject).toContain("PP-7K2M9Q");
    expect(message.text).toContain("Amina");
    expect(message.text).toContain("KES 1,800.00");
    expect(message.text).toContain("5 Dec 2026 to 6 Dec 2026");
    expect(message.text).toContain("holding these items until");
    expect(message.text).toContain(facts.statusUrl);
    expect(message.html).toContain(facts.statusUrl);
    expect(message.text).toContain("not a confirmed booking");
  });

  it("alerts the business with the admin link", () => {
    const message = ownerBookingAlertEmail(facts);

    expect(message.subject).toContain("New booking request PP-7K2M9Q");
    expect(message.text).toContain("Amina (0712345678)");
    expect(message.text).toContain(facts.adminUrl);
    expect(message.html).toContain(facts.adminUrl);
  });

  it.each([
    ["CONFIRMED", "is confirmed"],
    ["REJECTED", "could not be confirmed"],
    ["CANCELLED", "has been cancelled"],
    ["EXPIRED", "has expired"],
  ] as const)("writes the %s update to the customer", (status, subjectPart) => {
    const message = bookingStatusEmail(status, { ...facts, reason: "Dates were taken" });

    expect(message).not.toBeNull();
    expect(message?.subject).toContain(subjectPart);
    expect(message?.text).toContain("Dates were taken");
    expect(message?.text).toContain("PP-7K2M9Q");
  });

  it("does not mail statuses the customer does not need", () => {
    expect(bookingStatusEmail("COMPLETED", facts)).toBeNull();
  });

  it("escapes customer-supplied text in HTML", () => {
    const message = bookingStatusEmail("REJECTED", {
      ...facts,
      customerName: "<script>alert(1)</script>",
      reason: 'No stock for "those" dates',
    });

    expect(message?.html).not.toContain("<script>");
    expect(message?.html).toContain("&lt;script&gt;");
    expect(message?.html).toContain("&quot;those&quot;");
  });
});
