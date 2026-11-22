import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import type { BookingAvailabilityCheck } from "../../../lib/admin-bookings";
import { formatLongDate } from "../../../lib/dates";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";

export function AvailabilityResult({
  check,
  compact = false,
}: {
  check: BookingAvailabilityCheck;
  compact?: boolean;
}) {
  const range = `${formatLongDate(check.startDate)} to ${formatLongDate(check.endDate)}`;

  if (check.available) {
    return (
      <div
        className={
          compact
            ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            : "rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"
        }
      >
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          Stock is available
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">
          Every requested unit is free for {range}.
        </p>
        {check.holdExpired ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
            <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            The original hold has lapsed. Confirming now re-checks and re-commits the stock.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center gap-2">
        <AlertTriangle aria-hidden="true" className="size-4" />
        Not enough stock for these dates
      </AlertTitle>
      <AlertDescription>
        <p>
          The request cannot be confirmed for {range}. Shortfalls from the server:
        </p>
        <ul className="mt-2 space-y-1.5">
          {check.shortages.map((line) => (
            <li
              key={line.equipmentId}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg bg-white/60 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium text-red-900">{line.name}</span>
              <span>
                requested {line.requested}, available {line.available} — short by{" "}
                <strong>{line.shortfall}</strong>
              </span>
            </li>
          ))}
        </ul>
        {check.holdExpired ? (
          <p className="mt-2 text-xs font-medium">
            The hold has also expired. Ask the customer to submit a new request or choose
            different dates.
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
