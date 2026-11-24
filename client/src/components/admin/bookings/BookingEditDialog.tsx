import { Boxes, Loader2, Package, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useUpdateBookingDetails } from "../../../hooks/use-admin-bookings";
import { useAdminEquipment, useAdminPackages } from "../../../hooks/use-admin-catalogue";
import type { AdminBookingDetail, AdminBookingEditInput } from "../../../lib/admin-bookings";
import { isApiError } from "../../../lib/api";
import { isValidCalendarDate, todayCalendarDate } from "../../../lib/dates";
import { formatMoney } from "../../../lib/money";
import { toast } from "../../../lib/toast";
import { QuantityStepper } from "../../booking/QuantityStepper";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Badge } from "../../ui/badge";
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
import { Textarea } from "../../ui/textarea";

type Quantities = Record<string, number>;
type FieldErrors = Partial<Record<"startDate" | "endDate" | "selection" | "note", string>>;

type EquipmentOption = {
  id: string;
  name: string;
  isActive: boolean;
  maxQuantity: number;
};

type PackageOption = {
  id: string;
  name: string;
  isActive: boolean;
  items: Array<{ equipmentId: string | null; quantity: number }>;
};

function initialEquipmentQuantities(booking: AdminBookingDetail): Quantities {
  const quantities: Quantities = {};

  for (const pkg of booking.packages) {
    for (const item of pkg.items) {
      if (item.equipmentId) {
        quantities[item.equipmentId] = (quantities[item.equipmentId] ?? 0) + item.quantity;
      }
    }
  }

  // BookingItem.quantity is only the chargeable excess over what packages already include.
  for (const item of booking.items) {
    quantities[item.equipmentId] = (quantities[item.equipmentId] ?? 0) + item.quantity;
  }

  return quantities;
}

function initialPackageQuantities(booking: AdminBookingDetail): Quantities {
  return Object.fromEntries(booking.packages.map((pkg) => [pkg.packageId, pkg.quantity]));
}

