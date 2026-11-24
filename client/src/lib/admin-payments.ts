import { z } from "zod";

import type { BookingStatus, PaymentStatus } from "./bookings";

export type PaymentMethod = "MANUAL" | "MPESA" | "BANK_TRANSFER" | "CASH" | "OTHER";

export type PaymentRowStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface PaymentRefund {
  id: string;
  amount: string;
  reason: string;
  reference: string | null;
  refundedAt: string;
  createdAt: string;
  refundedBy: { id: string; name: string | null; email: string } | null;
}

export interface PaymentRow {
  id: string;
  bookingId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentRowStatus;
  providerRef: string | null;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidBy: { id: string; name: string | null; email: string } | null;
  refundedAmount: string;
  refundableAmount: string;
  refunds: PaymentRefund[];
}

export interface BookingPaymentSummary {
  id: string;
  code: string;
  status: BookingStatus;
  totalAmount: string;
  paidAmount: string;
  amountDue: string;
  overpaidBy: string;
  paymentStatus: PaymentStatus;
}

export interface PaymentsMeta {
  total: number;
  paidTotal: string;
  refundedTotal: string;
  booking: BookingPaymentSummary;
}

export interface PaymentMutationResult {
  payment: PaymentRow;
  booking: BookingPaymentSummary;
}

export interface PaymentDeleteResult {
  deletedPaymentId: string;
  booking: BookingPaymentSummary;
}

export const paymentMethodMeta: Record<PaymentMethod, { label: string; hint: string }> = {
  CASH: {
    label: "Cash",
    hint: "Recorded as paid when a paid date is supplied.",
  },
  MPESA: {
    label: "M-Pesa",
    hint: "Record the M-Pesa reference. Paid when a paid date is supplied.",
  },
  BANK_TRANSFER: {
    label: "Bank transfer",
    hint: "Record the transfer reference. Paid when a paid date is supplied.",
  },
  MANUAL: {
    label: "Manual",
    hint: "Starts pending. Mark it paid after the money is confirmed.",
  },
  OTHER: {
    label: "Other",
    hint: "Starts pending. Mark it paid after the money is confirmed.",
  },
};

export const paymentRowStatusMeta: Record<
  PaymentRowStatus,
  { label: string; badge: "warning" | "success" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Pending", badge: "warning" },
  PAID: { label: "Paid", badge: "success" },
  FAILED: { label: "Failed", badge: "destructive" },
  REFUNDED: { label: "Refunded", badge: "secondary" },
};

export function paymentMethodLabel(method: PaymentMethod): string {
  return paymentMethodMeta[method].label;
}

/** A stable, printable reference derived from the payment row's immutable id. */
export function paymentReceiptNumber(payment: Pick<PaymentRow, "id">): string {
  const suffix = payment.id
    .replace(/[^a-z0-9]/gi, "")
    .slice(-8)
    .toUpperCase();
  return `RCPT-${suffix || "PAYMENT"}`;
}

export interface PaymentFormValues {
  amount: string;
  method: PaymentMethod;
  providerRef: string;
  paidAt: string;
  description: string;
}

export const paymentFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter the amount received")
    .refine(
      (value) =>
        /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 99_999_999.99,
      "Use an amount greater than 0 with up to 2 decimals",
    ),
  method: z.enum(["MANUAL", "MPESA", "BANK_TRANSFER", "CASH", "OTHER"]),
  providerRef: z.string().trim().max(128, "Keep the reference to 128 characters"),
  paidAt: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") {
        return true;
      }
      return !Number.isNaN(new Date(value).getTime());
    }, "Enter a valid date and time"),
  description: z.string().trim().max(500, "Keep the note to 500 characters"),
});

export interface PaymentWriteInput {
  amount: number;
  method: PaymentMethod;
  providerRef: string | null;
  paidAt: string | null;
  description: string | null;
}

export function emptyPaymentForm(): PaymentFormValues {
  return {
    amount: "",
    method: "CASH",
    providerRef: "",
    paidAt: nowDateTimeLocal(),
    description: "",
  };
}

export function paymentPayload(values: PaymentFormValues): PaymentWriteInput {
  return {
    amount: Number(values.amount),
    method: values.method,
    providerRef: nullableText(values.providerRef),
    paidAt: toIsoOrNull(values.paidAt),
    description: nullableText(values.description),
  };
}

export interface RefundFormValues {
  amount: string;
  refundedAt: string;
  reference: string;
  reason: string;
}

export const refundFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter the amount refunded")
    .refine(
      (value) =>
        /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 99_999_999.99,
      "Use an amount greater than 0 with up to 2 decimals",
    ),
  refundedAt: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") {
        return true;
      }
      return !Number.isNaN(new Date(value).getTime());
    }, "Enter a valid date and time"),
  reference: z.string().trim().max(128, "Keep the reference to 128 characters"),
  reason: z.string().trim().min(1, "Say why the money was refunded").max(500),
});

export interface RefundWriteInput {
  amount: number;
  refundedAt: string | null;
  reference: string | null;
  reason: string;
}

export function emptyRefundForm(): RefundFormValues {
  return {
    amount: "",
    refundedAt: nowDateTimeLocal(),
    reference: "",
    reason: "",
  };
}

export function refundPayload(values: RefundFormValues): RefundWriteInput {
  return {
    amount: Number(values.amount),
    refundedAt: toIsoOrNull(values.refundedAt),
    reference: nullableText(values.reference),
    reason: values.reason.trim(),
  };
}

export type PaymentEditFormValues = {
  status: "PAID" | "FAILED";
  providerRef: string;
  paidAt: string;
};

export const paymentEditSchema = z.object({
  status: z.enum(["PAID", "FAILED"]),
  providerRef: z.string().trim().max(128, "Keep the reference to 128 characters"),
  paidAt: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") {
        return true;
      }
      return !Number.isNaN(new Date(value).getTime());
    }, "Enter a valid date and time"),
});

export function paymentEditToForm(payment: PaymentRow): PaymentEditFormValues {
  return {
    status: payment.status === "FAILED" ? "FAILED" : "PAID",
    providerRef: payment.providerRef ?? "",
    paidAt: toDateTimeLocal(payment.paidAt),
  };
}

export function paymentEditPayload(values: PaymentEditFormValues): {
  status: "PAID" | "FAILED";
  providerRef: string | null;
  paidAt?: string;
} {
  const payload: {
    status: "PAID" | "FAILED";
    providerRef: string | null;
    paidAt?: string;
  } = {
    status: values.status,
    providerRef: nullableText(values.providerRef),
  };

  if (values.paidAt !== "") {
    const paidAt = toIsoOrNull(values.paidAt);
    if (paidAt) {
      payload.paidAt = paidAt;
    }
  }

  return payload;
}

export function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function nowDateTimeLocal(): string {
  return toDateTimeLocal(new Date().toISOString());
}

function toIsoOrNull(value: string): string | null {
  if (value === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
