import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PasswordInput } from "../../components/admin/PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { useResetPassword } from "../../hooks/use-auth";
import { isApiError } from "../../lib/api";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "../../lib/auth";

function readResetToken(): string {
  // The token lives in the fragment so it never reaches server logs or a Referer header.
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("token")?.trim() ?? "";
}

type PasswordField = keyof ResetPasswordFormValues;

export default function AdminResetPasswordPage() {
  const [token] = useState(readResetToken);
  const resetPassword = useResetPassword();
  const [values, setValues] = useState<ResetPasswordFormValues>({
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordField, string>>
  >({});
  const [formError, setFormError] = useState<unknown>(null);

  const succeeded = resetPassword.isSuccess;
  const error = formError ?? resetPassword.error;
  const invalidLink = isApiError(error) && error.status === 400;
  const rateLimited = isApiError(error) && error.status === 429;

  function updateField(field: PasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    if (resetPassword.error) {
      resetPassword.reset();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError(new Error("This reset link is missing its token."));
      return;
    }

    const parsed = resetPasswordFormSchema.safeParse(values);
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

    resetPassword.mutate(
      { token, newPassword: parsed.data.newPassword },
      {
        onSuccess: () => {
          window.history.replaceState(null, "", "/admin/reset-password");
        },
      },
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-brand-700/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-blush-700/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl flex-col justify-center">
        <Link
          to="/admin/login"
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>

        <section className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl shadow-black/20 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 ring-1 ring-brand-100">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Secure recovery
          </span>

          {succeeded ? (
            <div className="mt-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 aria-hidden="true" className="size-7" />
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                Password updated
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This reset link cannot be used again. Sign in with your new password.
                Existing admin sessions have been signed out.
              </p>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link to="/admin/login">Go to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
                  <KeyRound aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Use the one-time link issued by the site operator. It expires after
                    30 minutes and works once.
                  </p>
                </div>
              </div>

              {!token ? (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle>Reset link is incomplete</AlertTitle>
                  <AlertDescription>
                    Generate a new link with{" "}
                    <code className="rounded bg-red-50 px-1 py-0.5 text-[0.8em]">
                      npm run admin:reset-link
                    </code>{" "}
                    on the server.
                  </AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle>
                    {invalidLink
                      ? "Reset link not accepted"
                      : rateLimited
                        ? "Too many attempts"
                        : "Could not reset the password"}
                  </AlertTitle>
                  <AlertDescription>
                    {isApiError(error)
                      ? error.message
                      : "Check your connection and try again."}
                  </AlertDescription>
                  {invalidLink ? (
                    <p className="mt-2 text-xs">
                      The link may have expired or already been used. Ask the site
                      operator for a new one.
                    </p>
                  ) : null}
                </Alert>
              ) : null}

              {token ? (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                  <div>
                    <Label htmlFor="reset-password">New password</Label>
                    <PasswordInput
                      id="reset-password"
                      label="new password"
                      value={values.newPassword}
                      onChange={(event) => updateField("newPassword", event.target.value)}
                      autoComplete="new-password"
                      autoFocus
                      aria-invalid={Boolean(fieldErrors.newPassword)}
                      aria-describedby={
                        fieldErrors.newPassword ? "reset-password-error" : "reset-password-hint"
                      }
                      className="mt-1.5 h-11"
                    />
                    {fieldErrors.newPassword ? (
                      <p
                        id="reset-password-error"
                        className="mt-1.5 text-xs font-medium text-red-600"
                      >
                        {fieldErrors.newPassword}
                      </p>
                    ) : (
                      <p id="reset-password-hint" className="mt-1.5 text-xs text-slate-500">
                        At least 8 characters with uppercase, lowercase and a number.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="reset-password-confirm">Confirm new password</Label>
                    <PasswordInput
                      id="reset-password-confirm"
                      label="password confirmation"
                      value={values.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      autoComplete="new-password"
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={
                        fieldErrors.confirmPassword
                          ? "reset-password-confirm-error"
                          : undefined
                      }
                      className="mt-1.5 h-11"
                    />
                    {fieldErrors.confirmPassword ? (
                      <p
                        id="reset-password-confirm-error"
                        className="mt-1.5 text-xs font-medium text-red-600"
                      >
                        {fieldErrors.confirmPassword}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-2 w-full"
                    disabled={resetPassword.isPending}
                    aria-busy={resetPassword.isPending}
                  >
                    {resetPassword.isPending ? (
                      <>
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        Updating password…
                      </>
                    ) : (
                      "Set new password"
                    )}
                  </Button>
                </form>
              ) : null}
            </>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Reset links are single-use and are never stored in plain text.
        </p>
      </div>
    </div>
  );
}
