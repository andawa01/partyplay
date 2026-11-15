import { z } from "zod";

/**
 * Dates travel as `YYYY-MM-DD` strings and are converted in the service with
 * `parseCalendarDate`, which rejects 2026-02-31 instead of rolling it into March.
 * Past dates and an inverted range are also checked there, so the messages stay in one
 * place.
 */
const calendarDate = z.string().trim().min(1).max(32);

/**
 * `?equipmentIds=a,b,c` — one comma-separated parameter, capped so a single request
 * cannot ask for the whole catalogue. Repeats are rejected rather than merged: a client
 * sending the same id twice has a bug worth surfacing.
 */
const equipmentIds = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .transform((value) =>
    value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  )
  .refine((ids) => ids.length > 0 && ids.length <= 50, {
    message: "Provide between 1 and 50 equipment ids",
  })
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "equipmentIds must not repeat an id",
  });

export const availabilityQuerySchema = z.object({
  equipmentIds,
  startDate: calendarDate,
  endDate: calendarDate,
});

export const packageAvailabilityQuerySchema = z.object({
  startDate: calendarDate,
  endDate: calendarDate,
  // 999 is deliberately generous: the endpoint stays informative at absurd quantities
  // instead of rejecting the caller's question.
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const calendarQuerySchema = z.object({
  equipmentId: z.string().trim().min(1).max(64),
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM"),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type PackageAvailabilityQuery = z.infer<typeof packageAvailabilityQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
