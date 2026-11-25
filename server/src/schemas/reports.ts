import { z } from "zod";

/** Calendar dates; the service defaults to the current Nairobi month when omitted. */
export const reportQuerySchema = z.object({
  from: z.string().trim().min(1).max(10).optional(),
  to: z.string().trim().min(1).max(10).optional(),
});

export const reportExportQuerySchema = reportQuerySchema.extend({
  type: z.enum(["bookings", "payments"]),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
