import { AlertCircle } from "lucide-react";

import { isApiError } from "../../lib/api";
import { BookingValidationError } from "../../lib/bookings";

export function BookingSubmitError({ error }: { error: unknown }) {
  const shortages =
    isApiError(error) && error.code === "CONFLICT" ? extractShortages(error.details) : [];

  const isLocalValidation = error instanceof BookingValidationError;
  const isValidation =
    isLocalValidation || (isApiError(error) && error.code === "VALIDATION_ERROR");

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
    >
      <div className="flex gap-2">
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">
            {isApiError(error) && error.status === 429
              ? "Too many requests"
              : isApiError(error) && error.code === "CONFLICT"
                ? "Someone took the last unit"
                : isLocalValidation
                  ? "Check the request"
                  : isValidation
                    ? "Check the highlighted fields"
                    : "The request was not sent"}
          </p>
          <p className="mt-1 leading-relaxed">
            {isLocalValidation
              ? error.message
              : isValidation
                ? "Some details need attention before the request can be sent."
                : isApiError(error)
                  ? error.message
                  : "Nothing was submitted. Check your connection and try again."}
          </p>
          {shortages.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {shortages.map((shortage) => (
                <li key={shortage.name}>
                  {shortage.name}: {shortage.shortfall} more needed
                </li>
              ))}
            </ul>
          ) : null}
          {isApiError(error) && error.status === 429 ? (
            <p className="mt-2 text-xs">
              Please wait a few minutes before sending another request.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function extractShortages(details: unknown): Array<{ name: string; shortfall: number }> {
  if (!details || typeof details !== "object" || !("shortages" in details)) {
    return [];
  }
  const shortages = (details as { shortages?: unknown }).shortages;
  if (!Array.isArray(shortages)) {
    return [];
  }
  return shortages.flatMap((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      "name" in entry &&
      "shortfall" in entry &&
      typeof entry.name === "string" &&
      typeof entry.shortfall === "number"
    ) {
      return [{ name: entry.name, shortfall: entry.shortfall }];
    }
    return [];
  });
}
