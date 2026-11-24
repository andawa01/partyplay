import { z } from "zod";

import type { BookingStatus, FulfilmentMethod, PaymentStatus } from "./bookings";

export const ADMIN_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
];

export type AdminBadgeVariant =
  "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export const adminStatusMeta: Record<
  BookingStatus,
  {
    label: string;
    badge: AdminBadgeVariant;
    description: string;
  }
> = {
  PENDING: {
    label: "Pending",
    badge: "warning",
    description: "Waiting for the owner to confirm stock and transport.",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "success",
    description: "Stock is committed and the customer has been accepted.",
  },
  COMPLETED: {
    label: "Completed",
    badge: "success",
    description: "The hire has been delivered or collected and is closed.",
  },
  REJECTED: {
    label: "Rejected",
    badge: "destructive",
    description: "The request was not accepted.",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "destructive",
    description: "The booking was cancelled before or after confirmation.",
  },
  EXPIRED: {
    label: "Expired",
    badge: "warning",
    description: "The hold lapsed before the request was confirmed.",
  },
};

export const paymentStatusMeta: Record<PaymentStatus, { label: string; badge: AdminBadgeVariant }> =
  {
    UNPAID: { label: "Unpaid", badge: "warning" },
    PARTIALLY_PAID: { label: "Part paid", badge: "secondary" },
    PAID: { label: "Paid", badge: "success" },
  };

export interface AdminBookingCustomer {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
}

export interface AdminBookingSummary {
  id: string;
  code: string;
  status: BookingStatus;
  customer: AdminBookingCustomer;
  startDate: string;
  endDate: string;
  rentalDays: number;
  fulfilmentMethod: FulfilmentMethod;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  currency: string;
  holdExpiresAt: string | null;
  holdExpired: boolean;
  createdAt: string;
}

export interface AdminBookingItem {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSlug: string;
  quantity: number;
  days: number;
  unitPrice: string;
  priceForPeriod: string;
}

export interface AdminBookingPackage {
  id: string;
  packageId: string;
  packageName: string;
  packagePrice: string;
  quantity: number;
  lineTotal: string;
  items: Array<{
    equipmentId: string;
    equipmentName: string;
    quantity: number;
  }>;
}

export interface AdminStockHold {
  id: string;
  equipmentId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  releasedAt: string | null;
}

export interface AdminBookingPayment {
  id: string;
  amount: string;
  method: string;
  status: string;
  providerRef: string | null;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminStatusHistoryEntry {
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  reason: string | null;
  note: string | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string } | null;
}

export interface AdminBookingEdit {
  id: string;
  note: string | null;
  previousStartDate: string;
  previousEndDate: string;
  newStartDate: string;
  newEndDate: string;
  previousTotalAmount: string;
  newTotalAmount: string;
  createdAt: string;
  admin: { id: string; name: string | null; email: string } | null;
}

export interface AdminBookingSelection {
  packages: Array<{ packageId: string; quantity: number }>;
  equipment: Array<{ equipmentId: string; quantity: number }>;
}

export interface AdminBookingEditInput extends AdminBookingSelection {
  startDate: string;
  endDate: string;
  note?: string;
}

export interface AdminBookingDetail extends AdminBookingSummary {
  createdBy: { id: string; name: string | null; email: string } | null;
  items: AdminBookingItem[];
  packages: AdminBookingPackage[];
  stockHolds: AdminStockHold[];
  payments: AdminBookingPayment[];
  statusHistory: AdminStatusHistoryEntry[];
  edits: AdminBookingEdit[];
  totals: {
    subtotal: string;
    discountAmount: string;
    transportCharge: string;
    totalAmount: string;
    paidAmount: string;
    amountDue: string;
    overpaidBy: string;
  };
  notes: string | null;
  specialRequests: string | null;
  dropoffAddress: string | null;
  dropoffNotes: string | null;
  pickupAddress: string | null;
  pickupNotes: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  fulfilmentDate: string | null;
  updatedAt: string;
}

