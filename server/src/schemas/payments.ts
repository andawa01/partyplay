import { z } from "zod";

/** `PaymentMethod` values; MANUAL and OTHER never auto-approve a payment. */
export const paymentMethodSchema = z.enum([
  "MANUAL",
  "MPESA",
  "BANK_TRANSFER",
  "CASH",
  "OTHER",
]);

/** ISO-8601 date-time string; a bare date is rejected because payments are instants. */
const paidAtSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => !Number.isNaN(Date.parse(value)), "paidAt must be an ISO date-time");

export const createPaymentSchema = z.object({
  amount: z.number().positive().max(99_999_999.99),
  method: paymentMethodSchema,
  providerRef: z.string().trim().max(128).nullish(),
  paidAt: paidAtSchema.nullish(),
  description: z.string().trim().max(500).nullish(),
});

/**
 * A payment can become PAID or FAILED, never back to PENDING: pending is the state a
 * manual payment starts in. At least one field must be supplied.
 */
export const updatePaymentSchema = z
  .object({
    status: z.enum(["PAID", "FAILED"]).optional(),
    providerRef: z.string().trim().max(128).nullish(),
    paidAt: paidAtSchema.nullish(),
  })
  .refine(
    (input) =>
      input.status !== undefined || input.providerRef !== undefined || input.paidAt !== undefined,
    { message: "Provide status, providerRef or paidAt", path: ["status"] },
  );

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
