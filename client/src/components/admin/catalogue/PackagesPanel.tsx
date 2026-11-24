import { Package, PackageOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useAdminEquipment,
  useAdminPackages,
  useDeletePackage,
  useSavePackage,
} from "../../../hooks/use-admin-catalogue";
import type {
  AdminEquipment,
  AdminPackage,
  FieldErrors,
  PackageFormValues,
} from "../../../lib/admin-catalogue";
import {
  emptyPackageForm,
  formFieldErrors,
  packageFormSchema,
  packagePayload,
  packageToForm,
} from "../../../lib/admin-catalogue";
import { formatMoney } from "../../../lib/money";
import { toast } from "../../../lib/toast";
import { ImageUploadField } from "./ImageUploadField";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ErrorState } from "../../ui/error-state";
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

export function PackagesPanel({ currency }: { currency: string }) {
  const packages = useAdminPackages();
  const equipment = useAdminEquipment();
  const remove = useDeletePackage();
  const [editing, setEditing] = useState<AdminPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminPackage | null>(null);

  const rows = packages.data ?? [];
  const equipmentRows = equipment.data?.items ?? [];

  return (
    <section aria-labelledby="package-catalogue-heading">
      <div id="package-catalogue-heading">
        <PanelHeader
          title="Packages"
          description="Bundles priced per package. Edit the included equipment here; the public package page updates immediately."
          count={rows.length}
          createLabel="Add package"
          onCreate={() => setCreating(true)}
        />
      </div>

      {equipment.isError ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Equipment could not be loaded, so the package item editor may be incomplete.
        </p>
      ) : null}

      {packages.isPending ? (
        <CatalogueTableSkeleton columns={4} />
      ) : packages.isError ? (
        <div className="mt-5">
          <ErrorState
            error={packages.error}
            title="Could not load packages"
            onRetry={() => packages.refetch()}
            isRetrying={packages.isFetching}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={PackageOpen}
          title="No packages yet"
          description="Create a package to group equipment into a ready-to-book bundle."
          actionLabel="Add package"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Package</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Included</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
                        {pkg.imageUrl ? (
                          <img
                            src={pkg.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Package aria-hidden="true" className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium text-slate-900">{pkg.name}</p>
                          {pkg.isFeatured ? (
                            <Badge variant="secondary">Featured</Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {pkg.slug}
                          {pkg.duration ? ` · ${pkg.duration} days` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">
                      {formatMoney(pkg.price, currency)}
                    </p>
                    <p className="text-xs text-slate-500">per package</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">
                      {pkg.items.length} item{pkg.items.length === 1 ? "" : "s"}
                    </p>
                    <p className="max-w-48 truncate text-xs text-slate-500">
                      {pkg.items.length > 0
                        ? pkg.items
                            .map((item) => `${item.quantity}× ${item.equipment.name}`)
                            .join(", ")
                        : "No equipment added"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={pkg.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(pkg)}
                        aria-label={`Edit ${pkg.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setDeleting(pkg)}
                        aria-label={`Delete ${pkg.name}`}
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating ? (
        <PackageFormDialog
          key="new-package"
          equipment={equipmentRows}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <PackageFormDialog
          key={editing.id}
          pkg={editing}
          equipment={equipmentRows}
          onClose={() => setEditing(null)}
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
        title={deleting ? `Delete ${deleting.name}?` : "Delete package?"}
        description="A package that has never appeared on a booking is removed permanently. If it has booking history, the server will keep it and ask you to deactivate it instead."
        confirmLabel="Delete package"
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Package deleted", {
                description: `${deleting.name} has been removed.`,
              });
              setDeleting(null);
            },
          });
        }}
      />
    </section>
  );
}

export function PackageFormDialog({
  pkg,
  equipment,
  onClose,
}: {
  pkg?: AdminPackage;
  equipment: AdminEquipment[];
  onClose: () => void;
}) {
  const [values, setValues] = useState<PackageFormValues>(() =>
    pkg ? packageToForm(pkg) : emptyPackageForm(),
  );
  const [errors, setErrors] = useState<FieldErrors<PackageFormValues>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const save = useSavePackage();

  function setField<K extends keyof PackageFormValues>(
    field: K,
    value: PackageFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function updateItem(
    key: string,
    field: "equipmentId" | "quantity",
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    }));
    setErrors((current) => ({ ...current, items: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function addItem() {
    const chosen = new Set(values.items.map((item) => item.equipmentId));
    const nextEquipment = equipment.find((item) => !chosen.has(item.id));
    setValues((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          key: crypto.randomUUID(),
          equipmentId: nextEquipment?.id ?? "",
          quantity: "1",
        },
      ],
    }));
  }

  function removeItem(key: string) {
    setValues((current) => ({
      ...current,
      items: current.items.filter((item) => item.key !== key),
    }));
  }

  function setImage(imageUrl: string | null, imagePublicId: string | null) {
    setValues((current) => ({
      ...current,
      imageUrl: imageUrl ?? "",
      imagePublicId: imagePublicId ?? "",
    }));
    setErrors((current) => ({ ...current, imageUrl: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = packageFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<PackageFormValues>(parsed.error));
      return;
    }

    save.mutate(
      { id: pkg?.id, input: packagePayload(parsed.data) },
      {
        onSuccess: () => {
          toast.success(pkg ? "Package updated" : "Package added", {
            description: pkg
              ? `${parsed.data.name} and its included equipment have been saved.`
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
      title={pkg ? `Edit ${pkg.name}` : "Add package"}
      description="Packages are priced per package, not per guest. Add the equipment that is included in the bundle."
      wide
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="package-name" required error={errors.name}>
            <Input
              id="package-name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Garden party starter"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "package-name-error" : undefined}
              autoFocus
            />
          </FormField>
          <FormField
            label="Slug"
            htmlFor="package-slug"
            required={!pkg}
            error={errors.slug}
            hint={pkg ? "The public URL keeps its original slug." : "Lowercase words separated by hyphens."}
          >
            <Input
              id="package-slug"
              value={values.slug}
              onChange={(event) => setField("slug", event.target.value)}
              disabled={Boolean(pkg)}
              placeholder="garden-party-starter"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? "package-slug-error" : undefined}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <FormField label="Price" htmlFor="package-price" required error={errors.price}>
            <Input
              id="package-price"
              inputMode="decimal"
              value={values.price}
              onChange={(event) => setField("price", event.target.value)}
              placeholder="0.00"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? "package-price-error" : undefined}
            />
          </FormField>
          <FormField
            label="Min quantity"
            htmlFor="package-min-quantity"
            required
            error={errors.minQuantity}
          >
            <Input
              id="package-min-quantity"
              inputMode="numeric"
              value={values.minQuantity}
              onChange={(event) => setField("minQuantity", event.target.value)}
              aria-invalid={Boolean(errors.minQuantity)}
              aria-describedby={
                errors.minQuantity ? "package-min-quantity-error" : undefined
              }
            />
          </FormField>
          <FormField
            label="Max quantity"
            htmlFor="package-max-quantity"
            error={errors.maxQuantity}
            hint="Optional."
          >
            <Input
              id="package-max-quantity"
              inputMode="numeric"
              value={values.maxQuantity}
              onChange={(event) => setField("maxQuantity", event.target.value)}
              aria-invalid={Boolean(errors.maxQuantity)}
              aria-describedby={
                errors.maxQuantity ? "package-max-quantity-error" : undefined
              }
            />
          </FormField>
          <FormField
            label="Duration (days)"
            htmlFor="package-duration"
            error={errors.duration}
            hint="Optional."
          >
            <Input
              id="package-duration"
              inputMode="numeric"
              value={values.duration}
              onChange={(event) => setField("duration", event.target.value)}
              aria-invalid={Boolean(errors.duration)}
              aria-describedby={
                errors.duration ? "package-duration-error" : undefined
              }
            />
          </FormField>
        </div>

        <FormField
          label="Description"
          htmlFor="package-description"
          error={errors.description}
          hint={`${values.description.length}/2000 characters`}
        >
          <Textarea
            id="package-description"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            maxLength={2000}
            placeholder="What makes this bundle useful?"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "package-description-error" : undefined
            }
          />
        </FormField>

        <ImageUploadField
          id="package-image"
          kind="packages"
          imageUrl={values.imageUrl}
          onChange={setImage}
          onUploadingChange={setImageUploading}
          error={errors.imageUrl}
        />

        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <legend className="text-sm font-semibold text-slate-900">
                Included equipment
              </legend>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Each item can appear once. The quantity is how many units are in one
                package.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addItem}
              disabled={equipment.length === 0}
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Add item
            </Button>
          </div>

          {errors.items ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {errors.items}
            </p>
          ) : null}

          {values.items.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No equipment yet. Add at least one item so the package can be booked.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {values.items.map((item, index) => (
                <div
                  key={item.key}
                  className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-start"
                >
                  <div>
                    <label
                      htmlFor={`package-item-${item.key}`}
                      className="text-xs font-medium text-slate-600"
                    >
                      Equipment {index + 1}
                    </label>
                    <select
                      id={`package-item-${item.key}`}
                      value={item.equipmentId}
                      onChange={(event) =>
                        updateItem(item.key, "equipmentId", event.target.value)
                      }
                      className={`${nativeSelectClassName} mt-1 bg-white`}
                    >
                      <option value="">Choose equipment</option>
                      {equipment.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                          {row.isActive ? "" : " (inactive)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`package-quantity-${item.key}`}
                      className="text-xs font-medium text-slate-600"
                    >
                      Quantity
                    </label>
                    <Input
                      id={`package-quantity-${item.key}`}
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.key, "quantity", event.target.value)
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mt-5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remove equipment line ${index + 1}`}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField
            id="package-featured"
            label="Feature on the home page"
            description="Featured packages appear in the home page package section."
            checked={values.isFeatured}
            onChange={(checked) => setField("isFeatured", checked)}
          />
          <ToggleField
            id="package-active"
            label="Visible on the public catalogue"
            description="Turn this off to hide the package without deleting it."
            checked={values.isActive}
            onChange={(checked) => setField("isActive", checked)}
          />
        </div>

        <FormActions
          pending={save.isPending || imageUploading}
          submitLabel={pkg ? "Save package" : "Add package"}
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}
