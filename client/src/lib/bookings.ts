import { z } from "zod";

import { isValidCalendarDate } from "./dates";

export interface BookingPackageLine {
  packageId: string;
  quantity: number;
}

export interface BookingEquipmentLine {
  equipmentId: string;
  quantity: number;
}

export interface BookingQuoteRequest {
  startDate: string;
  endDate: string;
  packages: BookingPackageLine[];
  equipment: BookingEquipmentLine[];
}

export interface QuoteEquipmentLine {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  days: number;
  unitPrice: string;
  priceForPeriod: string;
}

export interface QuotePackageLine {
  packageId: string;
  packageName: string;
  packagePrice: string;
  quantity: number;
  lineTotal: string;
  items: Array<{ equipmentId: string; equipmentName: string; quantity: number }>;
}

export interface BookingQuote {
  startDate: string;
  endDate: string;
  rentalDays: number;
  currency: string;
  items: QuoteEquipmentLine[];
  packages: QuotePackageLine[];
  subtotal: string;
  discountAmount: string;
  transportCharge: string;
  totalAmount: string;
  notice: string;
}

export interface CreatedBooking extends BookingQuote {
  code: string;
  status: string;
  fulfilmentMethod: "DELIVERY" | "COLLECTION";
  holdMinutes: number;
  holdExpiresAt: string;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/** The public lookup response. Contact details arrive masked, and internal ids never do. */
export interface PublicBooking {
  code: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  rentalDays: number;
  fulfilmentMethod: "DELIVERY" | "COLLECTION";
  customer: { name: string; phone: string | null };
  items: Array<{
    equipmentName: string;
    quantity: number;
    days: number;
    unitPrice: string;
    priceForPeriod: string;
  }>;
  packages: Array<{
    packageName: string;
    packagePrice: string;
    quantity: number;
    lineTotal: string;
    items: Array<{ equipmentName: string; quantity: number }>;
  }>;
  subtotal: string;
  discountAmount: string;
  transportCharge: string;
  totalAmount: string;
  amountDue: string;
  paymentDue: boolean;
  paymentStatus: PaymentStatus;
  currency: string;
  notes: string | null;
  specialRequests: string | null;
  dropoffAddress: string | null;
  pickupAddress: string | null;
  holdExpiresAt: string | null;
  holdExpired: boolean;
  createdAt: string;
  notice: string | null;
}

export interface CreateBookingRequest extends BookingQuoteRequest {
  customer: { name: string; phone: string; email?: string };
  fulfilmentMethod: "DELIVERY" | "COLLECTION";
  dropoffAddress?: string;
  pickupAddress?: string;
  notes?: string;
}

export type FulfilmentMethod = "DELIVERY" | "COLLECTION";

/** Local form failures are not network errors; the alert copy must tell them apart. */
export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

export const bookingDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Tell us your name").max(120, "Use 120 characters or fewer"),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a phone number we can reach you on")
      .max(20, "Use 20 characters or fewer")
      .regex(
        /^[0-9+\-()\s]+$/,
        "Use digits, spaces, +, -, or parentheses only",
      ),
    email: z
      .string()
      .trim()
      .max(254, "Use 254 characters or fewer")
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "Enter a valid email address or leave it blank",
      }),
    fulfilmentMethod: z.enum(["DELIVERY", "COLLECTION"]),
    dropoffAddress: z.string().trim().max(500, "Use 500 characters or fewer"),
    pickupAddress: z.string().trim().max(500, "Use 500 characters or fewer"),
    notes: z.string().trim().max(2000, "Use 2,000 characters or fewer"),
  })
  .superRefine((input, ctx) => {
    if (input.fulfilmentMethod === "DELIVERY" && input.dropoffAddress === "") {
      ctx.addIssue({
        code: "custom",
        message: "Where should we deliver the setup?",
        path: ["dropoffAddress"],
      });
    }
    if (input.fulfilmentMethod === "COLLECTION" && input.pickupAddress === "") {
      ctx.addIssue({
        code: "custom",
        message: "Where will the items be collected from?",
        path: ["pickupAddress"],
      });
    }
  });

export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

/** Local field names are flatter than the API's nested paths. */
const serverFieldMap: Record<string, keyof BookingDetails> = {
  "customer.name": "name",
  "customer.phone": "phone",
  "customer.email": "email",
  "fulfilmentMethod": "fulfilmentMethod",
  dropoffAddress: "dropoffAddress",
  pickupAddress: "pickupAddress",
  notes: "notes",
};

export function serverFieldErrors(details: unknown): Partial<Record<keyof BookingDetails, string>> {
  const errors: Partial<Record<keyof BookingDetails, string>> = {};
  if (!details || typeof details !== "object" || !("fieldErrors" in details)) {
    return errors;
  }
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return errors;
  }

  for (const [path, messages] of Object.entries(fieldErrors)) {
    const field = serverFieldMap[path];
    if (field && Array.isArray(messages) && typeof messages[0] === "string") {
      errors[field] = messages[0];
    }
  }
  return errors;
}

export function hasValidRentalDates(startDate: string, endDate: string): boolean {
  return (
    isValidCalendarDate(startDate) &&
    isValidCalendarDate(endDate) &&
    startDate !== "" &&
    endDate !== "" &&
    startDate <= endDate
  );
}
