import { Printer, ReceiptText } from "lucide-react";
import { createPortal } from "react-dom";

import { useSite } from "../../../hooks/use-site";
import type { AdminBookingDetail } from "../../../lib/admin-bookings";
import type {
  BookingPaymentSummary,
  PaymentRow,
} from "../../../lib/admin-payments";
import {
  paymentMethodLabel,
  paymentReceiptNumber,
} from "../../../lib/admin-payments";
import { formatDateTime, formatLongDate } from "../../../lib/dates";
import { formatMoney } from "../../../lib/money";
import { SITE_FALLBACK } from "../../../lib/site";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

export function PaymentReceiptDialog({
  booking,
  payment,
  summary,
  onClose,
}: {
  booking: AdminBookingDetail;
  payment: PaymentRow;
  summary: BookingPaymentSummary;
  onClose: () => void;
}) {
  const site = useSite().data ?? SITE_FALLBACK;

  const receipt = (
    <ReceiptDocument
      booking={booking}
      payment={payment}
      summary={summary}
      businessName={site.businessName}
      businessContact={[site.contactPhone, site.contactEmail, site.address]
        .filter((value): value is string => Boolean(value))
        .join(" · ")}
    />
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="size-4 text-brand-700" />
            Payment receipt
          </DialogTitle>
          <DialogDescription>
            Check the receipt, then print it or save it as a PDF for the customer.
          </DialogDescription>
        </DialogHeader>

        {receipt}

        <DialogFooter className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-slate-100 bg-white px-4 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" />
            Print / save PDF
          </Button>
        </DialogFooter>
      </DialogContent>

      {createPortal(<div className="print-receipt">{receipt}</div>, document.body)}
    </Dialog>
  );
}

function ReceiptDocument({
  booking,
  payment,
  summary,
  businessName,
  businessContact,
}: {
  booking: AdminBookingDetail;
  payment: PaymentRow;
  summary: BookingPaymentSummary;
  businessName: string;
  businessContact: string;
}) {
  const paidOn = payment.paidAt ?? payment.createdAt;
  const recordedBy = payment.paidBy?.name ?? payment.paidBy?.email ?? "PartyPlay admin";

  return (
    <article className="receipt-sheet rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 sm:p-7">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white">
            {businessName.charAt(0).toUpperCase() || "P"}
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900">{businessName}</p>
            <p className="text-xs text-slate-500">Party equipment hire</p>
            {businessContact ? (
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
                {businessContact}
              </p>
            ) : null}
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Payment receipt
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
            {paymentReceiptNumber(payment)}
          </p>
          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Paid
          </span>
        </div>
      </header>

      <section className="mt-5 rounded-xl bg-brand-50 px-4 py-4 ring-1 ring-brand-100">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-800">
          Amount received
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {formatMoney(payment.amount, booking.currency)}
        </p>
        <p className="mt-1 text-xs text-brand-900">
          Against booking {booking.code} · {formatDateTime(paidOn)}
        </p>
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Received from
          </p>
          <p className="mt-2 font-semibold text-slate-900">{booking.customer.name}</p>
          {booking.customer.phone ? (
            <p className="mt-0.5 text-sm text-slate-600">{booking.customer.phone}</p>
          ) : null}
          {booking.customer.email ? (
            <p className="mt-0.5 break-all text-sm text-slate-600">
              {booking.customer.email}
            </p>
          ) : null}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Payment details
          </p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <ReceiptLine label="Method" value={paymentMethodLabel(payment.method)} />
            <ReceiptLine
              label="Reference"
              value={payment.providerRef ?? "Not supplied"}
              mono={Boolean(payment.providerRef)}
            />
            <ReceiptLine label="Recorded by" value={recordedBy} />
          </dl>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 py-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-3">
        <ReceiptAmount
          label="Booking total"
          value={formatMoney(summary.totalAmount, booking.currency)}
        />
        <ReceiptAmount
          label="Paid to date"
          value={formatMoney(summary.paidAmount, booking.currency)}
        />
        <ReceiptAmount
          label="Balance due"
          value={
            Number(summary.amountDue) > 0
              ? formatMoney(summary.amountDue, booking.currency)
              : "Settled"
          }
          tone={Number(summary.amountDue) > 0 ? "due" : "settled"}
        />
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Rental period
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {formatLongDate(booking.startDate)} – {formatLongDate(booking.endDate)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {booking.rentalDays} day{booking.rentalDays === 1 ? "" : "s"} ·{" "}
            {booking.fulfilmentMethod === "DELIVERY" ? "Delivery" : "Collection"}
          </p>
        </div>
        {payment.description ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Note
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {payment.description}
            </p>
          </div>
        ) : null}
      </div>

      <footer className="mt-6 border-t border-dashed border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        <p>Thank you for choosing {businessName}.</p>
        <p className="mt-1">
          This receipt confirms the payment recorded against booking {booking.code}. The
          balance shown reflects the booking when this receipt was printed.
        </p>
      </footer>
    </article>
  );
}

function ReceiptLine({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "break-all text-right font-mono text-slate-800" : "text-right text-slate-800"}>
        {value}
      </dd>
    </div>
  );
}

function ReceiptAmount({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "due" | "settled";
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 sm:block sm:py-0">
      <p className="text-[0.65rem] text-slate-500 sm:text-xs">{label}</p>
      <p
        className={
          tone === "due"
            ? "mt-0.5 text-xs font-semibold text-amber-800 sm:text-sm"
            : tone === "settled"
              ? "mt-0.5 text-xs font-semibold text-emerald-700 sm:text-sm"
              : "mt-0.5 text-xs font-semibold text-slate-900 sm:text-sm"
        }
      >
        {value}
      </p>
    </div>
  );
}
