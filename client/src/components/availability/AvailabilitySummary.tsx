import { CalendarCheck, CalendarX, Check, RefreshCw } from "lucide-react";

import type {
  AvailabilityMeta,
  AvailabilityRow,
  PackageAvailabilityResponse,
} from "../../lib/availability";
import { countCalendarDays, formatLongDate } from "../../lib/dates";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/error-state";
import { Skeleton } from "../ui/skeleton";

export function AvailabilitySummary({
  startDate,
  endDate,
  isPending,
  isError,
  error,
  rows,
  meta,
  packageAvailability,
  onRetry,
  isRetrying,
  onClear,
}: {
  startDate: string;
  endDate: string;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  rows?: AvailabilityRow[];
  meta?: AvailabilityMeta;
  packageAvailability?: PackageAvailabilityResponse;
  onRetry: () => void;
  isRetrying: boolean;
  onClear?: () => void;
}) {
  const hasRange = startDate !== "" && endDate !== "";
  const nights = hasRange ? countCalendarDays(startDate, endDate) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Your dates</h2>
          <p className="mt-1 text-sm text-slate-600">
            Availability is checked against the live booking diary.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"
        >
          <CalendarCheck className="size-5" />
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
        {hasRange ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {formatLongDate(startDate)}
              </p>
              <p className="text-sm text-slate-600">to {formatLongDate(endDate)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge variant="secondary">
                {nights} day{nights === 1 ? "" : "s"}
              </Badge>
              {onClear ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={onClear}
                  className="h-auto p-0 text-xs"
                >
                  Clear dates
                </Button>
              ) : null}
            </div>
          </div>
        ) : startDate !== "" ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Starting {formatLongDate(startDate)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Choose the last day of your hire on the calendar.
              </p>
            </div>
            {onClear ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={onClear}
                className="h-auto shrink-0 p-0 text-xs"
              >
                Clear
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Select a start and end date to see what is free.
          </p>
        )}
      </div>

      {hasRange ? (
        <div className="mt-4">
          {isPending ? (
            <div className="space-y-2" aria-live="polite">
              <p className="text-sm font-medium text-slate-600">
                Checking the booking diary…
              </p>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : null}

          {isError ? (
            <ErrorState
              title="Those dates could not be checked"
              error={error}
              onRetry={onRetry}
              isRetrying={isRetrying}
              className="text-left"
            />
          ) : null}

          {packageAvailability ? (
            <PackageResult availability={packageAvailability} />
          ) : null}

          {rows && rows.length > 0 ? (
            <div className="space-y-2" aria-live="polite">
              {rows.map((row) => {
                const available = row.available > 0;
                return (
                  <div
                    key={row.equipmentId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.available} of {row.total} unit{row.total === 1 ? "" : "s"} free
                      </p>
                    </div>
                    <Badge variant={available ? "success" : "destructive"} className="shrink-0">
                      {available ? "Available" : "Fully booked"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!isPending && !isError && rows?.length === 0 && !packageAvailability ? (
            <p className="text-sm text-slate-600">
              No availability rows came back for these dates.
            </p>
          ) : null}

          {!isPending && !isError && (Boolean(rows?.length) || Boolean(packageAvailability)) ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-slate-500">
                {meta?.note ??
                  "Informational only: availability is re-checked when the request is sent."}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                aria-busy={isRetrying}
                className="shrink-0"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={isRetrying ? "size-3.5 animate-spin" : "size-3.5"}
                />
                {isRetrying ? "Checking…" : "Check again"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PackageResult({ availability }: { availability: PackageAvailabilityResponse }) {
  const isBookable = availability.bookable;
  const itemCount = availability.items.length;

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
        <span
          aria-hidden="true"
          className={
            isBookable
              ? "grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : "grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-700 ring-1 ring-red-100"
          }
        >
          {isBookable ? <Check className="size-4" /> : <CalendarX className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {isBookable
              ? `Available ${formatLongDate(availability.startDate)} to ${formatLongDate(
                  availability.endDate,
                )}`
              : "Fully booked for these dates"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {availability.minAvailable} whole package
            {availability.minAvailable === 1 ? "" : "s"} could fit
            {isBookable ? " — one is enough for this request." : "."}
          </p>
        </div>
      </div>

      {itemCount > 0 ? (
        <ul className="space-y-2">
          {availability.items.map((item) => {
            const enough = item.shortfall === 0;
            return (
              <li
                key={item.equipmentId}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Needs {item.required}, {item.available} free
                  </p>
                </div>
                <Badge
                  variant={enough ? "success" : "destructive"}
                  className="shrink-0"
                >
                  {enough
                    ? "Enough"
                    : item.available === 0
                      ? "None free"
                      : `Short by ${item.shortfall}`}
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
