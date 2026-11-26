import { Loader2, Lock, Send } from "lucide-react";

import type { AvailabilityMeta, AvailabilityRow } from "../../lib/availability";
import type { BookingQuote } from "../../lib/bookings";
import { formatLongDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/error-state";
import { Skeleton } from "../ui/skeleton";
import { BookingSubmitError } from "./BookingSubmitError";

export function BookingEstimate({
  startDate,
  endDate,
  quote,
  quotePending,
  quoteRefreshing,
  quoteError,
  onRetryQuote,
  isRetryingQuote,
  availability,
  availabilityPending,
  availabilityError,
  requiredUnits,
  onRetryAvailability,
  isRetryingAvailability,
  currency,
  canSubmit,
  isSubmitting,
  submitError,
  hasItems,
}: {
  startDate: string;
  endDate: string;
  quote?: BookingQuote;
  quotePending: boolean;
  quoteRefreshing: boolean;
  quoteError: unknown;
  onRetryQuote: () => void;
  isRetryingQuote: boolean;
  availability?: { rows: AvailabilityRow[]; meta?: AvailabilityMeta };
  availabilityPending: boolean;
  availabilityError: unknown;
  requiredUnits: Record<string, number>;
  onRetryAvailability: () => void;
  isRetryingAvailability: boolean;
  currency: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitError: unknown;
  hasItems: boolean;
}) {
  const hasRange = startDate !== "" && endDate !== "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Your estimate</h2>
            <p className="mt-1 text-sm text-slate-600">Calculated on the server.</p>
            {quoteRefreshing ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700"
              >
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                Updating total…
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className="shrink-0 bg-blush-50">
            Estimate
          </Badge>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
          {hasRange ? (
            <>
              <p className="text-sm font-semibold text-slate-900">{formatLongDate(startDate)}</p>
              <p className="text-sm text-slate-600">to {formatLongDate(endDate)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {hasItems ? "Choose your rental dates below." : "Add items to get started."}
            </p>
          )}
        </div>

        {!hasItems || !hasRange ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            {!hasItems
              ? "Select a package or some equipment, then pick dates."
              : "Pick a start and end date to see the estimate and stock check."}
          </p>
        ) : null}

        {hasItems && hasRange ? (
          <div className="mt-4">
            {quotePending ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <span className="sr-only">Calculating the estimate…</span>
              </div>
            ) : null}

            {quoteError ? (
              <ErrorState
                title="The estimate could not load"
                error={quoteError}
                onRetry={onRetryQuote}
                isRetrying={isRetryingQuote}
              />
            ) : null}

            {quote ? (
              <QuoteBreakdown
                quote={quote}
                fallbackCurrency={currency}
                refreshing={quoteRefreshing}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {hasItems && hasRange ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Stock check</h2>
            {availabilityPending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-brand-600" />
            ) : null}
          </div>
          {availabilityError ? (
            <ErrorState
              className="mt-3"
              title="Stock could not be checked"
              error={availabilityError}
              onRetry={onRetryAvailability}
              isRetrying={isRetryingAvailability}
            />
          ) : availabilityPending || !availability ? (
            <div className="mt-3 space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <AvailabilityList rows={availability.rows} requiredUnits={requiredUnits} />
          )}
          {availability?.meta?.note ? (
            <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">
              {availability.meta.note}
            </p>
          ) : null}
        </div>
      ) : null}

      {submitError ? <BookingSubmitError error={submitError} /> : null}

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          isLoading={isSubmitting}
        >
          {isSubmitting ? (
            "Sending request…"
          ) : (
            <>
              <Send aria-hidden="true" className="size-4" />
              Send booking request
            </>
          )}
        </Button>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-700" />
          No payment is taken now. The owner confirms availability, transport and the final total
          before the booking is held.
        </p>
      </div>
    </div>
  );
}

function QuoteBreakdown({
  quote,
  fallbackCurrency,
  refreshing,
}: {
  quote: BookingQuote;
  fallbackCurrency: string;
  refreshing: boolean;
}) {
  const currency = quote.currency || fallbackCurrency;
  const hasLines = quote.packages.length > 0 || quote.items.length > 0;

  return (
    <div>
      <ul className="space-y-2 border-t border-slate-100 pt-4 text-sm">
        {quote.packages.map((pkg) => (
          <li key={pkg.packageId} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-slate-800">
                {pkg.packageName}
                {pkg.quantity > 1 ? ` × ${pkg.quantity}` : ""}
              </p>
              <p className="text-xs text-slate-500">Package</p>
            </div>
            <span className="shrink-0 font-medium text-slate-900">
              {formatMoney(pkg.lineTotal, currency)}
            </span>
          </li>
        ))}
        {quote.items.map((line) => (
          <li key={line.equipmentId} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-slate-800">
                {line.equipmentName}
                {line.quantity > 1 ? ` × ${line.quantity}` : ""}
              </p>
              <p className="text-xs text-slate-500">
                {line.days} day{line.days === 1 ? "" : "s"}
              </p>
            </div>
            <span className="shrink-0 font-medium text-slate-900">
              {formatMoney(line.priceForPeriod, currency)}
            </span>
          </li>
        ))}
      </ul>

      {!hasLines ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          The server returned no chargeable lines. Check the selection and try again.
        </p>
      ) : null}

      <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between gap-3 text-slate-600">
          <dt>Subtotal</dt>
          <dd>{formatMoney(quote.subtotal, currency)}</dd>
        </div>
        {Number(quote.discountAmount) > 0 ? (
          <div className="flex justify-between gap-3 text-blush-700">
            <dt>Discount</dt>
            <dd>−{formatMoney(quote.discountAmount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-slate-600">
          <dt>Transport</dt>
          <dd>Confirmed separately</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
          <dt>Estimated total</dt>
          <dd className={refreshing ? "animate-pulse" : undefined}>
            {formatMoney(quote.totalAmount, currency)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">{quote.notice}</p>
    </div>
  );
}

function AvailabilityList({
  rows,
  requiredUnits,
}: {
  rows: AvailabilityRow[];
  requiredUnits: Record<string, number>;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-600">No stock rows came back for this selection.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-2" aria-live="polite">
      {rows.map((row) => {
        const required = requiredUnits[row.equipmentId] ?? 1;
        const enough = row.available >= required;
        return (
          <li
            key={row.equipmentId}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-700">{row.name}</p>
              <p className="text-xs text-slate-500">
                {row.available} free · {required} needed
              </p>
            </div>
            <Badge variant={enough ? "success" : "destructive"} className="shrink-0">
              {enough ? "Enough" : "Short"}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
