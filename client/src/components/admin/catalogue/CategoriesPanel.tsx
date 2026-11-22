import { Folder, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  useAdminCategories,
  useDeleteCategory,
  useSaveCategory,
} from "../../../hooks/use-admin-catalogue";
import type {
  AdminCategory,
  CategoryFormValues,
  FieldErrors,
} from "../../../lib/admin-catalogue";
import {
  categoryFormSchema,
  categoryPayload,
  categoryToForm,
  emptyCategoryForm,
  formFieldErrors,
} from "../../../lib/admin-catalogue";
import { toast } from "../../../lib/toast";
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
  ToggleField,
  nativeSelectClassName,
} from "./shared";

export function CategoriesPanel() {
  const categories = useAdminCategories();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  const rows = flattenCategories(categories.data ?? []);
  const nameById = new Map(rows.map((category) => [category.id, category.name]));
  const roots = categories.data ?? [];

  return (
    <section aria-labelledby="category-catalogue-heading">
      <div id="category-catalogue-heading">
        <PanelHeader
          title="Categories"
          description="The groups customers browse on the equipment page. A parent category can contain a small set of child categories."
          count={rows.length}
          createLabel="Add category"
          onCreate={() => setCreating(true)}
        />
      </div>

      {categories.isPending ? (
        <CatalogueTableSkeleton columns={4} />
      ) : categories.isError ? (
        <div className="mt-5">
          <ErrorState
            error={categories.error}
            title="Could not load categories"
            onRetry={() => categories.refetch()}
            isRetrying={categories.isFetching}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyCatalogueState
          icon={Folder}
          title="No categories yet"
          description="Create a category before adding equipment so customers can browse by group."
          actionLabel="Add category"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Category</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Active equipment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <Folder aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium text-slate-900">{category.name}</p>
                          {category.isGroup ? (
                            <Badge variant="secondary">Parent</Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {category.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-700">
                      {category.parentId
                        ? nameById.get(category.parentId) ?? "Parent category"
                        : "Top level"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800">
                      {category.equipment?.length ?? 0}
                    </span>
                    <span className="text-xs text-slate-500"> items</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(category)}
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setDeleting(category)}
                        aria-label={`Delete ${category.name}`}
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
        <CategoryFormDialog
          key="new-category"
          roots={roots}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editing ? (
        <CategoryFormDialog
          key={editing.id}
          category={editing}
          roots={roots}
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
        title={deleting ? `Delete ${deleting.name}?` : "Delete category?"}
        description="A category that still contains equipment cannot be deleted. Move or reassign those items first."
        confirmLabel="Delete category"
        destructive
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Category deleted", {
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

function CategoryFormDialog({
  category,
  roots,
  onClose,
}: {
  category?: AdminCategory;
  roots: AdminCategory[];
  onClose: () => void;
}) {
  const [values, setValues] = useState<CategoryFormValues>(() =>
    category ? categoryToForm(category) : emptyCategoryForm(),
  );
  const [errors, setErrors] = useState<FieldErrors<CategoryFormValues>>({});
  const save = useSaveCategory();

  const parentName = category?.parentId
    ? roots.find((root) => root.id === category.parentId)?.name ??
      category.parent?.name ??
      "Current parent"
    : "";

  function setField<K extends keyof CategoryFormValues>(
    field: K,
    value: CategoryFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.error) {
      save.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(formFieldErrors<CategoryFormValues>(parsed.error));
      return;
    }

    save.mutate(
      { id: category?.id, input: categoryPayload(parsed.data) },
      {
        onSuccess: () => {
          toast.success(category ? "Category updated" : "Category added", {
            description: `${parsed.data.name} is available in the public filters.`,
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
      title={category ? `Edit ${category.name}` : "Add category"}
      description="Categories organise the public equipment catalogue. Slugs are permanent once the category is created."
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError error={save.error} />

        <FormField
          label="Name"
          htmlFor="category-name"
          required
          error={errors.name}
        >
          <Input
            id="category-name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="e.g. Furniture"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "category-name-error" : undefined}
            autoFocus
          />
        </FormField>

        <FormField
          label="Slug"
          htmlFor="category-slug"
          required={!category}
          error={errors.slug}
          hint={category ? "The public URL keeps its original slug." : "Lowercase words separated by hyphens."}
        >
          <Input
            id="category-slug"
            value={values.slug}
            onChange={(event) => setField("slug", event.target.value)}
            disabled={Boolean(category)}
            placeholder="furniture"
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "category-slug-error" : undefined}
          />
        </FormField>

        <FormField
          label="Parent category"
          htmlFor="category-parent"
          error={errors.parentId}
          hint={
            category
              ? "The parent is fixed after creation in this release. Create a new category to choose a different parent."
              : "Optional. Leave blank for a top-level category."
          }
        >
          <select
            id="category-parent"
            value={values.parentId}
            onChange={(event) => setField("parentId", event.target.value)}
            disabled={Boolean(category)}
            className={nativeSelectClassName}
          >
            <option value={category ? values.parentId : ""}>
              {parentName || "Top level"}
            </option>
            {!category
              ? roots.map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))
              : null}
          </select>
        </FormField>

        <FormField
          label="Description"
          htmlFor="category-description"
          error={errors.description}
          hint={`${values.description.length}/1000 characters`}
        >
          <Textarea
            id="category-description"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            maxLength={1000}
            placeholder="A short description of what belongs in this category."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "category-description-error" : undefined
            }
          />
        </FormField>

        <ToggleField
          id="category-group"
          label="Use as a parent category"
          description="Parent categories group child categories in the public filter."
          checked={values.isGroup}
          onChange={(checked) => setField("isGroup", checked)}
        />

        <FormActions
          pending={save.isPending}
          submitLabel={category ? "Save category" : "Add category"}
          onCancel={onClose}
        />
      </form>
    </CatalogueDialog>
  );
}

function flattenCategories(categories: AdminCategory[]): AdminCategory[] {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}
