import { KeyRound, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { PasswordInput } from "../../components/admin/PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { useAdminSession, useChangePassword } from "../../hooks/use-auth";
import { isApiError } from "../../lib/api";
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from "../../lib/auth";
import { clearSession } from "../../lib/session";
import { toast } from "../../lib/toast";

type PasswordField = keyof ChangePasswordFormValues;

const emptyPasswords: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAdminSession();
  const changePassword = useChangePassword();

  const [values, setValues] = useState(emptyPasswords);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordField, string>>
  >({});
  const [formError, setFormError] = useState<unknown>(null);

  const admin = session.data;

  function updateField(field: PasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    if (changePassword.error) {
      changePassword.reset();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = changePasswordFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<Record<PasswordField, string>> = {};
      for (const [field, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (messages?.[0]) {
          nextErrors[field as PasswordField] = messages[0];
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    changePassword.mutate(
      {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      {
        onSuccess: () => {
          setValues(emptyPasswords);
          setFieldErrors({});
          toast.success("Password updated", {
            description: "Use your new password the next time you sign in.",
          });
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 401) {
            clearSession(queryClient);
            navigate("/admin/login", { replace: true });
            return;
          }
          setFormError(error);
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Account and security
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Review the account behind this session and change the password used to sign in.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          aria-labelledby="admin-account-heading"
        >
          <h2 id="admin-account-heading" className="text-sm font-semibold text-slate-900">
            Signed-in account
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">
              {(admin?.name?.trim() || admin?.email || "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {admin?.name?.trim() || "PartyPlay admin"}
              </p>
              <Badge variant="outline" className="mt-1">
                {admin?.role === "OWNER" ? "Owner" : "Staff"}
              </Badge>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="truncate font-medium text-slate-800">{admin?.email ?? "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
              <div>
                <dt className="text-xs text-slate-500">Access level</dt>
                <dd className="font-medium text-slate-800">
                  {admin?.role === "OWNER" ? "Owner" : "Staff"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-brand-700"
              />
              <div>
                <dt className="text-xs text-slate-500">Session</dt>
                <dd className="font-medium text-slate-800">
                  Protected by an http-only cookie
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="change-password-heading"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 id="change-password-heading" className="font-semibold text-slate-900">
                Change password
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Use at least 8 characters with uppercase, lowercase and a number. Choose something unique to this account.
              </p>
            </div>
          </div>

          {formError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>
                {isApiError(formError) && formError.status === 400
                  ? "Password not changed"
                  : "Could not update the password"}
              </AlertTitle>
              <AlertDescription>
                {isApiError(formError)
                  ? formError.message
                  : "Check your connection and try again."}
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <PasswordField
              id="current-password"
              label="Current password"
              value={values.currentPassword}
              onChange={(value) => updateField("currentPassword", value)}
              autoComplete="current-password"
              error={fieldErrors.currentPassword}
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={values.newPassword}
              onChange={(value) => updateField("newPassword", value)}
              autoComplete="new-password"
              error={fieldErrors.newPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={values.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs leading-relaxed text-slate-500">
                You stay signed in on this device after changing the password.
              </p>
              <Button
                type="submit"
                disabled={changePassword.isPending}
                aria-busy={changePassword.isPending}
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        label={label.toLowerCase()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1.5 h-11"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
