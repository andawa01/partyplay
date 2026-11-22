import { Pencil, Phone, Trash2, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useDeleteTransportProvider,
  useSaveTransportProvider,
  useTransportProviders,
} from "../../../hooks/use-admin-catalogue";
import type {
  FieldErrors,
  TransportProvider,
  TransportProviderFormValues,
} from "../../../lib/admin-catalogue";
import {
  emptyTransportProviderForm,
  formFieldErrors,
  transportProviderFormSchema,
  transportProviderPayload,
  transportProviderToForm,
} from "../../../lib/admin-catalogue";
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
} from "./shared";

export function TransportProvidersPanel() {
  const providers = useTransportProviders();
  const remove = useDeleteTransportProvider();
  const [editing, setEditing] = useState<TransportProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TransportProvider | null>(null);

  const rows = providers.data ?? [];

  return (
    <section aria-labelledby="transport-catalogue-heading">
      <div id="transport-catalogue-heading">
        <PanelHeader
          title="Transport providers"
          description="The drivers and vehicles available for deliveries. Phone numbers are 10 digits and must be unique."
          count={rows.length}
          createLabel="Add provider"
          onCreate={() => setCreating(true)}
        />
      </div>

      {providers.isPending ? (
        <CatalogueTableSkeleton columns={4} />
      ) : providers.isError ? (
        <div className="mt-5">
          <ErrorState
            error={providers.error}
            title="Could not load transport providers"
            onRetry={() => providers.refetch()}
            isRetrying={providers.isFetching}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={Truck}
          title="No transport providers yet"
          description="Add a driver so the team knows who can handle a delivery."
          actionLabel="Add provider"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Provider</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Service area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <Truck aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{provider.name}</p>
                        {provider.notes ? (
                          <p className="max-w-64 truncate text-xs text-slate-500">
                            {provider.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${provider.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <Phone aria-hidden="true" className="size-3.5" />
                      {provider.phone}
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">
                      {provider.serviceArea || "Not specified"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={provider.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(provider)}
                        aria-label={`Edit ${provider.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setDeleting(provider)}
                        aria-label={`Delete ${provider.name}`}
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
        <TransportProviderFormDialog
          key="new-provider"
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <TransportProviderFormDialog
          key={editing.id}
          provider={editing}
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
        title={deleting ? `Delete ${deleting.name}?` : "Delete provider?"}
        description="The provider will be removed from the delivery team. Existing bookings are not changed."
        confirmLabel="Delete provider"
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Transport provider deleted", {
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

function TransportProviderFormDialog({
  provider,
  onClose,
}: {
  provider?: TransportProvider;
  onClose: () => void;
}) {
  const [values, setValues] = useState<TransportProviderFormValues>(() =>
    provider
      ? transportProviderToForm(provider)
      : emptyTransportProviderForm(),
  );
  const [errors, setErrors] = useState<FieldErrors<TransportProviderFormValues>>({});
  const save = useSaveTransportProvider();

  function setField<K extends keyof TransportProviderFormValues>(
    field: K,
    value: TransportProviderFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = transportProviderFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<TransportProviderFormValues>(parsed.error));
      return;
    }

    save.mutate(
      { id: provider?.id, input: transportProviderPayload(parsed.data) },
      {
        onSuccess: () => {
          toast.success(provider ? "Provider updated" : "Provider added", {
            description: `${parsed.data.name} is available in the transport directory.`,
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
      title={provider ? `Edit ${provider.name}` : "Add transport provider"}
      description="Keep the phone number reachable on delivery days. Duplicate numbers are rejected by the server."
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            htmlFor="provider-name"
            required
            error={errors.name}
          >
            <Input
              id="provider-name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Samuel — van 1"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "provider-name-error" : undefined}
              autoFocus
            />
          </FormField>
          <FormField
            label="Phone"
            htmlFor="provider-phone"
            required
            error={errors.phone}
          >
            <Input
              id="provider-phone"
              inputMode="numeric"
              maxLength={10}
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="0712345678"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "provider-phone-error" : undefined}
            />
          </FormField>
        </div>

        <FormField
          label="Service area"
          htmlFor="provider-service-area"
          error={errors.serviceArea}
          hint="Optional. Where this provider usually works."
        >
          <Input
            id="provider-service-area"
            value={values.serviceArea}
            onChange={(event) => setField("serviceArea", event.target.value)}
            placeholder="e.g. Nairobi and Kiambu"
            aria-invalid={Boolean(errors.serviceArea)}
            aria-describedby={
              errors.serviceArea ? "provider-service-area-error" : undefined
            }
          />
        </FormField>

        <FormField
          label="Notes"
          htmlFor="provider-notes"
          error={errors.notes}
          hint={`${values.notes.length}/1000 characters — vehicle, availability, anything useful.`}
        >
          <Textarea
            id="provider-notes"
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
            maxLength={1000}
            placeholder="Optional notes for the team."
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "provider-notes-error" : undefined}
          />
        </FormField>

        <ToggleField
          id="provider-active"
          label="Available for deliveries"
          description="Inactive providers stay in the history but are not offered for new transport."
          checked={values.isActive}
          onChange={(checked) => setField("isActive", checked)}
        />

        <FormActions
          pending={save.isPending}
          submitLabel={provider ? "Save provider" : "Add provider"}
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}
