import { Resend } from "resend";

import { escapeHtml } from "./html";

interface PasswordResetEmail {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresAt: Date;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

/** One transport for every message; the caller decides whether the failure is fatal. */
export async function sendEmail({ to, subject, text, html }: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and MAIL_FROM must be set to send email.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, text, html });

  if (error) {
    throw new Error(`Resend rejected the email: ${error.message}`);
  }
}

/** Sends through Resend; callers deliberately do not expose send failures to the client. */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresAt,
}: PasswordResetEmail): Promise<void> {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
  const safeUrl = escapeHtml(resetUrl);
  const expires = expiresAt.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  });

  await sendEmail({
    to,
    subject: "Reset your PartyPlay admin password",
    text: [
      greeting,
      "",
      "A password reset was requested for your PartyPlay admin account.",
      "",
      `Choose a new password: ${resetUrl}`,
      "",
      `This one-time link expires at ${expires} (30 minutes) and cannot be used twice.`,
      "If you did not request this, ignore this email. Your password will not change.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:20px;font-weight:700;color:#0369a1;margin:0 0 20px">PartyPlay Admin</p>
        <p>${escapeHtml(greeting)}</p>
        <p>A password reset was requested for your PartyPlay admin account.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#0369a1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
            Choose a new password
          </a>
        </p>
        <p>This one-time link expires at <strong>${escapeHtml(expires)}</strong> (30 minutes) and cannot be used twice.</p>
        <p style="color:#475569;font-size:14px">If you did not request this, ignore this email. Your password will not change.</p>
      </div>
    `,
  });
}
