import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useUpdateBookingStatus } from "../../../hooks/use-admin-bookings";
import type {
  AdminBookingDetail,
  BookingActionOption,
  BookingAvailabilityCheck,
} from "../../../lib/admin-bookings";
import { bookingActionFormSchema, type BookingActionFormValues } from "../../../lib/admin-bookings";
import { isApiError } from "../../../lib/api";
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
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { AvailabilityResult } from "./AvailabilityResult";

type FormErrors = Partial<Record<keyof BookingActionFormValues, string>>;

export function BookingActionDialog({
  booking,
  action,
  availability,
  onClose,
}: {
  booking: AdminBookingDetail;
  action: BookingActionOption;
  availability?: BookingAvailabilityCheck;
  onClose: () => void;
}) {
  const update = useUpdateBookingStatus();
  const [values, setValues] = useState<BookingActionFormValues>({
    reason: "",
    note: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const isConfirm = action.to === "CONFIRMED";
  const stockBlocksConfirm = isConfirm && (!availability || !availability.available);

  function setField(field: keyof BookingActionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (update.error) {
      update.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stockBlocksConfirm) {
      return;
    }

    const parsed = bookingActionFormSchema(action.to).safeParse(values);
    if (!parsed.success) {
      const next: FormErrors = {};
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages?.[0]) {
          next[field as keyof BookingActionFormValues] = messages[0];
        }
      }
      setErrors(next);
      return;
    }

    update.mutate(
      {
        id: booking.id,
        status: action.to,
        reason: parsed.data.reason || undefined,
        note: parsed.data.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${action.shortLabel} saved`, {
            description: `${booking.code} is now ${action.to.toLowerCase()}.`,
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
          <DialogTitle>
            {action.label} · {booking.code}
          </DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>

        {isConfirm ? (
          availability ? (
            <AvailabilityResult check={availability} compact />
          ) : (
            <Alert variant="warning">
              <AlertTitle>Check availability first</AlertTitle>
              <AlertDescription>
                Run the stock check before confirming this booking.
              </AlertDescription>
            </Alert>
          )
        ) : null}

        {update.error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {isApiError(update.error) && update.error.code === "INVALID_TRANSITION"
                ? "That status change is not allowed"
                : "The booking was not updated"}
            </AlertTitle>
            <AlertDescription>
              {isApiError(update.error)
                ? update.error.message
                : "Check your connection and try again."}
              {isApiError(update.error) ? (
                <span className="mt-1 block text-xs opacity-70">{update.error.code}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-4" noValidate>
          {!isConfirm ? (
            <>
              <div>
                <Label htmlFor="booking-action-reason">
                  Reason
                  {action.requiresReason ? (
                    <span className="text-blush-600">*</span>
                  ) : (
                    " (optional)"
                  )}
                </Label>
                <Textarea
                  id="booking-action-reason"
                  value={values.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                  maxLength={500}
                  placeholder={
                    action.to === "REJECTED"
                      ? "e.g. The requested castle is already booked on that date."
                      : action.to === "CANCELLED"
                        ? "e.g. Customer changed their plans."
                        : "Optional completion note."
                  }
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={errors.reason ? "booking-action-reason-error" : undefined}
                  className="mt-1.5"
                />
                {errors.reason ? (
                  <p
                    id="booking-action-reason-error"
                    className="mt-1.5 text-xs font-medium text-red-600"
                  >
                    {errors.reason}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="booking-action-note">Internal note (optional)</Label>
                <Textarea
                  id="booking-action-note"
                  value={values.note}
                  onChange={(event) => setField("note", event.target.value)}
                  maxLength={1000}
                  placeholder="Visible to the admin team in the booking history."
                  aria-invalid={Boolean(errors.note)}
                  aria-describedby={errors.note ? "booking-action-note-error" : undefined}
                  className="mt-1.5 min-h-16"
                />
                {errors.note ? (
                  <p
                    id="booking-action-note-error"
                    className="mt-1.5 text-xs font-medium text-red-600"
                  >
                    {errors.note}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              Confirming commits this booking&apos;s stock. The server checks availability again
              inside the transaction, so a lapsed hold cannot oversell the dates.
            </p>
          )}

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Keep as is
            </Button>
            <Button
              type="submit"
              variant={action.destructive ? "destructive" : "default"}
              disabled={update.isPending || stockBlocksConfirm}
              aria-busy={update.isPending}
            >
              {update.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Updating…
                </>
              ) : (
                action.label
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
