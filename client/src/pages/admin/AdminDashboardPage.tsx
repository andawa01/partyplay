import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  RefreshCw,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  AdminBookingStatusBadge,
  PaymentStatusBadge,
} from "../../components/admin/bookings/BookingStatusBadge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { useAdminSession } from "../../hooks/use-auth";
import { useAdminDashboard } from "../../hooks/use-admin-dashboard";
import { formatDateTime, formatLongDate, formatMonthLabel } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cn } from "../../lib/cn";

export default function AdminDashboardPage() {
  const session = useAdminSession();
  const dashboard = useAdminDashboard();
  const displayName = session.data?.name?.trim() || "there";

  if (dashboard.isPending) {
    return <DashboardSkeleton />;
  }

  if (dashboard.isError && !dashboard.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState
          title="The dashboard could not load"
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
          isRetrying={dashboard.isFetching}
        />
      </div>
    );
  }

  const data = dashboard.data;
  if (!data) {
    return <DashboardSkeleton />;
  }

  const currency = data.revenue.currency || "KES";
  const upcoming = data.upcoming;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
              <LayoutDashboard aria-hidden="true" className="size-3.5" />
              Live overview
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Good to see you, {displayName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {formatMonthLabel(data.month)} at a glance. Stock, bookings and money all
              come straight from the live records — no counters to drift.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                As of {formatLongDate(data.asOf)}
              </span>
              <span aria-hidden="true">·</span>
              <span>Updated {formatDateTime(data.generatedAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              onClick={() => dashboard.refetch()}
              disabled={dashboard.isFetching}
              aria-busy={dashboard.isFetching}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn("size-4", dashboard.isFetching && "animate-spin")}
              />
              {dashboard.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button asChild>
              <Link to="/admin/bookings">
                Open booking board
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-bookings-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="dashboard-bookings-heading" className="font-semibold text-slate-900">
              Bookings
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Requests waiting on you, approvals this month and completed jobs.
            </p>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            to="/admin/bookings?status=PENDING"
            label="Pending requests"
            value={data.bookings.pending}
            hint={
              data.bookings.pending === 1
                ? "1 request needs a decision"
                : `${data.bookings.pending} requests need a decision`
            }
            icon={Clock3}
            tone="amber"
          />
          <MetricCard
            to="/admin/bookings?status=CONFIRMED"
            label="Confirmed this month"
            value={data.bookings.confirmedThisMonth}
            hint={`Approved in ${formatMonthLabel(data.month)}`}
            icon={CalendarCheck}
            tone="brand"
          />
          <MetricCard
            to="/admin/bookings?status=COMPLETED"
            label="Completed jobs"
            value={data.bookings.completed}
            hint="All time, marked fulfilled"
            icon={CheckCircle2}
            tone="emerald"
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-revenue-heading">
        <div className="mb-3">
          <h2 id="dashboard-revenue-heading" className="font-semibold text-slate-900">
            Money
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Paid payments only. Outstanding covers confirmed and completed bookings.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-sm lg:col-span-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-brand-400/20 blur-2xl"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-300">Collected all time</p>
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-brand-200">
                  <Wallet aria-hidden="true" className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatMoney(data.revenue.collected, currency)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Every successful payment on record
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Collected this month</p>
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <CircleDollarSign aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(data.revenue.thisMonth, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatMonthLabel(data.month)} payments
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-amber-900">Outstanding</p>
              <span className="grid size-9 place-items-center rounded-xl bg-white text-amber-700 ring-1 ring-amber-200">
                <TriangleAlert aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-amber-950">
              {formatMoney(data.revenue.outstanding, currency)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Still owed on confirmed and completed jobs.
            </p>
            <Link
              to="/admin/bookings?status=CONFIRMED"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
            >
              Review balances
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="dashboard-upcoming-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="dashboard-upcoming-heading"
                className="flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <CalendarCheck aria-hidden="true" className="size-4 text-brand-700" />
                Coming up
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Confirmed jobs from today onwards, soonest first.
              </p>
            </div>
            <Badge variant="outline">{upcoming.length} shown</Badge>
          </div>

          {upcoming.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
              <CalendarCheck
                aria-hidden="true"
                className="mx-auto size-7 text-slate-400"
              />
              <p className="mt-2 font-medium text-slate-900">Nothing on the calendar</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Confirmed jobs will appear here as soon as dates are locked in.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 bg-white">
                <Link to="/admin/bookings">Review requests</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {upcoming.map((booking) => (
                <li key={booking.id}>
                  <Link
                    to={`/admin/bookings/${booking.id}`}
                    className="group -mx-2 flex flex-col gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold tracking-wide text-brand-800">
                          {booking.code}
                        </span>
                        <AdminBookingStatusBadge status={booking.status} />
                        <PaymentStatusBadge status={booking.paymentStatus} />
                      </div>
                      <p className="mt-1 truncate font-medium text-slate-900">
                        {booking.customer.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatLongDate(booking.startDate)} →{" "}
                        {formatLongDate(booking.endDate)}
                        {booking.customer.phone ? ` · ${booking.customer.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:block sm:text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatMoney(booking.totalAmount, currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid {formatMoney(booking.paidAmount, currency)}
                      </p>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100">
                        Open
                        <ArrowRight aria-hidden="true" className="size-3" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="dashboard-stock-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="dashboard-stock-heading"
                className="flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <Boxes aria-hidden="true" className="size-4 text-brand-700" />
                Low stock
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Fully booked on at least one day in the next{" "}
                {data.inventory.horizonDays} days.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/admin/catalogue">
                Manage
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>

          {data.inventory.lowStock.length === 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-5 py-8 text-center">
              <PackageCheck
                aria-hidden="true"
                className="mx-auto size-7 text-emerald-600"
              />
              <p className="mt-2 font-medium text-emerald-950">Stock looks healthy</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-emerald-800">
                Nothing is fully committed over the next {data.inventory.horizonDays}{" "}
                days.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.inventory.lowStock.map((item) => (
                <li
                  key={item.equipmentId}
                  className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-900">
                        {item.availableToday} of {item.total} free today ·{" "}
                        {item.reservedToday} reserved
                      </p>
                    </div>
                    <Badge variant="warning" className="shrink-0">
                      {item.daysFullyBooked} day{item.daysFullyBooked === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-amber-800">
                    Fully booked from {formatLongDate(item.firstFullDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          to="/admin/bookings?status=PENDING"
          icon={CalendarDays}
          title="Booking board"
          description="Filter requests, confirm dates and record payments."
        />
        <QuickLink
          to="/admin/catalogue"
          icon={PackageCheck}
          title="Catalogue"
          description="Equipment, packages, offers and stock levels."
        />
        <QuickLink
          to="/admin/settings"
          icon={KeyRound}
          title="Account settings"
          description="Update your sign-in details and password."
        />
      </section>
    </div>
  );
}

function MetricCard({
  to,
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  to: string;
  label: string;
  value: number;
  hint: string;
  icon: typeof CalendarDays;
  tone: "amber" | "brand" | "emerald";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl ring-1",
            tones[tone],
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-slate-300 transition group-hover:text-brand-600"
        />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
    </Link>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/30"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-brand-700 ring-1 ring-slate-100">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium text-slate-900">
          {title}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 text-brand-600 opacity-0 transition group-hover:opacity-100"
          />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-52 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <span className="sr-only">Loading the dashboard…</span>
    </div>
  );
}
