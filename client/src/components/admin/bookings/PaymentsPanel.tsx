import {
  AlertTriangle,
  Banknote,
  Loader2,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  useBookingPayments,
  useDeletePayment,
  useRecordPayment,
  useUpdatePayment,
} from "../../../hooks/use-admin-payments";
import type { AdminBookingDetail } from "../../../lib/admin-bookings";
import type {
  BookingPaymentSummary,
  PaymentEditFormValues,
  PaymentFormValues,
  PaymentMutationResult,
  PaymentRow,
} from "../../../lib/admin-payments";
import {
  emptyPaymentForm,
  paymentEditSchema,
  paymentEditToForm,
  paymentFormSchema,
  paymentMethodLabel,
  paymentMethodMeta,
  paymentPayload,
} from "../../../lib/admin-payments";
import { isApiError } from "../../../lib/api";
import { formatDateTime } from "../../../lib/dates";
import { formatMoney } from "../../../lib/money";
import { toast } from "../../../lib/toast";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { ErrorState } from "../../ui/error-state";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Skeleton } from "../../ui/skeleton";
import { Textarea } from "../../ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { PaymentReceiptDialog } from "./PaymentReceiptDialog";
import { PaymentRowStatusBadge, PaymentStatusBadge } from "./BookingStatusBadge";

type PaymentFieldErrors = Partial<Record<keyof PaymentFormValues, string>>;
type EditFieldErrors = Partial<Record<keyof PaymentEditFormValues, string>>;

