import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  ReceiptText,
  RefreshCw,
  Store,
  Timer,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AvailabilityResult } from "../../components/admin/bookings/AvailabilityResult";
import { BookingActionDialog } from "../../components/admin/bookings/BookingActionDialog";
import { BookingEditDialog } from "../../components/admin/bookings/BookingEditDialog";
import { PaymentsPanel } from "../../components/admin/bookings/PaymentsPanel";
import {
  AdminBookingStatusBadge,
  PaymentStatusBadge,
} from "../../components/admin/bookings/BookingStatusBadge";
import { TransportChargeDialog } from "../../components/admin/bookings/TransportChargeDialog";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { useAdminBooking, useCheckBookingAvailability } from "../../hooks/use-admin-bookings";
import { useAdminSession } from "../../hooks/use-auth";
import type { BookingActionOption, BookingAvailabilityCheck } from "../../lib/admin-bookings";
import { adminStatusMeta, allowedBookingActions } from "../../lib/admin-bookings";
import { formatDateTime, formatLongDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { toast, toastError } from "../../lib/toast";
import { cn } from "../../lib/cn";

export default function AdminBookingDetailPage() {
  const { id = "" } = useParams();
  const session = useAdminSession();
  const canManagePayments = session.data?.role !== "STAFF";
  const bookingQuery = useAdminBooking(id);
  const check = useCheckBookingAvailability();
  const [availability, setAvailability] = useState<BookingAvailabilityCheck | null>(null);
  const [action, setAction] = useState<BookingActionOption | null>(null);
  const [transportOpen, setTransportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (bookingQuery.isPending) {
    return <BookingDetailSkeleton />;
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin/bookings">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to bookings
          </Link>
        </Button>
        <ErrorState
          title="This booking could not load"
          error={bookingQuery.error}
          onRetry={() => bookingQuery.refetch()}
          isRetrying={bookingQuery.isFetching}
        />
      </div>
    );
  }

  const booking = bookingQuery.data;
  const actions = allowedBookingActions(booking.status);
  const meta = adminStatusMeta[booking.status];
  const canChangeTransport = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canEdit = booking.status === "PENDING" || booking.status === "CONFIRMED";

  function startAction(nextAction: BookingActionOption) {
    if (nextAction.to === "CONFIRMED") {
      check.mutate(booking.id, {
        onSuccess: (result) => {
          setAvailability(result);
          setAction(nextAction);
        },
        onError: (error) => toastError(error, "The stock check could not run."),
      });
      return;
    }
    setAction(nextAction);
  }

  function runCheck() {
    check.mutate(booking.id, {
      onSuccess: (result) => {
        setAvailability(result);
        toast.success("Availability checked");
      },
      onError: (error) => toastError(error, "The stock check could not run."),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/bookings">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to bookings
          </Link>
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminBookingStatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
              {booking.holdExpired ? <Badge variant="destructive">Hold expired</Badge> : null}
            </div>
            <p className="mt-4 font-mono text-2xl font-bold tracking-[0.12em] text-brand-800">
              {booking.code}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {booking.customer.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {meta.description} Created {formatDateTime(booking.createdAt)}.
            </p>
          </div>

          <div className="flex max-w-xl flex-wrap gap-2 xl:justify-end">
            {actions.map((option) => {
              const isConfirm = option.to === "CONFIRMED";
              const busy = isConfirm && check.isPending;
              return (
                <Button
                  key={option.to}
                  type="button"
                  variant={option.destructive ? "outline" : "default"}
                  className={
                    option.destructive
                      ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                      : undefined
                  }
                  onClick={() => startAction(option)}
                  disabled={check.isPending}
                  aria-busy={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Checking stock…
                    </>
                  ) : (
                    option.label
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound aria-hidden="true" className="size-4 text-brand-700" />
                Customer
              </h2>
              <p className="mt-3 font-medium text-slate-900">{booking.customer.name}</p>
              {booking.customer.phone ? (
                <a
                  href={`tel:${booking.customer.phone}`}
                  className="mt-1.5 flex items-center gap-2 text-sm text-brand-700 hover:underline"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  {booking.customer.phone}
                </a>
              ) : (
                <p className="mt-1.5 text-sm text-slate-500">No phone number</p>
              )}
              {booking.customer.email ? (
                <a
                  href={`mailto:${booking.customer.email}`}
                  className="mt-1.5 flex items-center gap-2 break-all text-sm text-brand-700 hover:underline"
                >
                  <Mail aria-hidden="true" className="size-3.5" />
                  {booking.customer.email}
                </a>
              ) : null}
              {booking.createdBy ? (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Created by {booking.createdBy.name ?? booking.createdBy.email}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarDays aria-hidden="true" className="size-4 text-brand-700" />
                Rental and fulfilment
              </h2>
              <p className="mt-3 font-medium text-slate-900">{formatLongDate(booking.startDate)}</p>
              <p className="text-sm text-slate-600">
                to {formatLongDate(booking.endDate)} · {booking.rentalDays} day
                {booking.rentalDays === 1 ? "" : "s"}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                {booking.fulfilmentMethod === "DELIVERY" ? (
                  <Truck aria-hidden="true" className="size-4 text-brand-700" />
                ) : (
                  <Store aria-hidden="true" className="size-4 text-brand-700" />
                )}
                {booking.fulfilmentMethod === "DELIVERY" ? "Delivery" : "Collection"}
              </p>
              {booking.fulfilmentMethod === "DELIVERY" ? (
                <AddressBlock
                  address={booking.dropoffAddress}
                  notes={booking.dropoffNotes}
                  empty="No delivery address recorded"
                />
              ) : (
                <AddressBlock
                  address={booking.pickupAddress}
                  notes={booking.pickupNotes}
                  empty="No collection address recorded"
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ReceiptText aria-hidden="true" className="size-4 text-brand-700" />
                What is booked
              </h2>
              {canEdit ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Edit dates & items
                </Button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {booking.packages.map((pkg) => (
                <div key={pkg.id} className="rounded-xl border border-blush-100 bg-blush-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        <Package aria-hidden="true" className="size-4 text-blush-700" />
                        {pkg.packageName}
                        {pkg.quantity > 1 ? ` × ${pkg.quantity}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Package · {formatMoney(pkg.packagePrice, booking.currency)} each
                      </p>
                    </div>
                    <span className="font-medium text-slate-900">
                      {formatMoney(pkg.lineTotal, booking.currency)}
                    </span>
                  </div>
                  {pkg.items.length > 0 ? (
                    <ul className="mt-2 grid gap-1 pl-6 text-xs text-slate-600 sm:grid-cols-2">
                      {pkg.items.map((item, index) => (
                        <li key={`${item.equipmentId}-${index}`}>
                          {item.equipmentName}
                          {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}

              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <Boxes aria-hidden="true" className="size-4 text-brand-700" />
                      {item.equipmentName}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </p>
                    <p className="mt-0.5 pl-6 text-xs text-slate-500">
                      {item.days} day{item.days === 1 ? "" : "s"} ·{" "}
                      {formatMoney(item.unitPrice, booking.currency)} per unit
                    </p>
                  </div>
                  <span className="font-medium text-slate-900">
                    {formatMoney(item.priceForPeriod, booking.currency)}
                  </span>
                </div>
              ))}
            </div>

            {booking.notes || booking.specialRequests ? (
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {booking.notes ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Customer notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {booking.notes}
                    </p>
                  </div>
                ) : null}
                {booking.specialRequests ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Special requests
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {booking.specialRequests}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Clock3 aria-hidden="true" className="size-4 text-brand-700" />
              Status history
            </h2>
            {booking.statusHistory.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                No status changes yet. The booking is still {booking.status.toLowerCase()}.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {booking.statusHistory.map((entry, index) => (
                  <li key={`${entry.createdAt}-${index}`} className="relative pl-7">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1 grid size-4 place-items-center rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-100"
                    />
                    {index < booking.statusHistory.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-16px] left-[7px] top-6 w-px bg-slate-200"
                      />
                    ) : null}
                    <p className="text-sm font-medium text-slate-900">
                      {entry.fromStatus ? `${entry.fromStatus} → ` : ""}
                      {entry.toStatus}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(entry.createdAt)}
                      {entry.admin ? ` · ${entry.admin.name ?? entry.admin.email}` : ""}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-sm text-slate-700">{entry.reason}</p>
                    ) : null}
                    {entry.note ? (
                      <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {booking.edits.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Pencil aria-hidden="true" className="size-4 text-brand-700" />
                Edit history
              </h2>
              <ol className="mt-4 space-y-4">
                {booking.edits.map((edit) => (
                  <li
                    key={edit.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {formatLongDate(edit.previousStartDate)} –{" "}
                      {formatLongDate(edit.previousEndDate)} → {formatLongDate(edit.newStartDate)} –{" "}
                      {formatLongDate(edit.newEndDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(edit.createdAt)}
                      {edit.admin ? ` · ${edit.admin.name ?? edit.admin.email}` : ""} · Total{" "}
                      {formatMoney(edit.previousTotalAmount, booking.currency)} →{" "}
                      {formatMoney(edit.newTotalAmount, booking.currency)}
                    </p>
                    {edit.note ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{edit.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {canManagePayments ? <PaymentsPanel booking={booking} /> : null}
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wallet aria-hidden="true" className="size-4 text-brand-700" />
                Money
              </h2>
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <MoneyRow
                label="Subtotal"
                value={booking.totals.subtotal}
                currency={booking.currency}
              />
              {Number(booking.totals.discountAmount) > 0 ? (
                <MoneyRow
                  label="Discount"
                  value={booking.totals.discountAmount}
                  currency={booking.currency}
                  accent
                />
              ) : null}
              <MoneyRow
                label="Transport"
                value={booking.totals.transportCharge}
                currency={booking.currency}
              />
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatMoney(booking.totals.totalAmount, booking.currency)}</dd>
              </div>
              <MoneyRow
                label="Paid"
                value={booking.totals.paidAmount}
                currency={booking.currency}
              />
              <div className="flex justify-between gap-3 pt-1 text-sm font-semibold text-amber-800">
                <dt>Amount due</dt>
                <dd>{formatMoney(booking.totals.amountDue, booking.currency)}</dd>
              </div>
              {Number(booking.totals.overpaidBy) > 0 ? (
                <div className="flex justify-between gap-3 text-xs text-emerald-700">
                  <dt>Overpaid</dt>
                  <dd>{formatMoney(booking.totals.overpaidBy, booking.currency)}</dd>
                </div>
              ) : null}
            </dl>
            {canChangeTransport ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransportOpen(true)}
                className="mt-4 w-full"
              >
                Edit transport charge
              </Button>
            ) : null}
            <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">
              {canManagePayments
                ? "Amounts come from the booking record. Record and reconcile payments below."
                : "Amounts come from the booking record. Payments are handled by the owner or an admin."}
            </p>
          </section>

          {booking.status === "PENDING" && booking.holdExpiresAt ? (
            <section
              className={cn(
                "rounded-2xl border p-5",
                booking.holdExpired ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
              )}
            >
              <h2
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  booking.holdExpired ? "text-red-900" : "text-amber-900",
                )}
              >
                <Timer aria-hidden="true" className="size-4" />
                {booking.holdExpired ? "Hold expired" : "Stock held until"}
              </h2>
              <p className="mt-2 font-medium text-slate-900">
                {formatDateTime(booking.holdExpiresAt)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {booking.holdExpired
                  ? "These dates are released. A confirmation now must pass a fresh stock check."
                  : "After this time the held stock is released and confirmation needs a fresh check."}
              </p>
            </section>
          ) : null}

          {canChangeTransport ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <RefreshCw aria-hidden="true" className="size-4 text-brand-700" />
                Availability check
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Confirm the stock against the current bookings before accepting a request.
              </p>

              <div className="mt-3">
                {check.isPending ? (
                  <div
                    className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"
                    aria-busy="true"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Checking the dates…
                    </span>
                  </div>
                ) : availability ? (
                  <AvailabilityResult check={availability} />
                ) : check.isError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Stock check failed</AlertTitle>
                    <AlertDescription>
                      {check.error instanceof Error ? check.error.message : "Try the check again."}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    No check has run in this session.
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runCheck}
                disabled={check.isPending}
                className="mt-3 w-full"
              >
                {check.isPending
                  ? "Checking…"
                  : availability
                    ? "Check again"
                    : "Check availability"}
              </Button>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 aria-hidden="true" className="size-4 text-brand-700" />
              Milestones
            </h2>
            <dl className="mt-3 space-y-2 text-xs">
              <Milestone label="Created" value={formatDateTime(booking.createdAt)} />
              {booking.approvedAt ? (
                <Milestone label="Approved" value={formatDateTime(booking.approvedAt)} />
              ) : null}
              {booking.cancelledAt ? (
                <Milestone label="Cancelled" value={formatDateTime(booking.cancelledAt)} />
              ) : null}
              {booking.fulfilmentDate ? (
                <Milestone label="Fulfilled" value={formatDateTime(booking.fulfilmentDate)} />
              ) : null}
              <Milestone label="Last updated" value={formatDateTime(booking.updatedAt)} />
            </dl>
          </section>
        </aside>
      </div>

      {action ? (
        <BookingActionDialog
          booking={booking}
          action={action}
          availability={availability ?? undefined}
          onClose={() => setAction(null)}
        />
      ) : null}

      {transportOpen ? (
        <TransportChargeDialog booking={booking} onClose={() => setTransportOpen(false)} />
      ) : null}

      {editOpen ? (
        <BookingEditDialog
          booking={booking}
          onClose={() => {
            setEditOpen(false);
            setAvailability(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AddressBlock({
  address,
  notes,
  empty,
}: {
  address: string | null;
  notes: string | null;
  empty: string;
}) {
  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
      <p className="flex items-start gap-2">
        <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
        <span>{address ?? empty}</span>
      </p>
      {notes ? <p className="mt-1 pl-5 text-xs text-slate-500">{notes}</p> : null}
    </div>
  );
}

function MoneyRow({
  label,
  value,
  currency,
  accent = false,
}: {
  label: string;
  value: string;
  currency: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-3", accent ? "text-blush-700" : "text-slate-600")}>
      <dt>{label}</dt>
      <dd>{formatMoney(value, currency)}</dd>
    </div>
  );
}

function Milestone({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading the booking…</span>
    </div>
  );
}
