import { z } from "zod";

/**
 * Public guest booking request (F6b). Prices are deliberately absent: the server prices
 * from the database, so a tampered body cannot change what anything costs.
 */

/** D7: phone is required for guests (7–20 characters, digits and the usual separators). */
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[0-9+\-()\s]+$/, "phone may only contain digits, +, -, ( ), and spaces");

const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.email().max(254).optional(),
});

const equipmentLineSchema = z.object({
  equipmentId: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(999),
});

const packageLineSchema = z.object({
  packageId: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(50),
});

const bookingRangeSchema = {
  startDate: z.string().trim().min(1).max(32),
  endDate: z.string().trim().min(1).max(32),
  packages: z.array(packageLineSchema).max(20).default([]),
  equipment: z.array(equipmentLineSchema).max(50).default([]),
};

function addSelectionIssues(
  input: { packages: Array<{ packageId: string }>; equipment: Array<{ equipmentId: string }> },
  ctx: z.RefinementCtx,
): void {
  if (input.packages.length === 0 && input.equipment.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Add at least one package or equipment item",
      path: ["equipment"],
    });
  }

  addDuplicateIssues(
    input.packages.map((line) => line.packageId),
    "packages",
    ctx,
  );
  addDuplicateIssues(
    input.equipment.map((line) => line.equipmentId),
    "equipment",
    ctx,
  );
}

export const createBookingSchema = z
  .object({
    customer: customerSchema,
    ...bookingRangeSchema,
    fulfilmentMethod: z.enum(["DELIVERY", "COLLECTION"]),
    // D4: delivery needs somewhere to deliver, collection needs somewhere to collect from.
    dropoffAddress: z.string().trim().min(1).max(500).nullish(),
    pickupAddress: z.string().trim().min(1).max(500).nullish(),
    notes: z.string().trim().max(2000).nullish(),
    specialRequests: z.string().trim().max(2000).nullish(),
  })
  .superRefine((input, ctx) => {
    addSelectionIssues(input, ctx);

    if (input.fulfilmentMethod === "DELIVERY" && !input.dropoffAddress) {
      ctx.addIssue({
        code: "custom",
        message: "dropoffAddress is required when the booking is delivered",
        path: ["dropoffAddress"],
      });
    }

    if (input.fulfilmentMethod === "COLLECTION" && !input.pickupAddress) {
      ctx.addIssue({
        code: "custom",
        message: "pickupAddress is required when the customer collects",
        path: ["pickupAddress"],
      });
    }
  });

/**
 * A read-only estimate: the same dates and lines as a booking, without customer or
 * fulfilment details. A customer should be able to see the price before typing any
 * personal information, and the price must come from the same pricing service the
 * create transaction uses.
 */
export const quoteBookingSchema = z
  .object(bookingRangeSchema)
  .superRefine(addSelectionIssues);

function addDuplicateIssues(
  ids: string[],
  path: "packages" | "equipment",
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  if (duplicates.size > 0) {
    ctx.addIssue({
      code: "custom",
      message: `Each ${path === "packages" ? "package" : "equipment item"} may appear only once; increase its quantity instead`,
      path: [path],
    });
  }
}

/**
 * The booking code is the capability. Its PP-XXXXXX shape is checked in the service so a
 * malformed code and an unknown one produce the same 404 instead of two behaviours.
 */
export const bookingCodeParamsSchema = z.object({
  code: z.string().trim().min(1).max(32),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type QuoteBookingInput = z.infer<typeof quoteBookingSchema>;

// ---------------------------------------------------------------------------
// Admin operations (F8)
// ---------------------------------------------------------------------------

/**
 * `from`/`to` are the requested rental window and are matched by overlap, the same rule
 * availability uses. The service parses them as calendar dates and rejects an inversion.
 */
export const adminBookingListQuerySchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED", "EXPIRED"])
    .optional(),
  from: z.string().trim().min(1).max(32).optional(),
  to: z.string().trim().min(1).max(32).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Every status is accepted by the schema so an illegal target (EXPIRED, PENDING) gets the
 * documented 409 INVALID_TRANSITION from the guard, not a generic 400.
 */
export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED", "EXPIRED"]),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const updateBookingTransportSchema = z.object({
  transportCharge: z.number().min(0).max(99_999_999.99),
});

export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type UpdateBookingTransportInput = z.infer<typeof updateBookingTransportSchema>;