export interface BookingAvailabilityShortage {
  equipmentId: string;
  name: string;
  total: number;
  reserved: number;
  blocked?: number;
  available: number;
  maintenance?: boolean;
  requested: number;
  shortfall: number;
}

export interface BookingAvailabilityCheck {
  bookingId: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  holdExpiresAt: string | null;
  holdExpired: boolean;
  available: boolean;
  shortages: BookingAvailabilityShortage[];
}

export interface BookingListFilters {
  status?: BookingStatus;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize?: number;
}

export function adminBookingsPath(filters: BookingListFilters): string {
  const search = new URLSearchParams();
  if (filters.status) {
    search.set("status", filters.status);
  }
  if (filters.from) {
    search.set("from", filters.from);
  }
  if (filters.to) {
    search.set("to", filters.to);
  }
  if (filters.q) {
    search.set("q", filters.q);
  }
  search.set("page", String(filters.page));
  search.set("pageSize", String(filters.pageSize ?? 20));
  return `/api/admin/bookings?${search.toString()}`;
}

export function hasBookingFilters(filters: BookingListFilters): boolean {
  return Boolean(filters.status || filters.from || filters.to || filters.q);
}

export type BookingActionTarget = "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export interface BookingActionOption {
  to: BookingActionTarget;
  label: string;
  shortLabel: string;
  description: string;
  destructive: boolean;
  requiresReason: boolean;
}

const actionOptions: Record<BookingActionTarget, BookingActionOption> = {
  CONFIRMED: {
    to: "CONFIRMED",
    label: "Confirm booking",
    shortLabel: "Confirm",
    description:
      "This commits the stock for the rental dates and tells the customer the request is accepted.",
    destructive: false,
    requiresReason: false,
  },
  REJECTED: {
    to: "REJECTED",
    label: "Reject request",
    shortLabel: "Reject",
    description:
      "The request will be closed and its held stock released. Give the customer a clear reason.",
    destructive: true,
    requiresReason: true,
  },
  CANCELLED: {
    to: "CANCELLED",
    label: "Cancel booking",
    shortLabel: "Cancel",
    description:
      "This closes the booking and releases any held stock. Record why it was cancelled.",
    destructive: true,
    requiresReason: true,
  },
  COMPLETED: {
    to: "COMPLETED",
    label: "Mark completed",
    shortLabel: "Complete",
    description: "Close the hire once everything has been delivered or collected and returned.",
    destructive: false,
    requiresReason: false,
  },
};

/** Only the transitions the server allows are offered. */
export function allowedBookingActions(status: BookingStatus): BookingActionOption[] {
  if (status === "PENDING") {
    return [actionOptions.CONFIRMED, actionOptions.REJECTED, actionOptions.CANCELLED];
  }
  if (status === "CONFIRMED") {
    return [actionOptions.COMPLETED, actionOptions.CANCELLED];
  }
  return [];
}

export interface BookingActionFormValues {
  reason: string;
  note: string;
}

export type BookingActionField = keyof BookingActionFormValues;

export function bookingActionFormSchema(action: BookingActionTarget) {
  const requiresReason = action === "REJECTED" || action === "CANCELLED";

  return z
    .object({
      reason: z.string().trim().max(500, "Keep the reason to 500 characters"),
      note: z.string().trim().max(1000, "Keep the note to 1,000 characters"),
    })
    .superRefine((values, ctx) => {
      if (requiresReason && values.reason === "") {
        ctx.addIssue({
          code: "custom",
          message:
            action === "REJECTED"
              ? "Tell the customer why the request was rejected"
              : "Record why the booking was cancelled",
          path: ["reason"],
        });
      }
    });
}

export interface TransportChargeFormValues {
  transportCharge: string;
}

export const transportChargeSchema = z.object({
  transportCharge: z
    .string()
    .trim()
    .min(1, "Enter the transport charge")
    .refine(
      (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 99_999_999.99,
      "Use a positive number with up to 2 decimals",
    ),
});
