import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";

import { cn } from "../../../lib/cn";
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
import { errorMessage } from "../../ui/error-state";
import { Label } from "../../ui/label";
import { Skeleton } from "../../ui/skeleton";

export const nativeSelectClassName =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50";

export function CatalogueDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-blush-600">*</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-brand-200 hover:bg-brand-50/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 rounded border-slate-300 text-brand-700 accent-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "warning"}>{active ? "Active" : "Inactive"}</Badge>;
}

export function FormError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not save changes</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  );
}

export function FormActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <DialogFooter className="border-t border-slate-100 pt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </DialogFooter>
  );
}

export function PanelHeader({
  title,
  description,
  count,
  createLabel,
  onCreate,
}: {
  title: string;
  description: string;
  count: number;
  createLabel: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Badge variant="outline">{count}</Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <Button type="button" onClick={onCreate} className="shrink-0 self-start">
        <Plus aria-hidden="true" className="size-4" />
        {createLabel}
      </Button>
    </div>
  );
}

export function CatalogueTableSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} className="flex gap-4 px-4 py-4">
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton key={column} className={cn("h-4", column === 0 ? "w-1/3" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyCatalogueState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
        <Icon aria-hidden className="size-6" />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" size="sm" onClick={onAction} className="mt-4">
          <Plus aria-hidden="true" className="size-3.5" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  error,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
  error?: unknown;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <FormError error={error} /> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
