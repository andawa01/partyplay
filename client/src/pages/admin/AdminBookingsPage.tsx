import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Phone,
  SearchX,
  Store,
  Timer,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  AdminBookingStatusBadge,
  PaymentStatusBadge,
} from "../../components/admin/bookings/BookingStatusBadge";
import { BookingsFilters } from "../../components/admin/bookings/BookingsFilters";
import { Pagination } from "../../components/catalogue/Pagination";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAdminBookingCounts, useAdminBookings } from "../../hooks/use-admin-bookings";
import type { BookingListFilters } from "../../lib/admin-bookings";
import { ADMIN_BOOKING_STATUSES, hasBookingFilters } from "../../lib/admin-bookings";
import type { BookingStatus } from "../../lib/bookings";
import { formatDateTime, formatLongDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";

const PAGE_SIZE = 20;

export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status = ADMIN_BOOKING_STATUSES.includes(rawStatus as BookingStatus)
    ? (rawStatus as BookingStatus)
    : undefined;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const filters: BookingListFilters = {
    status,
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = useAdminBookings(filters);
  const counts = useAdminBookingCounts({
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
  });
  const [search, setSearch] = useState(q);

  const patchParams = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    const term = search.trim();
    if (term === q) {
      return;
    }
    const timer = window.setTimeout(() => {
      patchParams({ q: term || null, page: null }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [patchParams, q, search]);

  const bookings = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageOutOfRange = !list.isPending && total > 0 && page > totalPages;
  const shownFrom = total === 0 || pageOutOfRange ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = pageOutOfRange ? 0 : Math.min(page * PAGE_SIZE, total);
  const filtered = hasBookingFilters(filters);

  function changeStatus(nextStatus: BookingStatus | undefined) {
    patchParams({ status: nextStatus ?? null, page: null });
  }

  function changeDate(field: "from" | "to", value: string) {
    patchParams({ [field]: value || null, page: null });
  }

  function clearFilters() {
    setSearch("");
    patchParams({ status: null, from: null, to: null, q: null, page: null });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            Booking board
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Every request, in one clear board.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Search, filter and open a booking to confirm stock, record a decision or update
            transport. The list is always read from the live API.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Matching", value: counts.total },
              { label: "Pending", value: counts.counts.PENDING },
              { label: "Confirmed", value: counts.counts.CONFIRMED },
              { label: "Completed", value: counts.counts.COMPLETED },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-white"
              >
                <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-xl font-semibold text-slate-900">{item.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <BookingsFilters
        filters={filters}
        search={search}
        total={counts.total}
        counts={counts.counts}
        countsPending={counts.isPending}
        isFetching={list.isFetching || counts.isFetching}
        onSearchChange={setSearch}
        onStatusChange={changeStatus}
        onDateChange={changeDate}
        onClear={clearFilters}
      />

      {list.isError && !list.data ? (
        <ErrorState
          title="The booking board could not load"
          error={list.error}
          onRetry={() => list.refetch()}
          isRetrying={list.isFetching}
        />
      ) : null}

      {list.isError && list.data ? (
        <ErrorState
          title="The board may be out of date"
          error={list.error}
          onRetry={() => list.refetch()}
          isRetrying={list.isFetching}
        />
      ) : null}

      {list.isPending ? (
        <BookingTableSkeleton />
      ) : pageOutOfRange ? (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">That page is past the end</h2>
          <p className="mt-1 text-sm text-slate-600">
            These filters have {totalPages} page{totalPages === 1 ? "" : "s"}.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => patchParams({ page: null })}
          >
            Back to first page
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyBookings filtered={filtered} onClear={clearFilters} />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rental</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fulfilment</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link
                        to={`/admin/bookings/${booking.id}`}
                        className="font-mono text-sm font-semibold text-brand-800 hover:underline"
                      >
                        {booking.code}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(booking.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{booking.customer.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone aria-hidden="true" className="size-3" />
                        {booking.customer.phone ?? "No phone"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-800">{formatLongDate(booking.startDate)}</p>
                      <p className="text-xs text-slate-500">
                        to {formatLongDate(booking.endDate)} · {booking.rentalDays} day
                        {booking.rentalDays === 1 ? "" : "s"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AdminBookingStatusBadge status={booking.status} />
                        <PaymentStatusBadge status={booking.paymentStatus} />
                      </div>
                      {booking.status === "PENDING" && booking.holdExpiresAt ? (
                        <p
                          className={
                            booking.holdExpired
                              ? "mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
                              : "mt-1.5 flex items-center gap-1 text-xs text-slate-500"
                          }
                        >
                          <Timer aria-hidden="true" className="size-3" />
                          {booking.holdExpired ? "Hold expired" : "Hold until"}{" "}
                          {formatDateTime(booking.holdExpiresAt)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">
                        {formatMoney(booking.totalAmount, booking.currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid {formatMoney(booking.paidAmount, booking.currency)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        {booking.fulfilmentMethod === "DELIVERY" ? (
                          <Truck aria-hidden="true" className="size-3.5 text-brand-700" />
                        ) : (
                          <Store aria-hidden="true" className="size-3.5 text-brand-700" />
                        )}
                        {booking.fulfilmentMethod === "DELIVERY" ? "Delivery" : "Collection"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/bookings/${booking.id}`}>
                            View
                            <ArrowRight aria-hidden="true" className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <p aria-live="polite">
                Showing {shownFrom}–{shownTo} of {total} booking
                {total === 1 ? "" : "s"}
              </p>
              <Badge variant="outline">
                Page {page} of {totalPages}
              </Badge>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(nextPage) => patchParams({ page: nextPage <= 1 ? null : String(nextPage) })}
            label="Booking pages"
          />
        </>
      )}
    </div>
  );
}

function EmptyBookings({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
        {filtered ? (
          <SearchX aria-hidden="true" className="size-6" />
        ) : (
          <ClipboardList aria-hidden="true" className="size-6" />
        )}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {filtered ? "No bookings match these filters" : "No bookings yet"}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
        {filtered
          ? "Try a shorter search term, a different status, or a wider rental date range."
          : "New customer requests will appear here as soon as the public booking form is used."}
      </p>
      {filtered ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function BookingTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-4 px-4 py-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
