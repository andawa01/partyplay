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

export const createBookingSchema = z
  .object({
    customer: customerSchema,
    startDate: z.string().trim().min(1).max(32),
    endDate: z.string().trim().min(1).max(32),
    fulfilmentMethod: z.enum(["DELIVERY", "COLLECTION"]),
    // D4: delivery needs somewhere to deliver, collection needs somewhere to collect from.
    dropoffAddress: z.string().trim().min(1).max(500).nullish(),
    pickupAddress: z.string().trim().min(1).max(500).nullish(),
    packages: z.array(packageLineSchema).max(20).default([]),
    equipment: z.array(equipmentLineSchema).max(50).default([]),
    notes: z.string().trim().max(2000).nullish(),
    specialRequests: z.string().trim().max(2000).nullish(),
  })
  .superRefine((input, ctx) => {
    if (input.packages.length === 0 && input.equipment.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one package or equipment item",
        path: ["equipment"],
      });
    }

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
  });

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