export function PaymentsPanel({ booking }: { booking: AdminBookingDetail }) {
  const payments = useBookingPayments(booking.id);
  const remove = useDeletePayment();
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState<PaymentRow | null>(null);
  const [receipt, setReceipt] = useState<{
    payment: PaymentRow;
    summary: BookingPaymentSummary;
  } | null>(null);

  const rows = payments.data?.items ?? [];
  const summary = payments.data?.meta?.booking;
  const paidAmount = summary?.paidAmount ?? booking.totals.paidAmount;
  const amountDue = summary?.amountDue ?? booking.totals.amountDue;
  const paymentStatus = summary?.paymentStatus ?? booking.paymentStatus;
  const canDelete = booking.status === "PENDING";

  function showReceipt(payment: PaymentRow) {
    setReceipt({
      payment,
      summary: summary ?? {
        id: booking.id,
        code: booking.code,
        status: booking.status,
        totalAmount: booking.totals.totalAmount,
        paidAmount: booking.totals.paidAmount,
        amountDue: booking.totals.amountDue,
        overpaidBy: booking.totals.overpaidBy,
        paymentStatus: booking.paymentStatus,
      },
    });
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="payments-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="payments-heading"
            className="flex items-center gap-2 text-sm font-semibold text-slate-900"
          >
            <ReceiptText aria-hidden="true" className="size-4 text-brand-700" />
            Payments
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            Every payment is recorded against this booking. Paid totals and the balance always come
            from the server.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setRecording(true)}
          className="shrink-0 self-start"
        >
          <Plus aria-hidden="true" className="size-4" />
          Record payment
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-2.5 ring-1 ring-slate-100">
        <SummaryBox
          label="Booking total"
          value={summary?.totalAmount ?? booking.totals.totalAmount}
          currency={booking.currency}
        />
        <SummaryBox
          label="Paid to date"
          value={paidAmount}
          currency={booking.currency}
          tone="paid"
        />
        <SummaryBox
          label="Amount due"
          value={amountDue}
          currency={booking.currency}
          tone={Number(amountDue) > 0 ? "due" : "paid"}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      {payments.isPending ? (
        <PaymentRowsSkeleton />
      ) : payments.isError ? (
        <ErrorState
          className="mt-4"
          title="Payments could not load"
          error={payments.error}
          onRetry={() => payments.refetch()}
          isRetrying={payments.isFetching}
        />
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <Banknote aria-hidden="true" className="mx-auto size-7 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">No payments recorded</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            Record cash, M-Pesa or a bank transfer here. Manual payments start pending until they
            are confirmed.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setRecording(true)}
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Record the first payment
          </Button>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden lg:block">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <PaymentDate
                        value={payment.paidAt ?? payment.createdAt}
                        paidAt={payment.paidAt}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">
                        {formatMoney(payment.amount, booking.currency)}
                      </p>
                      {payment.description ? (
                        <p className="max-w-48 truncate text-xs text-slate-500">
                          {payment.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-800">
                        {paymentMethodLabel(payment.method)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PaymentRowStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-600">
                        {payment.providerRef ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">
                        {payment.paidBy?.name ?? payment.paidBy?.email ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => setEditing(payment)}
                          title="Update payment"
                          aria-label={`Update payment ${payment.id}`}
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </Button>
                        {payment.status === "PAID" ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => showReceipt(payment)}
                            title="Print receipt"
                            aria-label={`Print receipt for payment ${payment.id}`}
                          >
                            <Printer aria-hidden="true" className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-red-700 hover:bg-red-50"
                            onClick={() => setDeleting(payment)}
                            title="Delete payment"
                            aria-label={`Delete payment ${payment.id}`}
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-slate-100 lg:hidden" aria-label="Payments">
            {rows.map((payment) => (
              <li key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {formatMoney(payment.amount, booking.currency)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {paymentMethodLabel(payment.method)} ·{" "}
                      {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    </p>
                  </div>
                  <PaymentRowStatusBadge status={payment.status} />
                </div>

                {payment.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {payment.description}
                  </p>
                ) : null}

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-500">Reference</dt>
                    <dd className="mt-0.5 break-all font-mono text-slate-700">
                      {payment.providerRef ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Recorded by</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {payment.paidBy?.name ?? payment.paidBy?.email ?? "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex gap-2">
                  {payment.status === "PAID" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-brand-200 px-2 text-brand-800"
                      onClick={() => showReceipt(payment)}
                      aria-label={`Print receipt for payment ${payment.id}`}
                    >
                      <Printer aria-hidden="true" className="size-3.5" />
                      Receipt
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 px-2"
                    onClick={() => setEditing(payment)}
                    aria-label={`Update payment ${payment.id}`}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                    Update
                  </Button>
                  {canDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 px-2 text-red-700 hover:bg-red-50"
                      onClick={() => setDeleting(payment)}
                      aria-label={`Delete payment ${payment.id}`}
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canDelete && rows.length > 0 ? (
        <p className="mt-2 text-right text-[0.7rem] text-slate-500">
          Payments can only be deleted while the booking is pending.
        </p>
      ) : null}

      {recording ? (
        <RecordPaymentDialog
          bookingId={booking.id}
          bookingCode={booking.code}
          currency={booking.currency}
          onRecorded={(result) => {
            if (result.payment.status === "PAID") {
              setReceipt({ payment: result.payment, summary: result.booking });
            }
          }}
          onClose={() => setRecording(false)}
        />
      ) : null}

      {editing ? (
        <EditPaymentDialog
          payment={editing}
          currency={booking.currency}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {receipt ? (
        <PaymentReceiptDialog
          booking={booking}
          payment={receipt.payment}
          summary={receipt.summary}
          onClose={() => setReceipt(null)}
        />
      ) : null}

      {deleting ? (
        <DeletePaymentDialog
          payment={deleting}
          currency={booking.currency}
          pending={remove.isPending}
          error={remove.error}
          onClose={() => {
            setDeleting(null);
            remove.reset();
          }}
          onConfirm={() =>
            remove.mutate(
              { paymentId: deleting.id },
              {
                onSuccess: () => {
                  toast.success("Payment deleted", {
                    description: `${formatMoney(deleting.amount, booking.currency)} was removed and the balance recalculated.`,
                  });
                  setDeleting(null);
                },
              },
            )
          }
        />
      ) : null}
    </section>
  );
}

function PaymentDate({ value, paidAt }: { value: string; paidAt: string | null }) {
  const [date, time] = formatDateTime(value).split(", ");

  return (
    <>
      <p className="whitespace-nowrap text-sm text-slate-800">{date}</p>
      <p className="text-xs text-slate-500">
        {time ? `${time} · ` : ""}
        {paidAt ? "Paid" : "Recorded"}
      </p>
    </>
  );
}

function SummaryBox({
  label,
  value,
  currency,
  tone = "neutral",
}: {
  label: string;
  value: string;
  currency: string;
  tone?: "neutral" | "paid" | "due";
}) {
  return (
    <div className="min-w-0 px-2 sm:px-3">
      <p className="truncate text-[0.65rem] text-slate-500 sm:text-xs">{label}</p>
      <p
        className={
          tone === "due"
            ? "mt-0.5 truncate text-xs font-semibold text-amber-800 sm:text-base"
            : tone === "paid"
              ? "mt-0.5 truncate text-xs font-semibold text-emerald-700 sm:text-base"
              : "mt-0.5 truncate text-xs font-semibold text-slate-900 sm:text-base"
        }
      >
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

function RecordPaymentDialog({
  bookingId,
  bookingCode,
  currency,
  onRecorded,
  onClose,
}: {
  bookingId: string;
  bookingCode: string;
  currency: string;
  onRecorded: (result: PaymentMutationResult) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<PaymentFormValues>(emptyPaymentForm);
  const [errors, setErrors] = useState<PaymentFieldErrors>({});
  const record = useRecordPayment();

  function setField<K extends keyof PaymentFormValues>(field: K, value: PaymentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (record.error) {
      record.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = paymentFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors<PaymentFormValues>(parsed.error));
      return;
    }

    record.mutate(
      { bookingId, input: paymentPayload(parsed.data) },
      {
        onSuccess: (result) => {
          toast.success("Payment recorded", {
            description: `${formatMoney(result.payment.amount, currency)} via ${paymentMethodLabel(
              result.payment.method,
            )} is ${result.payment.status.toLowerCase()}. Balance due ${formatMoney(
              result.booking.amountDue,
              currency,
            )}.`,
          });
          onRecorded(result);
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment · {bookingCode}</DialogTitle>
          <DialogDescription>
            Cash, M-Pesa and bank transfers can settle immediately when a paid date is supplied.
            Manual and other methods start pending.
          </DialogDescription>
        </DialogHeader>

        {record.error ? <PaymentError error={record.error} /> : null}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <PaymentField
              id="payment-amount"
              label="Amount received"
              required
              error={errors.amount}
            >
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={values.amount}
                onChange={(event) => setField("amount", event.target.value)}
                placeholder="0.00"
                autoFocus
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "payment-amount-error" : undefined}
              />
            </PaymentField>

            <PaymentField id="payment-method" label="Method" required error={errors.method}>
              <select
                id="payment-method"
                value={values.method}
                onChange={(event) =>
                  setField("method", event.target.value as PaymentFormValues["method"])
                }
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                {Object.entries(paymentMethodMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{paymentMethodMeta[values.method].hint}</p>
            </PaymentField>
          </div>

          <PaymentField
            id="payment-paid-at"
            label="Paid at"
            error={errors.paidAt}
            hint="Optional. Leave blank to record this payment as pending."
          >
            <Input
              id="payment-paid-at"
              type="datetime-local"
              value={values.paidAt}
              onChange={(event) => setField("paidAt", event.target.value)}
              aria-invalid={Boolean(errors.paidAt)}
              aria-describedby={errors.paidAt ? "payment-paid-at-error" : undefined}
            />
          </PaymentField>

          <PaymentField
            id="payment-reference"
            label="Reference"
            error={errors.providerRef}
            hint="M-Pesa code, bank reference or receipt number."
          >
            <Input
              id="payment-reference"
              value={values.providerRef}
              onChange={(event) => setField("providerRef", event.target.value)}
              placeholder="e.g. QJ72X8ABC"
              aria-invalid={Boolean(errors.providerRef)}
              aria-describedby={errors.providerRef ? "payment-reference-error" : undefined}
            />
          </PaymentField>

          <PaymentField
            id="payment-description"
            label="Note"
            error={errors.description}
            hint={`${values.description.length}/500 characters`}
          >
            <Textarea
              id="payment-description"
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={500}
              placeholder="Optional note for the payment history."
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "payment-description-error" : undefined}
              className="min-h-16"
            />
          </PaymentField>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={record.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending} aria-busy={record.isPending}>
              {record.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Recording…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentDialog({
  payment,
  currency,
  onClose,
}: {
  payment: PaymentRow;
  currency: string;
  onClose: () => void;
}) {
  const [values, setValues] = useState<PaymentEditFormValues>(() => paymentEditToForm(payment));
  const [errors, setErrors] = useState<EditFieldErrors>({});
  const update = useUpdatePayment();

  function setField<K extends keyof PaymentEditFormValues>(
    field: K,
    value: PaymentEditFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (update.error) {
      update.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = paymentEditSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors<PaymentEditFormValues>(parsed.error));
      return;
    }

    update.mutate(
      { paymentId: payment.id, input: parsed.data },
      {
        onSuccess: (result) => {
          toast.success("Payment updated", {
            description: `${formatMoney(result.payment.amount, currency)} is now ${result.payment.status.toLowerCase()}.`,
          });
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update payment</DialogTitle>
          <DialogDescription>
            Change the payment status, reference or paid date. The amount and method are part of the
            original record.
          </DialogDescription>
        </DialogHeader>

        {update.error ? <PaymentError error={update.error} /> : null}

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Amount</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(payment.amount, currency)}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-slate-500">Method</span>
            <span className="font-medium text-slate-800">{paymentMethodLabel(payment.method)}</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <PaymentField id="payment-status" label="Status" required error={errors.status}>
            <select
              id="payment-status"
              value={values.status}
              onChange={(event) =>
                setField("status", event.target.value as PaymentEditFormValues["status"])
              }
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </PaymentField>

          <PaymentField id="payment-edit-reference" label="Reference" error={errors.providerRef}>
            <Input
              id="payment-edit-reference"
              value={values.providerRef}
              onChange={(event) => setField("providerRef", event.target.value)}
              placeholder="M-Pesa code, bank reference or receipt number"
              aria-invalid={Boolean(errors.providerRef)}
              aria-describedby={errors.providerRef ? "payment-edit-reference-error" : undefined}
            />
          </PaymentField>

          <PaymentField
            id="payment-edit-paid-at"
            label="Paid at"
            error={errors.paidAt}
            hint="Leave blank to keep the recorded date."
          >
            <Input
              id="payment-edit-paid-at"
              type="datetime-local"
              value={values.paidAt}
              onChange={(event) => setField("paidAt", event.target.value)}
              aria-invalid={Boolean(errors.paidAt)}
              aria-describedby={errors.paidAt ? "payment-edit-paid-at-error" : undefined}
            />
          </PaymentField>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
              {update.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePaymentDialog({
  payment,
  currency,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  payment: PaymentRow;
  currency: string;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>Delete this payment?</DialogTitle>
          <DialogDescription>
            {formatMoney(payment.amount, currency)} recorded via{" "}
            {paymentMethodLabel(payment.method)} will be removed. The server recalculates the
            booking balance immediately.
          </DialogDescription>
        </DialogHeader>
        {error ? <PaymentError error={error} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentField({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-blush-600">*</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function PaymentError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Payment not updated</AlertTitle>
      <AlertDescription>
        {isApiError(error) ? error.message : "Check your connection and try again."}
        {isApiError(error) ? (
          <span className="mt-1 block text-xs opacity-70">{error.code}</span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function PaymentRowsSkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading payments…</span>
    </div>
  );
}

function fieldErrors<T>(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Partial<Record<keyof T, string>> {
  const next: Partial<Record<keyof T, string>> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages?.[0]) {
      next[field as keyof T] = messages[0];
    }
  }
  return next;
}
