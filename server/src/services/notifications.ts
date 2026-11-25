import type { BookingStatus } from "@prisma/client";

import { db } from "../config/db";
import {
  bookingReceivedEmail,
  bookingStatusEmail,
  ownerBookingAlertEmail,
  type BookingEmailFacts,
} from "../lib/booking-emails";
import { isEmailConfigured, sendEmail, type EmailMessage } from "../lib/email";

/**
 * F15 notifications. Booking lifecycle emails go through the same Resend transport as
 * password resets, and are deliberately best-effort: a mail failure is logged and never
 * turns a successful booking write into an error for the customer or the admin.
 */

export type BookingNotifiable = {
  id: string;
  code: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone?: string | null;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  currency: string;
  holdExpiresAt?: Date | null;
};

type Business = {
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

const DEFAULT_BUSINESS: Business = {
  businessName: "PartyPlay",
  contactEmail: null,
  contactPhone: null,
};

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? process.env.CLIENT_URL ?? "http://localhost:5173").replace(
    /\/+$/,
    "",
  );
}

async function loadBusiness(): Promise<Business> {
  try {
    const settings = await db.siteSetting.findFirst({
      select: { businessName: true, contactEmail: true, contactPhone: true },
    });
    return settings ?? DEFAULT_BUSINESS;
  } catch (error) {
    console.error("[notifications] could not read site settings", error);
    return DEFAULT_BUSINESS;
  }
}

function emailFacts(booking: BookingNotifiable, business: Business): BookingEmailFacts {
  const base = appBaseUrl();

  return {
    businessName: business.businessName,
    code: booking.code,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone ?? null,
    customerEmail: booking.customerEmail,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    statusUrl: `${base}/booking/status`,
    adminUrl: `${base}/admin/bookings/${booking.id}`,
    holdExpiresAt: booking.holdExpiresAt ?? null,
    contactPhone: business.contactPhone,
    contactEmail: business.contactEmail,
  };
}

async function deliver(to: string, message: EmailMessage, label: string): Promise<void> {
  try {
    await sendEmail({ ...message, to });
  } catch (error) {
    console.error(`[notifications] could not send ${label}`, error);
  }
}

/**
 * New request: acknowledge to the customer and alert the business address. Both sends are
 * independent, so one rejection does not suppress the other.
 */
export async function notifyBookingReceived(booking: BookingNotifiable): Promise<void> {
  if (!isEmailConfigured()) {
    return;
  }

  try {
    const business = await loadBusiness();
    const facts = emailFacts(booking, business);
    const tasks: Promise<void>[] = [];

    if (booking.customerEmail) {
      tasks.push(
        deliver(booking.customerEmail, bookingReceivedEmail(facts), `request ${booking.code}`),
      );
    }

    const owner = business.contactEmail?.trim();
    if (owner && owner.toLowerCase() !== booking.customerEmail?.toLowerCase()) {
      tasks.push(deliver(owner, ownerBookingAlertEmail(facts), `owner alert ${booking.code}`));
    }

    await Promise.all(tasks);
  } catch (error) {
    console.error(`[notifications] booking ${booking.code} received notice failed`, error);
  }
}

/** Admin status change: only the statuses a customer needs to hear about produce mail. */
export async function notifyBookingStatusChanged(
  booking: BookingNotifiable,
  status: BookingStatus,
  reason?: string | null,
): Promise<void> {
  if (!isEmailConfigured() || !booking.customerEmail) {
    return;
  }

  try {
    const business = await loadBusiness();
    const message = bookingStatusEmail(status, { ...emailFacts(booking, business), reason });
    if (message) {
      await deliver(booking.customerEmail, message, `${status.toLowerCase()} ${booking.code}`);
    }
  } catch (error) {
    console.error(`[notifications] booking ${booking.code} status notice failed`, error);
  }
}

/** A sweep can expire many bookings at once, so settings are read once and sent in parallel. */
export async function notifyBookingsExpired(bookings: BookingNotifiable[]): Promise<void> {
  if (!isEmailConfigured() || bookings.length === 0) {
    return;
  }

  try {
    const business = await loadBusiness();
    const tasks = bookings
      .filter((booking): booking is BookingNotifiable & { customerEmail: string } =>
        Boolean(booking.customerEmail),
      )
      .map((booking) => {
        const message = bookingStatusEmail("EXPIRED", emailFacts(booking, business));
        return message
          ? deliver(booking.customerEmail, message, `expiry ${booking.code}`)
          : Promise.resolve();
      });

    await Promise.all(tasks);
  } catch (error) {
    console.error("[notifications] expiry notices failed", error);
  }
}
