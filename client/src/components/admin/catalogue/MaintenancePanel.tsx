import { CalendarOff, Trash2, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useAdminBlackouts,
  useAdminEquipment,
  useDeleteBlackout,
  useSaveBlackout,
} from "../../../hooks/use-admin-catalogue";
import type { AdminBlackout, BlackoutFormValues, FieldErrors } from "../../../lib/admin-catalogue";
import {
  blackoutFormSchema,
  blackoutPayload,
  emptyBlackoutForm,
  formFieldErrors,
} from "../../../lib/admin-catalogue";
import { formatLongDate, todayCalendarDate } from "../../../lib/dates";
import { toast } from "../../../lib/toast";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ErrorState } from "../../ui/error-state";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import {
  CatalogueDialog,
  CatalogueTableSkeleton,
  ConfirmDialog,
  EmptyCatalogueState,
  FormActions,
  FormError,
  FormField,
  PanelHeader,
  nativeSelectClassName,
} from "./shared";

export function MaintenancePanel() {
  const blackouts = useAdminBlackouts();
  const equipment = useAdminEquipment();
  const remove = useDeleteBlackout();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminBlackout | null>(null);
  const today = todayCalendarDate();
  const rows = blackouts.data ?? [];
  const equipmentRows = equipment.data?.items ?? [];

  return (
    <section aria-labelledby="maintenance-catalogue-heading">
      <div id="maintenance-catalogue-heading">
        <PanelHeader
          title="Maintenance blackouts"
          description="Take an item out of the bookable pool for specific dates without hiding it from the catalogue. Blackouts block new requests and confirmations."
          count={rows.length}
          createLabel="Block dates"
          onCreate={() => setCreating(true)}
        />
      </div>

      {blackouts.isPending || equipment.isPending ? (
        <CatalogueTableSkeleton columns={4} />
      ) : blackouts.isError ? (
        <div className="mt-5">
          <ErrorState
            error={blackouts.error}
            title="Could not load maintenance blackouts"
            onRetry={() => blackouts.refetch()}
            isRetrying={blackouts.isFetching}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={Wrench}
          title="No maintenance scheduled"
          description="Block an item when it is damaged or being repaired. It stays in the catalogue and returns automatically after the end date."
          actionLabel="Block dates"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Equipment</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((blackout) => {
                const status = blackoutStatus(blackout, today);
                return (
                  <TableRow key={blackout.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                          <CalendarOff aria-hidden="true" className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{blackout.equipment.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {blackout.equipment.slug}
                            {blackout.equipment.isActive ? "" : " · inactive"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-800">{formatLongDate(blackout.startDate)}</p>
                      <p className="text-xs text-slate-500">
                        to {formatLongDate(blackout.endDate)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs text-sm leading-relaxed text-slate-700">
                        {blackout.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50"
                          onClick={() => setDeleting(blackout)}
                          aria-label={`Remove blackout for ${blackout.equipment.name}`}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {equipment.isError ? (
        <ErrorState
          error={equipment.error}
          title="Could not load equipment options"
          onRetry={() => equipment.refetch()}
          isRetrying={equipment.isFetching}
          className="mt-5"
        />
      ) : null}

      {creating ? (
        <BlackoutFormDialog
          key="new-blackout"
          equipment={equipmentRows}
          today={today}
          onClose={() => setCreating(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            remove.reset();
          }
        }}
        title={
          deleting
            ? `Remove blackout for ${deleting.equipment.name}?`
            : "Remove maintenance blackout?"
        }
        description="The item becomes bookable again for these dates. Existing bookings are not changed."
        confirmLabel="Remove blackout"
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Blackout removed", {
                description: `${deleting.equipment.name} is bookable again for those dates.`,
              });
              setDeleting(null);
            },
          });
        }}
      />
    </section>
  );
}

export function BlackoutFormDialog({
  equipment,
  today,
  onClose,
}: {
  equipment: Array<{ id: string; name: string; isActive: boolean }>;
  today: string;
  onClose: () => void;
}) {
  const initialEquipmentId = equipment.find((item) => item.isActive)?.id ?? equipment[0]?.id ?? "";
  const [values, setValues] = useState<BlackoutFormValues>(() =>
    emptyBlackoutForm(initialEquipmentId, today),
  );
  const [errors, setErrors] = useState<FieldErrors<BlackoutFormValues>>({});
  const save = useSaveBlackout();

  function setField<K extends keyof BlackoutFormValues>(field: K, value: BlackoutFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = blackoutFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<BlackoutFormValues>(parsed.error));
      return;
    }

    save.mutate(blackoutPayload(parsed.data), {
      onSuccess: (created) => {
        toast.success("Maintenance dates blocked", {
          description: `${created.equipment.name} is unavailable from ${formatLongDate(
            created.startDate,
          )} to ${formatLongDate(created.endDate)}.`,
        });
        onClose();
      },
    });
  }

  return (
    <CatalogueDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title="Block maintenance dates"
      description="Every unit of the selected item is removed from availability for the inclusive date range."
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <FormField
          label="Equipment"
          htmlFor="blackout-equipment"
          required
          error={errors.equipmentId}
        >
          <select
            id="blackout-equipment"
            value={values.equipmentId}
            onChange={(event) => setField("equipmentId", event.target.value)}
            className={nativeSelectClassName}
            aria-invalid={Boolean(errors.equipmentId)}
            aria-describedby={errors.equipmentId ? "blackout-equipment-error" : undefined}
            autoFocus
          >
            <option value="">Choose an equipment item</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First day" htmlFor="blackout-start" required error={errors.startDate}>
            <Input
              id="blackout-start"
              type="date"
              value={values.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate ? "blackout-start-error" : undefined}
            />
          </FormField>
          <FormField label="Last day" htmlFor="blackout-end" required error={errors.endDate}>
            <Input
              id="blackout-end"
              type="date"
              value={values.endDate}
              onChange={(event) => setField("endDate", event.target.value)}
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? "blackout-end-error" : undefined}
            />
          </FormField>
        </div>

        <FormField
          label="Reason"
          htmlFor="blackout-reason"
          required
          error={errors.reason}
          hint={`${values.reason.length}/500 characters. Visible to admins only.`}
        >
          <Textarea
            id="blackout-reason"
            value={values.reason}
            onChange={(event) => setField("reason", event.target.value)}
            maxLength={500}
            placeholder="e.g. Damaged blower; awaiting repair."
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? "blackout-reason-error" : undefined}
          />
        </FormField>

        <FormActions pending={save.isPending} submitLabel="Block dates" onCancel={onClose} />
      </form>
    </CatalogueDialog>
  );
}

function blackoutStatus(
  blackout: AdminBlackout,
  today: string,
): { label: string; variant: "warning" | "outline" | "secondary" } {
  if (blackout.endDate < today) {
    return { label: "Past", variant: "secondary" };
  }
  if (blackout.startDate > today) {
    return { label: "Upcoming", variant: "outline" };
  }
  return { label: "Active now", variant: "warning" };
}
