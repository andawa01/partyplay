import { Search, X } from "lucide-react";

import type { BookingListFilters } from "../../../lib/admin-bookings";
import {
  ADMIN_BOOKING_STATUSES,
  adminStatusMeta,
} from "../../../lib/admin-bookings";
import type { BookingStatus } from "../../../lib/bookings";
import { cn } from "../../../lib/cn";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

export function BookingsFilters({
  filters,
  search,
  total,
  counts,
  countsPending,
  isFetching,
  onSearchChange,
  onStatusChange,
  onDateChange,
  onClear,
}: {
  filters: BookingListFilters;
  search: string;
  total: number | undefined;
  counts: Partial<Record<BookingStatus, number>>;
  countsPending: boolean;
  isFetching: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: BookingStatus | undefined) => void;
  onDateChange: (field: "from" | "to", value: string) => void;
  onClear: () => void;
}) {
  const hasFilters = Boolean(filters.status || filters.from || filters.to || filters.q);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="w-full xl:max-w-sm">
          <label htmlFor="booking-search" className="text-xs font-medium text-slate-600">
            Search bookings
          </label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              id="booking-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Code, customer name or phone"
              className="pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[170px_170px_auto] xl:items-end">
          <div>
            <label htmlFor="booking-from" className="text-xs font-medium text-slate-600">
              Rental from
            </label>
            <Input
              id="booking-from"
              type="date"
              value={filters.from ?? ""}
              onChange={(event) => onDateChange("from", event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="booking-to" className="text-xs font-medium text-slate-600">
              Rental to
            </label>
            <Input
              id="booking-to"
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => onDateChange("to", event.target.value)}
              className="mt-1.5"
            />
          </div>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              className="self-end"
            >
              <X aria-hidden="true" className="size-4" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div
          role="group"
          aria-label="Filter by booking status"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <StatusPill
            active={!filters.status}
            onClick={() => onStatusChange(undefined)}
            count={total}
          >
            All
          </StatusPill>
          {ADMIN_BOOKING_STATUSES.map((status) => (
            <StatusPill
              key={status}
              active={filters.status === status}
              onClick={() => onStatusChange(status)}
              count={counts[status]}
            >
              {adminStatusMeta[status].label}
            </StatusPill>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500" aria-live="polite">
          {countsPending
            ? "Loading booking counts…"
            : total === undefined
              ? "Booking counts are unavailable."
              : `${total} booking${total === 1 ? "" : "s"} match these filters.`}
          {isFetching && !countsPending ? (
            <span className="ml-1.5 text-slate-400">Updating…</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}

function StatusPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number | undefined;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2",
        active
          ? "bg-brand-700 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-800",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count ?? "…"}
      </span>
    </button>
  );
}

