import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useForgotPassword } from "../../hooks/use-auth";
import { isApiError } from "../../lib/api";
import { forgotPasswordFormSchema } from "../../lib/auth";
import { toast } from "../../lib/toast";

export default function AdminForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<unknown>(null);

  const error = formError ?? forgotPassword.error;
  const notConfigured = isApiError(error) && error.status === 503;
  const rateLimited = isApiError(error) && error.status === 429;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordFormSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Check the email address");
      return;
    }

    setFieldError(null);
    forgotPassword.mutate(parsed.data, {
      onSuccess: (result) => {
        toast.success(result.message);
      },
    });
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

          {forgotPassword.isSuccess ? (
            <div className="mt-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 aria-hidden="true" className="size-7" />
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                If that email belongs to an admin account, a one-time reset link is on its way. It
                expires after 30 minutes.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Check your spam folder if it does not arrive. Only the latest link will work.
              </p>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link to="/admin/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
                  <Mail aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Enter the admin email address and we&apos;ll send a one-time link to choose a
                    new password.
                  </p>
                </div>
              </div>

              {error ? (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle>
                    {notConfigured
                      ? "Email delivery is not configured"
                      : rateLimited
                        ? "Too many requests"
                        : "Could not send the reset email"}
                  </AlertTitle>
                  <AlertDescription>
                    {isApiError(error) ? error.message : "Check your connection and try again."}
                  </AlertDescription>
                  {notConfigured ? (
                    <p className="mt-2 text-xs">
                      The site operator needs to configure the email provider first.
                    </p>
                  ) : null}
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6" noValidate>
                <div>
                  <Label htmlFor="forgot-email">Email address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldError(null);
                      setFormError(null);
                      if (forgotPassword.error) {
                        forgotPassword.reset();
                      }
                    }}
                    autoComplete="email"
                    autoFocus
                    placeholder="owner@partyplay.co.ke"
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? "forgot-email-error" : undefined}
                    className="mt-1.5 h-11"
                  />
                  {fieldError ? (
                    <p id="forgot-email-error" className="mt-1.5 text-xs font-medium text-red-600">
                      {fieldError}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-5 w-full"
                  disabled={forgotPassword.isPending}
                  aria-busy={forgotPassword.isPending}
                >
                  {forgotPassword.isPending ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                For security, we do not confirm whether an email address has an account. Only the
                newest link works.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
