import { BadgePercent, Pencil, Tag, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useAdminEquipment,
  useAdminOffers,
  useAdminPackages,
  useDeleteOffer,
  useSaveOffer,
} from "../../../hooks/use-admin-catalogue";
import type {
  AdminOffer,
  FieldErrors,
  OfferFormValues,
} from "../../../lib/admin-catalogue";
import {
  emptyOfferForm,
  formFieldErrors,
  offerAppliesToLabel,
  offerAppliesToOptions,
  offerFormSchema,
  offerPayload,
  offerToForm,
} from "../../../lib/admin-catalogue";
import { formatDateTime } from "../../../lib/dates";
import { formatMoney } from "../../../lib/money";
import { toast } from "../../../lib/toast";
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

export function OffersPanel({ currency }: { currency: string }) {
  const offers = useAdminOffers();
  const equipment = useAdminEquipment();
  const packages = useAdminPackages();
  const remove = useDeleteOffer();
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminOffer | null>(null);

  const rows = offers.data ?? [];

  return (
    <section aria-labelledby="offer-catalogue-heading">
      <div id="offer-catalogue-heading">
        <PanelHeader
          title="Offers"
          description="Seasonal promotions shown on the public offers page. The owner still confirms any discount when a booking is accepted."
          count={rows.length}
          createLabel="Add offer"
          onCreate={() => setCreating(true)}
        />
      </div>

      {offers.isPending ? (
        <CatalogueTableSkeleton columns={5} />
      ) : offers.isError ? (
        <div className="mt-5">
          <ErrorState
            error={offers.error}
            title="Could not load offers"
            onRetry={() => offers.refetch()}
            isRetrying={offers.isFetching}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={BadgePercent}
          title="No offers yet"
          description="Add a promotion when you want a seasonal message on the public offers page."
          actionLabel="Add offer"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Offer</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
                        <Tag aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{offer.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {offer.code ? `Code ${offer.code}` : offer.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">
                      {discountLabel(offer, currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {offer.discountType === "PERCENTAGE" ? "Percentage" : "Fixed amount"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-800">
                      {offerAppliesToLabel(offer.appliesTo)}
                    </p>
                    {offer.appliesToId ? (
                      <p className="text-xs text-slate-500">Specific item</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-600">
                      {offer.startsAt ? formatDateTime(offer.startsAt) : "Any time"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {offer.endsAt ? `to ${formatDateTime(offer.endsAt)}` : "No end date"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={offer.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(offer)}
                        aria-label={`Edit ${offer.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setDeleting(offer)}
                        aria-label={`Delete ${offer.name}`}
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
        <OfferFormDialog
          key="new-offer"
          equipment={equipment.data?.items ?? []}
          packages={packages.data ?? []}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <OfferFormDialog
          key={editing.id}
          offer={editing}
          equipment={equipment.data?.items ?? []}
          packages={packages.data ?? []}
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
        title={deleting ? `Delete ${deleting.name}?` : "Delete offer?"}
        description="The promotion will be removed from the public offers page. This cannot be undone."
        confirmLabel="Delete offer"
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Offer deleted", {
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

function OfferFormDialog({
  offer,
  equipment,
  packages,
  onClose,
}: {
  offer?: AdminOffer;
  equipment: Array<{ id: string; name: string; isActive: boolean }>;
  packages: Array<{ id: string; name: string; isActive: boolean }>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<OfferFormValues>(() =>
    offer ? offerToForm(offer) : emptyOfferForm(),
  );
  const [errors, setErrors] = useState<FieldErrors<OfferFormValues>>({});
  const save = useSaveOffer();

  function setField<K extends keyof OfferFormValues>(
    field: K,
    value: OfferFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function changeAppliesTo(value: OfferFormValues["appliesTo"]) {
    setValues((current) => ({ ...current, appliesTo: value, appliesToId: "" }));
    setErrors((current) => ({ ...current, appliesTo: undefined, appliesToId: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  const needsTarget =
    values.appliesTo === "ONE_EQUIPMENT" || values.appliesTo === "ONE_PACKAGE";
  const targetOptions =
    values.appliesTo === "ONE_EQUIPMENT" ? equipment : packages;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = offerFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<OfferFormValues>(parsed.error));
      return;
    }

    save.mutate(
      { id: offer?.id, input: offerPayload(parsed.data) },
      {
        onSuccess: () => {
          toast.success(offer ? "Offer updated" : "Offer added", {
            description: `${parsed.data.name} is shown on the public offers page while it is active and in date.`,
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
      title={offer ? `Edit ${offer.name}` : "Add offer"}
      description="Offers are display-only in this release. The booking flow does not apply the discount automatically."
      wide
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="offer-name" required error={errors.name}>
            <Input
              id="offer-name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. December celebration offer"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "offer-name-error" : undefined}
              autoFocus
            />
          </FormField>
          <FormField
            label="Slug"
            htmlFor="offer-slug"
            required={!offer}
            error={errors.slug}
            hint={offer ? "The public URL keeps its original slug." : "Lowercase words separated by hyphens."}
          >
            <Input
              id="offer-slug"
              value={values.slug}
              onChange={(event) => setField("slug", event.target.value)}
              disabled={Boolean(offer)}
              placeholder="december-celebration"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? "offer-slug-error" : undefined}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Discount type"
            htmlFor="offer-discount-type"
            required
            error={errors.discountType}
          >
            <select
              id="offer-discount-type"
              value={values.discountType}
              onChange={(event) =>
                setField(
                  "discountType",
                  event.target.value as "PERCENTAGE" | "FIXED_AMOUNT",
                )
              }
              className={nativeSelectClassName}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </FormField>
          <FormField
            label={values.discountType === "PERCENTAGE" ? "Percentage off" : "Amount off"}
            htmlFor="offer-discount-value"
            required
            error={errors.discountValue}
          >
            <Input
              id="offer-discount-value"
              inputMode="decimal"
              value={values.discountValue}
              onChange={(event) => setField("discountValue", event.target.value)}
              placeholder={values.discountType === "PERCENTAGE" ? "10" : "0.00"}
              aria-invalid={Boolean(errors.discountValue)}
              aria-describedby={
                errors.discountValue ? "offer-discount-value-error" : undefined
              }
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Applies to"
            htmlFor="offer-applies-to"
            required
            error={errors.appliesTo}
          >
            <select
              id="offer-applies-to"
              value={values.appliesTo}
              onChange={(event) =>
                changeAppliesTo(event.target.value as OfferFormValues["appliesTo"])
              }
              className={nativeSelectClassName}
            >
              {offerAppliesToOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={values.appliesTo === "ONE_PACKAGE" ? "Package" : "Equipment item"}
            htmlFor="offer-target"
            required={needsTarget}
            error={errors.appliesToId}
            hint={needsTarget ? undefined : "Not needed for the selected scope."}
          >
            <select
              id="offer-target"
              value={values.appliesToId}
              onChange={(event) => setField("appliesToId", event.target.value)}
              disabled={!needsTarget}
              className={nativeSelectClassName}
              aria-invalid={Boolean(errors.appliesToId)}
            >
              <option value="">Choose an item</option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          label="Promotion code"
          htmlFor="offer-code"
          error={errors.code}
          hint="Optional internal reference. The public page does not promise a redeemable code."
        >
          <Input
            id="offer-code"
            value={values.code}
            onChange={(event) => setField("code", event.target.value)}
            placeholder="e.g. DECEMBER"
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "offer-code-error" : undefined}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Starts at"
            htmlFor="offer-starts-at"
            error={errors.startsAt}
            hint="Optional. Leave blank for no start limit."
          >
            <Input
              id="offer-starts-at"
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => setField("startsAt", event.target.value)}
              aria-invalid={Boolean(errors.startsAt)}
              aria-describedby={errors.startsAt ? "offer-starts-at-error" : undefined}
            />
          </FormField>
          <FormField
            label="Ends at"
            htmlFor="offer-ends-at"
            error={errors.endsAt}
            hint="Optional. Leave blank to keep it ongoing."
          >
            <Input
              id="offer-ends-at"
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) => setField("endsAt", event.target.value)}
              aria-invalid={Boolean(errors.endsAt)}
              aria-describedby={errors.endsAt ? "offer-ends-at-error" : undefined}
            />
          </FormField>
        </div>

        <FormField
          label="Description"
          htmlFor="offer-description"
          error={errors.description}
          hint={`${values.description.length}/2000 characters`}
        >
          <Textarea
            id="offer-description"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            maxLength={2000}
            placeholder="What is the offer, and what should the customer know?"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "offer-description-error" : undefined
            }
          />
        </FormField>

        <ToggleField
          id="offer-active"
          label="Visible on the public offers page"
          description="Only active offers inside their date window are published."
          checked={values.isActive}
          onChange={(checked) => setField("isActive", checked)}
        />

        <FormActions
          pending={save.isPending}
          submitLabel={offer ? "Save offer" : "Add offer"}
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}

function discountLabel(offer: AdminOffer, currency: string): string {
  if (offer.discountType === "PERCENTAGE") {
    return `${Number(offer.discountValue)}% off`;
  }
  return `${formatMoney(offer.discountValue, currency)} off`;
}
