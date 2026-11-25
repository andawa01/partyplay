import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  notifyBookingReceived,
  notifyBookingStatusChanged,
  notifyBookingsExpired,
  type BookingNotifiable,
} from "./notifications";

const booking: BookingNotifiable = {
  id: "booking-1",
  code: "PP-ABC123",
  customerName: "Amina",
  customerEmail: "amina@example.test",
  customerPhone: "0712345678",
  startDate: new Date("2026-12-05T00:00:00.000Z"),
  endDate: new Date("2026-12-06T00:00:00.000Z"),
  totalAmount: "1800.00",
  currency: "KES",
  holdExpiresAt: new Date("2026-11-25T10:30:00.000Z"),
};

describe("booking notifications without email configuration", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.MAIL_FROM;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
    if (originalFrom === undefined) {
      delete process.env.MAIL_FROM;
    } else {
      process.env.MAIL_FROM = originalFrom;
    }
  });

  it("skips every notification instead of throwing", async () => {
    await expect(notifyBookingReceived(booking)).resolves.toBeUndefined();
    await expect(notifyBookingStatusChanged(booking, "CONFIRMED", null)).resolves.toBeUndefined();
    await expect(notifyBookingsExpired([booking])).resolves.toBeUndefined();
  });
});
