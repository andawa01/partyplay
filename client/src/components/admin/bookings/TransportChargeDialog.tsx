import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useUpdateTransportCharge } from "../../../hooks/use-admin-bookings";
import type { AdminBookingDetail } from "../../../lib/admin-bookings";
import { transportChargeSchema } from "../../../lib/admin-bookings";
import { isApiError } from "../../../lib/api";
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
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export function TransportChargeDialog({
  booking,
  onClose,
}: {
  booking: AdminBookingDetail;
  onClose: () => void;
}) {
  const update = useUpdateTransportCharge();
  const [value, setValue] = useState(booking.totals.transportCharge);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = transportChargeSchema.safeParse({ transportCharge: value });
    if (!parsed.success) {
      setError(
        parsed.error.flatten().fieldErrors.transportCharge?.[0] ?? "Enter a valid transport charge",
      );
      return;
    }

    setError("");
    update.mutate(
      { id: booking.id, transportCharge: Number(parsed.data.transportCharge) },
      {
        onSuccess: (updated) => {
          toast.success("Transport charge updated", {
            description: updated.totalChanged
              ? `The booking total is now ${formatMoney(updated.totals.totalAmount, updated.currency)}.`
              : "The booking total did not change.",
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
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transport charge · {booking.code}</DialogTitle>
          <DialogDescription>
            Set the delivery or collection charge. The server recalculates the booking total; this
            screen never adds the amount itself.
          </DialogDescription>
        </DialogHeader>

        {update.error ? (
          <Alert variant="destructive">
            <AlertTitle>Transport charge not updated</AlertTitle>
            <AlertDescription>
              {isApiError(update.error)
                ? update.error.message
                : "Check your connection and try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Current charge:{" "}
            <strong className="text-slate-900">
              {formatMoney(booking.totals.transportCharge, booking.currency)}
            </strong>
          </div>

          <div>
            <Label htmlFor="transport-charge">New transport charge</Label>
            <Input
              id="transport-charge"
              inputMode="decimal"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
                if (update.error) {
                  update.reset();
                }
              }}
              placeholder="0.00"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "transport-charge-error" : undefined}
              className="mt-1.5"
            />
            {error ? (
              <p id="transport-charge-error" className="mt-1.5 text-xs font-medium text-red-600">
                {error}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                The customer may need to be told if the total changes.
              </p>
            )}
          </div>

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
                "Save transport charge"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
