import { Archive, Boxes, PackageOpen, Pencil, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useAdminCategories,
  useAdminEquipment,
  useDeactivateEquipment,
  useSaveEquipment,
  useSetInventory,
} from "../../../hooks/use-admin-catalogue";
import type {
  AdminCategory,
  AdminEquipment,
  EquipmentFormValues,
  FieldErrors,
} from "../../../lib/admin-catalogue";
import {
  emptyEquipmentForm,
  equipmentFormSchema,
  equipmentPayload,
  equipmentToForm,
  formFieldErrors,
  pricingModeLabel,
} from "../../../lib/admin-catalogue";
import { formatMoney } from "../../../lib/money";
import { toast } from "../../../lib/toast";
import { ErrorState } from "../../ui/error-state";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  CatalogueDialog,
  CatalogueTableSkeleton,
  ConfirmDialog,
  EmptyCatalogueState,
  FormActions,
  FormError,
  FormField,
  PanelHeader,
  StatusBadge,
  ToggleField,
  nativeSelectClassName,
} from "./shared";

export function EquipmentPanel({ currency }: { currency: string }) {
  const categories = useAdminCategories();
  const equipment = useAdminEquipment();
  const deactivate = useDeactivateEquipment();
  const [editing, setEditing] = useState<AdminEquipment | null>(null);
  const [creating, setCreating] = useState(false);
  const [inventoryItem, setInventoryItem] = useState<AdminEquipment | null>(null);
  const [deactivating, setDeactivating] = useState<AdminEquipment | null>(null);

  const flatCategories = flattenCategories(categories.data ?? []);
  const categoryIdBySlug = new Map(
    flatCategories.map((category) => [category.slug, category.id]),
  );
  const rows = equipment.data?.items ?? [];

  return (
    <section aria-labelledby="equipment-catalogue-heading">
      <div id="equipment-catalogue-heading">
        <PanelHeader
          title="Equipment"
          description="Every item the public catalogue can show. Deactivate an item to hide it without losing its booking history."
          count={equipment.data?.total ?? rows.length}
          createLabel="Add equipment"
          onCreate={() => setCreating(true)}
        />
      </div>

      {categories.isError ? (
        <ErrorState
          error={categories.error}
          title="Could not load categories"
          onRetry={() => categories.refetch()}
          isRetrying={categories.isFetching}
          className="mt-5"
        />
      ) : null}

      {equipment.isPending ? (
        <CatalogueTableSkeleton columns={5} />
      ) : equipment.isError ? (
        <ErrorState
          error={equipment.error}
          title="Could not load equipment"
          onRetry={() => equipment.refetch()}
          isRetrying={equipment.isFetching}
          className="mt-5"
        />
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={PackageOpen}
          title="No equipment yet"
          description="Add your first item and it will appear on the public catalogue immediately."
          actionLabel="Add equipment"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Item</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Boxes aria-hidden="true" className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {item.category?.name ?? "Uncategorised"} · {item.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">
                      {priceForItem(item, currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {pricingModeLabel(item.pricingMode)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.total <= 0
                          ? "font-semibold text-amber-700"
                          : "font-semibold text-slate-800"
                      }
                    >
                      {item.total} units
                    </span>
                    <p className="text-xs text-slate-500">
                      Min {item.minQuantity} · max {item.maxQuantity}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={item.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setInventoryItem(item)}
                        aria-label={`Set stock for ${item.name}`}
                      >
                        <Boxes aria-hidden="true" className="size-3.5" />
                        Stock
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </Button>
                      {item.isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-amber-700 hover:bg-amber-50"
                          onClick={() => setDeactivating(item)}
                          aria-label={`Deactivate ${item.name}`}
                        >
                          <Archive aria-hidden="true" className="size-3.5" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(item)}
                          aria-label={`Reactivate ${item.name}`}
                        >
                          <RotateCcw aria-hidden="true" className="size-3.5" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating ? (
        <EquipmentFormDialog
          key="new-equipment"
          categories={flatCategories}
          categoryIdBySlug={categoryIdBySlug}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <EquipmentFormDialog
          key={editing.id}
          equipment={editing}
          categories={flatCategories}
          categoryIdBySlug={categoryIdBySlug}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {inventoryItem ? (
        <InventoryDialog
          item={inventoryItem}
          onClose={() => setInventoryItem(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivating(null);
            deactivate.reset();
          }
        }}
        title={deactivating ? `Deactivate ${deactivating.name}?` : "Deactivate item?"}
        description="The item will disappear from the public catalogue and cannot be booked. Existing bookings keep their records, and you can reactivate it later."
        confirmLabel="Deactivate item"
        destructive
        pending={deactivate.isPending}
        error={deactivate.error}
        onConfirm={() => {
          if (!deactivating) {
            return;
          }
          deactivate.mutate(deactivating.id, {
            onSuccess: () => {
              toast.success("Equipment deactivated", {
                description: `${deactivating.name} is now hidden from the public catalogue.`,
              });
              setDeactivating(null);
            },
          });
        }}
      />
    </section>
  );
}

export function EquipmentFormDialog({
  equipment,
  categories,
  categoryIdBySlug,
  onClose,
}: {
  equipment?: AdminEquipment;
  categories: AdminCategory[];
  categoryIdBySlug: Map<string, string>;
  onClose: () => void;
}) {
  const initialCategoryId = equipment
    ? categoryIdBySlug.get(equipment.category?.slug ?? "") ?? ""
    : categories[0]?.id ?? "";
  const [values, setValues] = useState<EquipmentFormValues>(() =>
    equipment
      ? equipmentToForm(equipment, initialCategoryId)
      : emptyEquipmentForm(initialCategoryId),
  );
  const [errors, setErrors] = useState<FieldErrors<EquipmentFormValues>>({});
  const save = useSaveEquipment();

  function setField<K extends keyof EquipmentFormValues>(
    field: K,
    value: EquipmentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = equipmentFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<EquipmentFormValues>(parsed.error));
      return;
    }

    save.mutate(
      { id: equipment?.id, input: equipmentPayload(parsed.data) },
      {
        onSuccess: () => {
          toast.success(equipment ? "Equipment updated" : "Equipment added", {
            description: equipment
              ? `${parsed.data.name} has been saved.`
              : `${parsed.data.name} is now visible on the public catalogue.`,
          });
          onClose();
        },
      },
    );
  }

  return (
    <CatalogueDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={equipment ? `Edit ${equipment.name}` : "Add equipment"}
      description="Prices and stock are managed here. Changes reach the public catalogue as soon as they are saved."
      wide
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            htmlFor="equipment-name"
            required
            error={errors.name}
          >
            <Input
              id="equipment-name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. White folding chairs"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "equipment-name-error" : undefined}
              autoFocus
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="equipment-slug"
            required={!equipment}
            error={errors.slug}
            hint={equipment ? "The public URL keeps its original slug." : "Lowercase words separated by hyphens."}
          >
            <Input
              id="equipment-slug"
              value={values.slug}
              onChange={(event) => setField("slug", event.target.value)}
              disabled={Boolean(equipment)}
              placeholder="white-folding-chairs"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? "equipment-slug-error" : undefined}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Category"
            htmlFor="equipment-category"
            required
            error={errors.categoryId}
          >
            <select
              id="equipment-category"
              value={values.categoryId}
              onChange={(event) => setField("categoryId", event.target.value)}
              className={nativeSelectClassName}
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={
                errors.categoryId ? "equipment-category-error" : undefined
              }
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parentId ? "— " : ""}
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Pricing mode"
            htmlFor="equipment-pricing-mode"
            error={errors.pricingMode}
          >
            <select
              id="equipment-pricing-mode"
              value={values.pricingMode}
              onChange={(event) =>
                setField("pricingMode", event.target.value as "PER_DAY" | "FLAT")
              }
              className={nativeSelectClassName}
            >
              <option value="PER_DAY">Per day</option>
              <option value="FLAT">Flat rate</option>
            </select>
          </FormField>
        </div>

        <FormField
          label="Description"
          htmlFor="equipment-description"
          error={errors.description}
          hint={`${values.description.length}/2000 characters`}
        >
          <Textarea
            id="equipment-description"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            maxLength={2000}
            placeholder="What is included, colour options, setup notes…"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "equipment-description-error" : undefined
            }
          />
        </FormField>

        <FormField
          label="Image URL"
          htmlFor="equipment-image"
          error={errors.imageUrl}
          hint="Optional. A direct https image link."
        >
          <Input
            id="equipment-image"
            type="url"
            value={values.imageUrl}
            onChange={(event) => setField("imageUrl", event.target.value)}
            placeholder="https://…"
            aria-invalid={Boolean(errors.imageUrl)}
            aria-describedby={errors.imageUrl ? "equipment-image-error" : undefined}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Daily price"
            htmlFor="equipment-price-day"
            error={errors.pricePerDay}
            required={values.pricingMode === "PER_DAY"}
          >
            <Input
              id="equipment-price-day"
              inputMode="decimal"
              value={values.pricePerDay}
              onChange={(event) => setField("pricePerDay", event.target.value)}
              placeholder="0.00"
              aria-invalid={Boolean(errors.pricePerDay)}
              aria-describedby={
                errors.pricePerDay ? "equipment-price-day-error" : undefined
              }
            />
          </FormField>
          <FormField
            label="Weekly price"
            htmlFor="equipment-price-week"
            error={errors.pricePerWeek}
            hint="Optional secondary rate."
          >
            <Input
              id="equipment-price-week"
              inputMode="decimal"
              value={values.pricePerWeek}
              onChange={(event) => setField("pricePerWeek", event.target.value)}
              placeholder="0.00"
              aria-invalid={Boolean(errors.pricePerWeek)}
              aria-describedby={
                errors.pricePerWeek ? "equipment-price-week-error" : undefined
              }
            />
          </FormField>
          <FormField
            label="Flat price"
            htmlFor="equipment-price-flat"
            error={errors.flatPrice}
            required={values.pricingMode === "FLAT"}
          >
            <Input
              id="equipment-price-flat"
              inputMode="decimal"
              value={values.flatPrice}
              onChange={(event) => setField("flatPrice", event.target.value)}
              placeholder="0.00"
              aria-invalid={Boolean(errors.flatPrice)}
              aria-describedby={
                errors.flatPrice ? "equipment-price-flat-error" : undefined
              }
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Minimum quantity"
            htmlFor="equipment-min-quantity"
            required
            error={errors.minQuantity}
          >
            <Input
              id="equipment-min-quantity"
              inputMode="numeric"
              value={values.minQuantity}
              onChange={(event) => setField("minQuantity", event.target.value)}
              aria-invalid={Boolean(errors.minQuantity)}
              aria-describedby={
                errors.minQuantity ? "equipment-min-quantity-error" : undefined
              }
            />
          </FormField>
          <FormField
            label="Maximum quantity"
            htmlFor="equipment-max-quantity"
            required
            error={errors.maxQuantity}
          >
            <Input
              id="equipment-max-quantity"
              inputMode="numeric"
              value={values.maxQuantity}
              onChange={(event) => setField("maxQuantity", event.target.value)}
              aria-invalid={Boolean(errors.maxQuantity)}
              aria-describedby={
                errors.maxQuantity ? "equipment-max-quantity-error" : undefined
              }
            />
          </FormField>
        </div>

        <FormField
          label="Internal note"
          htmlFor="equipment-note"
          error={errors.note}
          hint="Shown with the item on the public detail page. Keep it customer-friendly."
        >
          <Textarea
            id="equipment-note"
            value={values.note}
            onChange={(event) => setField("note", event.target.value)}
            maxLength={1000}
            placeholder="Optional note for the public listing."
            aria-invalid={Boolean(errors.note)}
            aria-describedby={errors.note ? "equipment-note-error" : undefined}
          />
        </FormField>

        <ToggleField
          id="equipment-active"
          label="Visible on the public catalogue"
          description="Turn this off to hide the item without deleting its history."
          checked={values.isActive}
          onChange={(checked) => setField("isActive", checked)}
        />

        <FormActions
          pending={save.isPending}
          submitLabel={equipment ? "Save equipment" : "Add equipment"}
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}

function InventoryDialog({
  item,
  onClose,
}: {
  item: AdminEquipment;
  onClose: () => void;
}) {
  const [total, setTotal] = useState(String(item.total));
  const [error, setError] = useState("");
  const setInventory = useSetInventory();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d+$/.test(total) || Number(total) > 100_000) {
      setError("Enter a whole number from 0 to 100,000");
      return;
    }
    setError("");
    setInventory.mutate(
      { id: item.id, total: Number(total) },
      {
        onSuccess: () => {
          toast.success("Stock updated", {
            description: `${item.name} now has ${total} units available to book.`,
          });
          onClose();
        },
      },
    );
  }

  return (
    <CatalogueDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={`Set stock for ${item.name}`}
      description="This is the total number of units owned. Date-specific availability is calculated separately from bookings."
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={setInventory.error} />
        <FormField
          label="Units owned"
          htmlFor="inventory-total"
          required
          error={error}
          hint="Set to 0 to mark the item as unavailable without deactivating it."
        >
          <Input
            id="inventory-total"
            inputMode="numeric"
            value={total}
            onChange={(event) => {
              setTotal(event.target.value);
              setError("");
              if (setInventory.error) {
                setInventory.reset();
              }
            }}
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "inventory-total-error" : undefined}
          />
        </FormField>
        <FormActions
          pending={setInventory.isPending}
          submitLabel="Save stock"
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}

function flattenCategories(categories: AdminCategory[]): AdminCategory[] {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}

function priceForItem(item: AdminEquipment, currency: string): string {
  if (item.pricingMode === "FLAT" && item.flatPrice) {
    return `${formatMoney(item.flatPrice, currency)} flat`;
  }
  if (item.pricePerDay) {
    return `${formatMoney(item.pricePerDay, currency)} / day`;
  }
  if (item.flatPrice) {
    return `${formatMoney(item.flatPrice, currency)} flat`;
  }
  return "Price on request";
}