export function BookingEditDialog({
  booking,
  onClose,
}: {
  booking: AdminBookingDetail;
  onClose: () => void;
}) {
  const equipmentQuery = useAdminEquipment();
  const packageQuery = useAdminPackages();
  const update = useUpdateBookingDetails();
  const [startDate, setStartDate] = useState(booking.startDate);
  const [endDate, setEndDate] = useState(booking.endDate);
  const [packageQuantities, setPackageQuantities] = useState<Quantities>(() =>
    initialPackageQuantities(booking),
  );
  const [equipmentQuantities, setEquipmentQuantities] = useState<Quantities>(() =>
    initialEquipmentQuantities(booking),
  );
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const catalogueEquipment = equipmentQuery.data?.items ?? [];
  const cataloguePackages = packageQuery.data ?? [];

  const equipmentOptions = mergeEquipment(booking, catalogueEquipment);
  const packageOptions = mergePackages(booking, cataloguePackages);
  const equipmentById = new Map(equipmentOptions.map((item) => [item.id, item]));
  const packageById = new Map(packageOptions.map((pkg) => [pkg.id, pkg]));

  const selectedEquipmentIds = Object.keys(equipmentQuantities).filter(
    (equipmentId) => (equipmentQuantities[equipmentId] ?? 0) > 0,
  );
  const selectedPackageIds = Object.keys(packageQuantities).filter(
    (packageId) => (packageQuantities[packageId] ?? 0) > 0,
  );
  const included = includedQuantities(selectedPackageIds, packageQuantities, packageById);

  function addPackage(packageId: string) {
    if (!packageId) {
      return;
    }
    changePackage(packageId, 1);
  }

  function changePackage(packageId: string, quantity: number) {
    const next = { ...packageQuantities, [packageId]: quantity };
    if (quantity <= 0) {
      delete next[packageId];
    }
    setPackageQuantities(next);

    const nextIncluded = includedQuantities(
      Object.keys(next).filter((id) => (next[id] ?? 0) > 0),
      next,
      packageById,
    );
    setEquipmentQuantities((equipmentCurrent) => {
      const merged = { ...equipmentCurrent };
      for (const [equipmentId, includedQuantity] of nextIncluded) {
        if ((merged[equipmentId] ?? 0) < includedQuantity) {
          merged[equipmentId] = includedQuantity;
        }
      }
      return merged;
    });

    setErrors((current) => ({ ...current, selection: undefined }));
    if (update.error) {
      update.reset();
    }
  }

  function addEquipment(equipmentId: string) {
    if (!equipmentId) {
      return;
    }
    setEquipmentQuantities((current) => ({ ...current, [equipmentId]: current[equipmentId] ?? 1 }));
    setErrors((current) => ({ ...current, selection: undefined }));
    if (update.error) {
      update.reset();
    }
  }

  function changeEquipment(equipmentId: string, quantity: number) {
    setEquipmentQuantities((current) => {
      const next = { ...current, [equipmentId]: quantity };
      if (quantity <= 0) {
        delete next[equipmentId];
      }
      return next;
    });
    setErrors((current) => ({ ...current, selection: undefined }));
    if (update.error) {
      update.reset();
    }
  }

  function removeEquipment(equipmentId: string) {
    setEquipmentQuantities((current) => {
      const next = { ...current };
      delete next[equipmentId];
      return next;
    });
    if (update.error) {
      update.reset();
    }
  }

  function validate(): AdminBookingEditInput | null {
    const nextErrors: FieldErrors = {};

    if (!isValidCalendarDate(startDate)) {
      nextErrors.startDate = "Choose a valid start date";
    }
    if (!isValidCalendarDate(endDate)) {
      nextErrors.endDate = "Choose a valid end date";
    }
    if (!nextErrors.startDate && !nextErrors.endDate && startDate > endDate) {
      nextErrors.endDate = "The last day must be on or after the first day";
    }
    if (startDate !== booking.startDate && startDate < todayCalendarDate()) {
      nextErrors.startDate = "The new start date has already passed";
    }
    if (selectedEquipmentIds.length === 0 && selectedPackageIds.length === 0) {
      nextErrors.selection = "Add at least one package or equipment item";
    }

    const inactiveSelection =
      selectedPackageIds.some((packageId) => packageById.get(packageId)?.isActive === false) ||
      selectedEquipmentIds.some(
        (equipmentId) => equipmentById.get(equipmentId)?.isActive === false,
      );
    if (inactiveSelection) {
      nextErrors.selection = "Remove inactive packages or equipment before saving";
    }

    const overLimit = selectedEquipmentIds.find((equipmentId) => {
      const max = equipmentById.get(equipmentId)?.maxQuantity;
      return max !== undefined && (equipmentQuantities[equipmentId] ?? 0) > max;
    });
    if (overLimit) {
      nextErrors.selection = `Reduce ${equipmentById.get(overLimit)?.name ?? "the equipment"} to its maximum quantity`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      startDate,
      endDate,
      packages: selectedPackageIds.map((packageId) => ({
        packageId,
        quantity: packageQuantities[packageId] ?? 1,
      })),
      equipment: selectedEquipmentIds.map((equipmentId) => ({
        equipmentId,
        quantity: equipmentQuantities[equipmentId] ?? 1,
      })),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validate();
    if (!input) {
      return;
    }

    update.mutate(
      { id: booking.id, input },
      {
        onSuccess: (updated) => {
          toast.success("Booking updated", {
            description: updated.totalChanged
              ? `The new total is ${formatMoney(updated.totals.totalAmount, updated.currency)}.`
              : "The total did not change.",
          });
          onClose();
        },
      },
    );
  }

  const catalogueFailed = equipmentQuery.isError || packageQuery.isError;
  const catalogueLoading = equipmentQuery.isPending || packageQuery.isPending;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit booking · {booking.code}</DialogTitle>
          <DialogDescription>
            Change the rental dates or requested lines. Prices are recalculated from the current
            catalogue, and the customer, fulfilment details and payments stay unchanged.
          </DialogDescription>
        </DialogHeader>

        {update.error ? (
          <Alert variant="destructive">
            <AlertTitle>Booking not updated</AlertTitle>
            <AlertDescription>
              {isApiError(update.error)
                ? update.error.message
                : "Check your connection and try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        {catalogueFailed ? (
          <ErrorState
            title="The catalogue could not load"
            error={equipmentQuery.error ?? packageQuery.error}
            onRetry={() => {
              void equipmentQuery.refetch();
              void packageQuery.refetch();
            }}
            isRetrying={equipmentQuery.isFetching || packageQuery.isFetching}
          />
        ) : null}

        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-start-date">
                First day <span className="text-blush-600">*</span>
              </Label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setErrors((current) => ({ ...current, startDate: undefined }));
                  if (update.error) update.reset();
                }}
                className="mt-1.5"
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? "edit-start-date-error" : undefined}
              />
              {errors.startDate ? (
                <p id="edit-start-date-error" className="mt-1 text-xs font-medium text-red-600">
                  {errors.startDate}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="edit-end-date">
                Last day <span className="text-blush-600">*</span>
              </Label>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setErrors((current) => ({ ...current, endDate: undefined }));
                  if (update.error) update.reset();
                }}
                className="mt-1.5"
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? "edit-end-date-error" : undefined}
              />
              {errors.endDate ? (
                <p id="edit-end-date-error" className="mt-1 text-xs font-medium text-red-600">
                  {errors.endDate}
                </p>
              ) : null}
            </div>
          </div>

          <section aria-labelledby="edit-packages-heading">
            <div className="flex items-center justify-between gap-3">
              <h3
                id="edit-packages-heading"
                className="flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <Package aria-hidden="true" className="size-4 text-blush-700" />
                Packages
              </h3>
              <select
                aria-label="Add package"
                value=""
                disabled={catalogueLoading}
                onChange={(event) => addPackage(event.target.value)}
                className="h-9 max-w-52 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                <option value="">Add package…</option>
                {cataloguePackages
                  .filter((pkg) => pkg.isActive && (packageQuantities[pkg.id] ?? 0) === 0)
                  .map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
              </select>
            </div>

            {selectedPackageIds.length === 0 ? (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                No packages selected.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedPackageIds.map((packageId) => {
                  const pkg = packageById.get(packageId);
                  const quantity = packageQuantities[packageId] ?? 1;
                  return (
                    <li
                      key={packageId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {pkg?.name ?? packageId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {pkg?.isActive === false
                            ? "Inactive package"
                            : `${pkg?.items.length ?? 0} equipment item${pkg?.items.length === 1 ? "" : "s"} included`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          value={quantity}
                          min={1}
                          max={50}
                          label={`${pkg?.name ?? packageId} package`}
                          onChange={(next) => changePackage(packageId, next)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-red-700 hover:bg-red-50"
                          onClick={() => changePackage(packageId, 0)}
                          aria-label={`Remove ${pkg?.name ?? packageId} package`}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="edit-equipment-heading">
            <div className="flex items-center justify-between gap-3">
              <h3
                id="edit-equipment-heading"
                className="flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <Boxes aria-hidden="true" className="size-4 text-brand-700" />
                Equipment
              </h3>
              <select
                aria-label="Add equipment"
                value=""
                disabled={catalogueLoading}
                onChange={(event) => addEquipment(event.target.value)}
                className="h-9 max-w-52 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                <option value="">Add equipment…</option>
                {catalogueEquipment
                  .filter((item) => item.isActive && (equipmentQuantities[item.id] ?? 0) === 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>

            {selectedEquipmentIds.length === 0 ? (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                No equipment selected.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedEquipmentIds.map((equipmentId) => {
                  const item = equipmentById.get(equipmentId);
                  const includedQuantity = included.get(equipmentId) ?? 0;
                  const quantity = equipmentQuantities[equipmentId] ?? 1;
                  return (
                    <li
                      key={equipmentId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                          {item?.name ?? equipmentId}
                          {item?.isActive === false ? (
                            <Badge variant="warning">Inactive</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                          {includedQuantity > 0
                            ? `${includedQuantity} included by package · enter total requested units`
                            : "Requested units"}
                          {item?.maxQuantity ? ` · max ${item.maxQuantity}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          value={quantity}
                          min={Math.max(1, includedQuantity)}
                          max={Math.max(item?.maxQuantity ?? 999, includedQuantity)}
                          label={item?.name ?? equipmentId}
                          onChange={(next) => changeEquipment(equipmentId, next)}
                        />
                        {includedQuantity === 0 ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-red-700 hover:bg-red-50"
                            onClick={() => removeEquipment(equipmentId)}
                            aria-label={`Remove ${item?.name ?? equipmentId}`}
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {errors.selection ? (
            <p className="text-xs font-medium text-red-600">{errors.selection}</p>
          ) : null}

          <div>
            <Label htmlFor="edit-note">Reason / note</Label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setErrors((current) => ({ ...current, note: undefined }));
                if (update.error) update.reset();
              }}
              maxLength={500}
              placeholder="Optional note for the edit history."
              className="mt-1.5 min-h-20"
              aria-invalid={Boolean(errors.note)}
              aria-describedby={errors.note ? "edit-note-error" : undefined}
            />
            {errors.note ? (
              <p id="edit-note-error" className="mt-1 text-xs font-medium text-red-600">
                {errors.note}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                {note.length}/500. Saved with the previous and new booking snapshot.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Current total{" "}
            <strong className="text-slate-900">
              {formatMoney(booking.totals.totalAmount, booking.currency)}
            </strong>
            . The server checks stock, recalculates the total and recalculates the balance after
            saving.
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending || catalogueFailed}>
              {update.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function mergeEquipment(
  booking: AdminBookingDetail,
  catalogue: Array<{
    id: string;
    name: string;
    isActive: boolean;
    maxQuantity: number;
  }>,
): EquipmentOption[] {
  const merged = new Map(catalogue.map((item) => [item.id, item]));
  for (const line of booking.items) {
    if (!merged.has(line.equipmentId)) {
      merged.set(line.equipmentId, {
        id: line.equipmentId,
        name: line.equipmentName,
        isActive: false,
        maxQuantity: 999,
      });
    }
  }
  return [...merged.values()];
}

function mergePackages(
  booking: AdminBookingDetail,
  catalogue: Array<{
    id: string;
    name: string;
    isActive: boolean;
    items: Array<{ equipmentId: string; quantity: number }>;
  }>,
): PackageOption[] {
  const merged = new Map<string, PackageOption>(
    catalogue.map((pkg) => [
      pkg.id,
      {
        id: pkg.id,
        name: pkg.name,
        isActive: pkg.isActive,
        items: pkg.items.map((item) => ({
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      },
    ]),
  );

  for (const pkg of booking.packages) {
    if (!merged.has(pkg.packageId)) {
      merged.set(pkg.packageId, {
        id: pkg.packageId,
        name: pkg.packageName,
        isActive: false,
        items: pkg.items.map((item) => ({
          equipmentId: item.equipmentId,
          // Snapshot quantities are already multiplied by the booked package quantity.
          quantity: item.quantity / pkg.quantity,
        })),
      });
    }
  }

  return [...merged.values()];
}

function includedQuantities(
  selectedPackageIds: string[],
  packageQuantities: Quantities,
  packageById: Map<string, PackageOption>,
): Map<string, number> {
  const included = new Map<string, number>();
  for (const packageId of selectedPackageIds) {
    const pkg = packageById.get(packageId);
    const quantity = packageQuantities[packageId] ?? 0;
    if (!pkg || quantity <= 0) {
      continue;
    }
    for (const item of pkg.items) {
      if (!item.equipmentId) {
        continue;
      }
      included.set(
        item.equipmentId,
        (included.get(item.equipmentId) ?? 0) + item.quantity * quantity,
      );
    }
  }
  return included;
}
