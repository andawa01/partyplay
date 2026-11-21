import {
  Boxes,
  CalendarDays,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Store,
  Timer,
  Truck,
  UserRound,
} from "lucide-react";

import type { BookingStatus, PublicBooking } from "../../lib/bookings";
import { cn } from "../../lib/cn";
import { formatDateTime, formatLongDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type StatusBadgeVariant = "warning" | "success" | "destructive" | "secondary";

const STATUS_META: Record<
  BookingStatus,
  {
    label: string;
    badge: StatusBadgeVariant;
    title: string;
    description: string;
    tone: string;
  }
> = {
  PENDING: {
    label: "Pending confirmation",
    badge: "warning",
    title: "Waiting for confirmation",
    description:
      "The owner is checking availability and will contact you to confirm the details.",
    tone: "from-amber-50 via-white to-brand-50",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "success",
    title: "You're all set",
    description:
      "Your booking is confirmed. Contact us if your plans change or you need to add anything.",
    tone: "from-emerald-50 via-white to-brand-50",
  },
  REJECTED: {
    label: "Not accepted",
    badge: "destructive",
    title: "This request was not accepted",
    description:
      "Contact us and we will help you find another date or a different setup.",
    tone: "from-red-50 via-white to-blush-50",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "destructive",
    title: "This booking was cancelled",
    description: "Contact us if you would like to rebook these items or choose new dates.",
    tone: "from-slate-100 via-white to-blush-50",
  },
  COMPLETED: {
    label: "Completed",
    badge: "success",
    title: "This hire is complete",
    description: "Thanks for celebrating with us. We hope everyone had a wonderful time.",
    tone: "from-emerald-50 via-white to-blush-50",
  },
  EXPIRED: {
    label: "Expired",
    badge: "warning",
    title: "This hold has expired",
    description:
      "The items were released before the request was confirmed. Send a new request to check the dates again.",
    tone: "from-amber-50 via-white to-blush-50",
  },
};

export function bookingStatusLabel(status: BookingStatus): string {
  return STATUS_META[status].label;
}

export function BookingStatusView({
  booking,
  onRefresh,
  isRefreshing,
}: {
  booking: PublicBooking;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const displayStatus: BookingStatus =
    booking.status === "PENDING" && booking.holdExpired ? "EXPIRED" : booking.status;
  const meta = STATUS_META[displayStatus];
  const notice =
    displayStatus === "EXPIRED" && booking.status === "PENDING"
      ? "The hold expired before this request was confirmed. The dates are no longer held."
      : (booking.notice ?? meta.description);
  const address =
    booking.fulfilmentMethod === "DELIVERY"
      ? booking.dropoffAddress
      : booking.pickupAddress;
  const hasNotes = Boolean(booking.notes || booking.specialRequests);

  return (
    <section aria-labelledby="booking-status-heading">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className={cn("bg-linear-to-br px-6 py-7 sm:px-8", meta.tone)}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Booking reference
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.15em] text-brand-800">
                {booking.code}
              </p>
              <h2
                id="booking-status-heading"
                className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              >
                {meta.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">{notice}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <Badge variant={meta.badge}>{meta.label}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-busy={isRefreshing}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-3.5", isRefreshing && "animate-spin")}
                />
                {isRefreshing ? "Refreshing…" : "Refresh status"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-8">
            <section aria-labelledby="booking-hire-heading">
              <h3
                id="booking-hire-heading"
                className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500"
              >
                Your hire
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <CalendarDays
                    aria-hidden="true"
                    className="size-5 text-brand-700"
                  />
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Rental dates
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatLongDate(booking.startDate)}
                  </p>
                  <p className="text-sm text-slate-600">
                    to {formatLongDate(booking.endDate)} · {booking.rentalDays} day
                    {booking.rentalDays === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  {booking.fulfilmentMethod === "DELIVERY" ? (
                    <Truck aria-hidden="true" className="size-5 text-brand-700" />
                  ) : (
                    <Store aria-hidden="true" className="size-5 text-brand-700" />
                  )}
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    {booking.fulfilmentMethod === "DELIVERY"
                      ? "Delivery"
                      : "Collection"}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {booking.fulfilmentMethod === "DELIVERY"
                      ? "Delivered to your venue"
                      : "You are collecting"}
                  </p>
                  {address ? (
                    <p className="mt-1 flex items-start gap-1.5 text-sm leading-relaxed text-slate-600">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-slate-400"
                      />
                      {address}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section aria-labelledby="booking-items-heading">
              <h3
                id="booking-items-heading"
                className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500"
              >
                What is included
              </h3>
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {booking.packages.map((pkg, index) => (
                  <li key={`${pkg.packageName}-${index}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 font-medium text-slate-900">
                          <Package
                            aria-hidden="true"
                            className="size-4 shrink-0 text-blush-700"
                          />
                          {pkg.packageName}
                          {pkg.quantity > 1 ? ` × ${pkg.quantity}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Package · included items
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-slate-900">
                        {formatMoney(pkg.lineTotal, booking.currency)}
                      </span>
                    </div>
                    {pkg.items.length > 0 ? (
                      <ul className="mt-2 space-y-1 pl-6 text-xs text-slate-600">
                        {pkg.items.map((item, itemIndex) => (
                          <li key={`${item.equipmentName}-${itemIndex}`}>
                            {item.equipmentName}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}

                {booking.items.map((line, index) => (
                  <li
                    key={`${line.equipmentName}-${index}`}
                    className="flex items-start justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        <Boxes
                          aria-hidden="true"
                          className="size-4 shrink-0 text-brand-700"
                        />
                        {line.equipmentName}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </p>
                      <p className="mt-0.5 pl-6 text-xs text-slate-500">
                        Extra equipment · {line.days} day
                        {line.days === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-slate-900">
                      {formatMoney(line.priceForPeriod, booking.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {hasNotes ? (
              <section aria-labelledby="booking-notes-heading">
                <h3
                  id="booking-notes-heading"
                  className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500"
                >
                  Your notes
                </h3>
                <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
                  {booking.notes ? <p>{booking.notes}</p> : null}
                  {booking.specialRequests ? (
                    <p>
                      <span className="font-medium text-slate-900">
                        Special requests:{" "}
                      </span>
                      {booking.specialRequests}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            {booking.status === "PENDING" && booking.holdExpiresAt ? (
              <div
                className={cn(
                  "rounded-2xl border p-5",
                  booking.holdExpired
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50",
                )}
              >
                <Timer
                  aria-hidden="true"
                  className={cn(
                    "size-5",
                    booking.holdExpired ? "text-red-700" : "text-amber-700",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 text-xs font-semibold uppercase tracking-[0.15em]",
                    booking.holdExpired ? "text-red-900" : "text-amber-900",
                  )}
                >
                  {booking.holdExpired ? "Hold expired" : "Items held until"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateTime(booking.holdExpiresAt)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {booking.holdExpired
                    ? "These dates are no longer held. Send a new request if you still need them."
                    : "After this time the items are released and the request can no longer be confirmed."}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                {displayStatus === "PENDING" ? "Estimated total" : "Booking total"}
              </h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3 text-slate-600">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(booking.subtotal, booking.currency)}</dd>
                </div>
                {Number(booking.discountAmount) > 0 ? (
                  <div className="flex justify-between gap-3 text-blush-700">
                    <dt>Discount</dt>
                    <dd>−{formatMoney(booking.discountAmount, booking.currency)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 text-slate-600">
                  <dt>Transport</dt>
                  <dd>
                    {Number(booking.transportCharge) > 0
                      ? formatMoney(booking.transportCharge, booking.currency)
                      : displayStatus === "PENDING"
                        ? "Confirmed separately"
                        : formatMoney("0.00", booking.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                  <dt>Total</dt>
                  <dd>{formatMoney(booking.totalAmount, booking.currency)}</dd>
                </div>
                {booking.paymentDue &&
                (displayStatus === "CONFIRMED" || displayStatus === "COMPLETED") ? (
                  <div className="flex justify-between gap-3 pt-1 text-sm font-medium text-amber-800">
                    <dt>Amount due</dt>
                    <dd>{formatMoney(booking.amountDue, booking.currency)}</dd>
                  </div>
                ) : null}
                {booking.paymentStatus === "PAID" ? (
                  <p className="pt-1 text-xs font-medium text-emerald-700">Paid in full</p>
                ) : null}
              </dl>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">
                {displayStatus === "PENDING"
                  ? "The owner confirms transport and the final total before the booking is held."
                  : "This total comes from the booking record."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Booking contact</h3>
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-800">
                <UserRound aria-hidden="true" className="size-4 text-brand-700" />
                {booking.customer.name}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                <Phone aria-hidden="true" className="size-4 text-brand-700" />
                {booking.customer.phone ?? "Phone not shared"}
              </p>
            </div>
          </aside>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        This page does not update automatically. Use “Refresh status” after speaking with
        the owner.
      </p>
    </section>
  );
}
