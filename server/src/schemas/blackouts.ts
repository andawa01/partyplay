import { z } from "zod";

/** Calendar dates are parsed and checked in the service so invalid dates share one message. */
export const createBlackoutSchema = z.object({
  equipmentId: z.string().trim().min(1).max(64),
  startDate: z.string().trim().min(1).max(32),
  endDate: z.string().trim().min(1).max(32),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});

export type CreateBlackoutInput = z.infer<typeof createBlackoutSchema>;
