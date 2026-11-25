import type { BookingStatus } from "@prisma/client";

import type { EmailMessage } from "./email";
import { escapeHtml } from "./html";

/**
 * F15 booking emails, as pure copy builders. They take already-read booking facts and
 * return Resend-ready messages, so the wording is testable without a network or a database.
 */

export interface BookingEmailFacts {
  businessName: string;
  code: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  startDate: Date;
  endDate: Date;
  totalAmount: string;
  currency: string;
  statusUrl: string;
  adminUrl?: string;
  holdExpiresAt?: Date | null;
  reason?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

const TIME_ZONE = "Africa/Nairobi";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

function formatAmount(amount: string, currency: string): string {
  const value = Number(amount);
  const formatted = Number.isFinite(value)
    ? value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount;
  return `${currency} ${formatted}`;
}

function dateLine(facts: BookingEmailFacts): string {
  return `${formatDate(facts.startDate)} to ${formatDate(facts.endDate)}`;
}

function contactLine(facts: BookingEmailFacts): string {
  const parts = [facts.contactPhone, facts.contactEmail].filter((value): value is string =>
    Boolean(value?.trim()),
  );
  return parts.length > 0 ? `Questions? Reach us on ${parts.join(" or ")}.` : "";
}

function layout(
  facts: BookingEmailFacts,
  heading: string,
  paragraphs: string[],
  linkLabel = "View booking status",
): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:20px;font-weight:700;color:#0369a1;margin:0 0 20px">${escapeHtml(facts.businessName)}</p>
      <h1 style="font-size:18px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n      ")}
      <p style="margin:28px 0">
        <a href="${escapeHtml(facts.statusUrl)}" style="display:inline-block;background:#0369a1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
          ${escapeHtml(linkLabel)}
        </a>
      </p>
      <p style="color:#475569;font-size:14px">Booking reference: <strong>${escapeHtml(facts.code)}</strong></p>
    </div>
  `;
}

function textFooter(facts: BookingEmailFacts): string[] {
  return [
    "",
    `Booking reference: ${facts.code}`,
    `View booking status: ${facts.statusUrl}`,
    contactLine(facts),
  ].filter((line) => line !== "");
}

/** Customer acknowledgement for a freshly submitted request. */
export function bookingReceivedEmail(facts: BookingEmailFacts): EmailMessage {
  const greeting = `Hi ${facts.customerName},`;
  const total = formatAmount(facts.totalAmount, facts.currency);
  const hold = facts.holdExpiresAt
    ? `We are holding these items until ${formatDateTime(facts.holdExpiresAt)}. After that the request expires and the items are released.`
    : "We are holding these items for a short window while we check availability.";

  const text = [
    greeting,
    "",
    `We received your booking request ${facts.code}.`,
    "",
    `Dates: ${dateLine(facts)}`,
    `Total: ${total}`,
    "",
    hold,
    "",
    "This is a request, not a confirmed booking. We will contact you to confirm availability and the final total.",
    ...textFooter(facts),
  ].join("\n");

  return {
    to: "",
    subject: `We received your booking request ${facts.code}`,
    text,
    html: layout(facts, "Booking request received", [
      escapeHtml(greeting),
      `We received your booking request <strong>${escapeHtml(facts.code)}</strong>.`,
      `Dates: <strong>${escapeHtml(dateLine(facts))}</strong><br />Total: <strong>${escapeHtml(total)}</strong>`,
      escapeHtml(hold),
      "This is a request, not a confirmed booking. We will contact you to confirm availability and the final total.",
    ]),
  };
}

/** The owner alert, so a new request does not wait for someone to open the board. */
export function ownerBookingAlertEmail(facts: BookingEmailFacts): EmailMessage {
  const total = formatAmount(facts.totalAmount, facts.currency);
  const contact = [facts.customerPhone, facts.customerEmail].filter(Boolean).join(" · ");

  const text = [
    `New booking request ${facts.code}`,
    "",
    `Customer: ${facts.customerName}${contact ? ` (${contact})` : ""}`,
    `Dates: ${dateLine(facts)}`,
    `Total: ${total}`,
    facts.holdExpiresAt ? `Hold expires: ${formatDateTime(facts.holdExpiresAt)}` : "",
    "",
    facts.adminUrl ? `Open it: ${facts.adminUrl}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    to: "",
    subject: `New booking request ${facts.code} — ${facts.customerName}`,
    text,
    html: layout(
      { ...facts, statusUrl: facts.adminUrl ?? facts.statusUrl },
      "New booking request",
      [
        `Customer: <strong>${escapeHtml(facts.customerName)}</strong>${contact ? ` (${escapeHtml(contact)})` : ""}`,
        `Dates: <strong>${escapeHtml(dateLine(facts))}</strong><br />Total: <strong>${escapeHtml(total)}</strong>`,
        facts.holdExpiresAt
          ? `Hold expires: <strong>${escapeHtml(formatDateTime(facts.holdExpiresAt))}</strong>`
          : "",
      ].filter(Boolean),
      "Open in the admin",
    ),
  };
}

const STATUS_COPY: Record<
  Extract<BookingStatus, "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED">,
  { heading: string; body: string; subject: (code: string) => string }
> = {
  CONFIRMED: {
    heading: "Your booking is confirmed",
    body: "Your booking is confirmed. We will contact you about delivery or collection before the start date.",
    subject: (code) => `Booking ${code} is confirmed`,
  },
  REJECTED: {
    heading: "Your booking could not be confirmed",
    body: "We could not confirm this booking. If the dates are flexible, send a new request and we will do our best to help.",
    subject: (code) => `Booking ${code} could not be confirmed`,
  },
  CANCELLED: {
    heading: "Your booking has been cancelled",
    body: "This booking has been cancelled. If this was not expected, contact us and we will sort it out.",
    subject: (code) => `Booking ${code} has been cancelled`,
  },
  EXPIRED: {
    heading: "Your booking request has expired",
    body: "The hold window ended before we could confirm this request, so the items were released. Send a new request and we will check availability again.",
    subject: (code) => `Booking ${code} has expired`,
  },
};

/** Customer update when an admin changes status, or the sweeper expires the request. */
export function bookingStatusEmail(
  status: BookingStatus,
  facts: BookingEmailFacts,
): EmailMessage | null {
  if (!(status in STATUS_COPY)) {
    return null;
  }

  const copy = STATUS_COPY[status as keyof typeof STATUS_COPY];
  const greeting = `Hi ${facts.customerName},`;
  const total = formatAmount(facts.totalAmount, facts.currency);
  const reason = facts.reason?.trim();

  const text = [
    greeting,
    "",
    copy.body,
    "",
    `Booking reference: ${facts.code}`,
    `Dates: ${dateLine(facts)}`,
    `Total: ${total}`,
    ...(reason ? ["", `Note from us: ${reason}`] : []),
    ...textFooter(facts),
  ].join("\n");

  return {
    to: "",
    subject: copy.subject(facts.code),
    text,
    html: layout(facts, copy.heading, [
      escapeHtml(greeting),
      escapeHtml(copy.body),
      `Dates: <strong>${escapeHtml(dateLine(facts))}</strong><br />Total: <strong>${escapeHtml(total)}</strong>`,
      ...(reason ? [`Note from us: ${escapeHtml(reason)}`] : []),
    ]),
  };
}
