import { Check, Clipboard, ClipboardCheck, Home, Timer } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import type { CreatedBooking } from "../../lib/bookings";
import { formatDateTime, formatLongDate } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function BookingSuccess({
  booking,
  onReset,
}: {
  booking: CreatedBooking;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(booking.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-3xl px-4" aria-labelledby="booking-success-heading">
      <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-linear-to-br from-emerald-50 via-white to-brand-50 px-6 py-10 text-center sm:px-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <Check aria-hidden="true" className="size-7" />
          </span>
          <h1
            id="booking-success-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Your request is in
          </h1>
          <p className="mx-auto mt-2 max-w-lg leading-relaxed text-slate-600">{booking.notice}</p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Booking reference
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.15em] text-brand-800">
              {booking.code}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copyCode()}
              className="mt-2"
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Clipboard aria-hidden="true" className="size-3.5" />
                  Copy code
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
              What happens next
            </h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2.5">
                <Timer aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                <span>
                  We are holding your items until{" "}
                  <strong className="font-semibold text-slate-900">
                    {formatDateTime(booking.holdExpiresAt)}
                  </strong>
                  .
                </span>
              </li>
              <li className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                <span>
                  The owner checks the request and contacts you to confirm delivery, transport and
                  the final total.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                <span>Keep the reference code — it identifies this request.</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
              Your hire
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Dates</span>
                <span className="text-right font-medium text-slate-900">
                  {formatLongDate(booking.startDate)} – {formatLongDate(booking.endDate)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Method</span>
                <span className="font-medium text-slate-900">
                  {booking.fulfilmentMethod === "DELIVERY" ? "Delivery" : "Collection"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Status</span>
                <Badge variant="warning">Pending confirmation</Badge>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                <span className="text-slate-500">Estimated total</span>
                <span className="font-semibold text-slate-900">
                  {formatMoney(booking.totalAmount, booking.currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              {booking.packages.map((pkg) => (
                <div key={pkg.packageId} className="flex justify-between gap-3">
                  <span className="text-slate-700">
                    {pkg.packageName}
                    {pkg.quantity > 1 ? ` × ${pkg.quantity}` : ""}
                  </span>
                  <span className="text-slate-900">
                    {formatMoney(pkg.lineTotal, booking.currency)}
                  </span>
                </div>
              ))}
              {booking.items.map((line) => (
                <div key={line.equipmentId} className="flex justify-between gap-3">
                  <span className="text-slate-700">
                    {line.equipmentName}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                  </span>
                  <span className="text-slate-900">
                    {formatMoney(line.priceForPeriod, booking.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/booking/status">
            <ClipboardCheck aria-hidden="true" className="size-4" />
            Check booking status
          </Link>
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Send another request
        </Button>
        <Button asChild>
          <Link to="/">
            <Home aria-hidden="true" className="size-4" />
            Back home
          </Link>
        </Button>
      </div>
    </section>
  );
}
