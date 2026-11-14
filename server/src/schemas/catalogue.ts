import { z } from "zod";

/**
 * Dates are optional; when both are present the listing also reports `available`.
 * Formats are checked in the service with `parseCalendarDate`, which rejects dates that
 * roll over (2026-02-31) instead of silently becoming March.
 */
export const equipmentListQuerySchema = z
  .object({
    category: z.string().trim().min(1).max(64).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    startDate: z.string().trim().min(1).optional(),
    endDate: z.string().trim().min(1).optional(),
  })
  .refine((query) => (query.startDate === undefined) === (query.endDate === undefined), {
    message: "startDate and endDate must be supplied together",
    path: ["startDate"],
  });

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;
