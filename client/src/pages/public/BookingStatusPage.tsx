import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Loader2,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  BookingStatusView,
  bookingStatusLabel,
} from "../../components/booking/BookingStatusView";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { useBookingLookup } from "../../hooks/use-bookings";
import { isApiError } from "../../lib/api";

export default function BookingStatusPage() {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const lookup = useBookingLookup();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const isNotFound = isApiError(lookup.error) && lookup.error.status === 404;
  const isRateLimited = isApiError(lookup.error) && lookup.error.status === 429;
  const liveMessage = lookup.isPending
    ? "Looking up your booking…"
    : isNotFound
      ? "No booking matches that code."
      : lookup.error
        ? "The booking could not be loaded."
        : lookup.data
          ? `Booking ${lookup.data.code}: ${bookingStatusLabel(lookup.data.status)}.`
          : "";

  useEffect(() => {
    if (lookup.isPending || lookup.submittedAt === 0) {
      return;
    }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    resultRef.current?.scrollIntoView({ behavior, block: "start" });
  }, [lookup.isPending, lookup.submittedAt]);

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase());
    setCodeError("");
    // A new code should never sit underneath the previous booking's result.
    if (lookup.data || lookup.error) {
      lookup.reset();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized === "") {
      setCodeError("Enter the booking code from your confirmation.");
      inputRef.current?.focus();
      return;
    }

    setCode(normalized);
    setCodeError("");
    lookup.mutate(normalized);
  }

  function refresh() {
    const normalized = code.trim().toUpperCase();
    if (normalized !== "") {
      lookup.mutate(normalized);
    }
  }

  return (
    <div className="pb-16">
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 px-6 py-10 ring-1 ring-blush-100 sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-blush-200/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-brand-100/70 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-100">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Booking status
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Your booking, at a glance
              </h1>
              <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
                Enter the reference from your confirmation to see the latest status, your
                dates, the items you requested and what happens next.
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  No account or password needed.
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  The code is never added to the page address.
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  Contact details are shown masked for privacy.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg shadow-brand-900/5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <ClipboardCheck aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">Find your booking</h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Use the code from your booking confirmation.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5" noValidate>
                <Label htmlFor="booking-status-code">Booking code</Label>
                <div className="relative mt-1.5">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    ref={inputRef}
                    id="booking-status-code"
                    value={code}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    placeholder="PP-XXXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={32}
                    disabled={lookup.isPending}
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={
                      codeError ? "booking-status-code-error" : "booking-status-code-hint"
                    }
                    className="h-12 pl-9 font-mono text-base font-semibold uppercase tracking-[0.14em]"
                  />
                </div>
                {codeError ? (
                  <p
                    id="booking-status-code-error"
                    className="mt-1.5 text-xs font-medium text-red-600"
                  >
                    {codeError}
                  </p>
                ) : (
                  <p id="booking-status-code-hint" className="mt-1.5 text-xs text-slate-500">
                    It looks like <span className="font-mono">PP-XXXXXX</span> and has nine
                    characters including the dash.
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={lookup.isPending}
                  aria-busy={lookup.isPending}
                >
                  {lookup.isPending ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Looking up your booking…
                    </>
                  ) : (
                    <>
                      <Search aria-hidden="true" className="size-4" />
                      Find booking
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-3 text-center text-xs text-slate-500">
                Codes are not case-sensitive. Spaces around the code are ignored.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-6xl px-4">
        <div ref={resultRef} aria-busy={lookup.isPending} className="scroll-mt-6">
          <p className="sr-only" role="status">
            {liveMessage}
          </p>

          {lookup.isPending && !lookup.data ? <BookingStatusSkeleton /> : null}

          {isNotFound ? <BookingNotFound code={code.trim().toUpperCase()} /> : null}

          {lookup.error && !isNotFound ? (
            <div className="mx-auto max-w-2xl">
              <ErrorState
                title={isRateLimited ? "Too many lookups" : "The booking could not load"}
                error={lookup.error}
                onRetry={isRateLimited ? undefined : refresh}
                isRetrying={lookup.isPending}
              />
              {isRateLimited ? (
                <p className="mt-2 text-sm text-slate-600">
                  Please wait a few minutes before checking again.
                </p>
              ) : null}
            </div>
          ) : null}

          {lookup.data && !lookup.error ? (
            <BookingStatusView
              booking={lookup.data}
              onRefresh={refresh}
              isRefreshing={lookup.isPending}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingStatusSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="grid gap-3 pt-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <span className="sr-only">Looking up your booking…</span>
      </div>
    </div>
  );
}

function BookingNotFound({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
        <SearchX aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        We could not find that booking
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Check the code and try again.{" "}
        {code ? (
          <>
            We looked for <span className="font-mono font-semibold text-slate-800">{code}</span>.
          </>
        ) : null}{" "}
        The reference should look like <span className="font-mono">PP-XXXXXX</span>.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/booking">Start a new request</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/contact">
            Contact us
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      </div>
      <p className="mt-5 text-xs text-slate-500">
        Double-check the code from your confirmation, or contact us if it still does not work.
      </p>
    </div>
  );
}
