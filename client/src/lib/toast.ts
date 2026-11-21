import { toast } from "sonner";

import { isApiError } from "./api";

export { toast };

/**
 * Shows the server's message for a failed action instead of a generic "something went
 * wrong", so the operator sees the rule that rejected the request.
 */
export function toastError(
  error: unknown,
  fallback = "That did not work. Please try again.",
): void {
  toast.error(isApiError(error) ? error.message : fallback);
}
