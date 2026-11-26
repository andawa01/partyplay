import { toast } from "sonner";

import { isApiError, type ApiError } from "./api";

export { toast };

/** Marks an error once it has been shown, so the global and local handlers do not double-toast. */
interface ToastableError {
  __toasted?: boolean;
}

function alreadyToasted(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as ToastableError).__toasted === true
  );
}

function markToasted(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    (error as ToastableError).__toasted = true;
  }
}

/** The first human-readable string inside a validation `details` payload. */
function firstDetailMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstDetailMessage(entry);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    for (const entry of Object.values(value)) {
      const found = firstDetailMessage(entry);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Prefer the specific field message the server put in `details` (for example "Phone
 * number must be exactly 10 digits") over the generic "Invalid input" headline.
 */
export function apiErrorMessage(error: unknown): string | null {
  if (!isApiError(error)) return null;

  const apiError: ApiError = error;
  if (apiError.code === "VALIDATION_ERROR") {
    const detail = firstDetailMessage(apiError.details);
    if (detail && detail !== apiError.message) return detail;
  }
  return apiError.message;
}

/**
 * Shows the server's message for a failed action instead of a generic "something went
 * wrong", so the operator sees the rule that rejected the request. Repeated handlers on
 * the same error are ignored.
 */
export function toastError(
  error: unknown,
  fallback = "That did not work. Please try again.",
): void {
  if (alreadyToasted(error)) return;
  markToasted(error);
  toast.error(apiErrorMessage(error) ?? fallback);
}
