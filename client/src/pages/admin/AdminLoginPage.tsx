import { ArrowRight, Loader2, Lock, Mail, PartyPopper, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AdminSessionLoading } from "../../components/admin/AdminSessionLoading";
import { PasswordInput } from "../../components/admin/PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAdminSession, useLogin } from "../../hooks/use-auth";
import { isApiError } from "../../lib/api";
import { adminReturnPath, loginFormSchema, type LoginFormValues } from "../../lib/auth";

export default function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAdminSession();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>(
    {},
  );

  const returnTo = adminReturnPath((location.state as { from?: unknown } | null)?.from);

  if (session.isPending) {
    return <AdminSessionLoading />;
  }

  if (session.data) {
    return <Navigate to={returnTo} replace />;
  }

  const loginError = login.error;
  const invalidCredentials = isApiError(loginError) && loginError.status === 401;
  const rateLimited = isApiError(loginError) && loginError.status === 429;

  function changeField(field: keyof LoginFormValues, value: string) {
    if (field === "email") {
      setEmail(value);
    } else {
      setPassword(value);
    }
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (login.error) {
      login.reset();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof LoginFormValues, string>> = {};
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) {
          nextErrors[field as keyof LoginFormValues] = messages[0];
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    login.mutate(parsed.data, {
      onSuccess: () => navigate(returnTo, { replace: true }),
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blush-50 px-4 py-10 text-slate-900 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-brand-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-blush-200/50 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link
          to="/"
          className="mx-auto flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <PartyPopper aria-hidden="true" className="size-5" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            PartyPlay <span className="text-brand-700">Admin</span>
          </span>
        </Link>

        <div className="mt-6 rounded-3xl border border-white bg-white/95 p-6 shadow-xl shadow-brand-900/5 sm:p-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 ring-1 ring-brand-100">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Secure sign in
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sign in with the owner account to manage PartyPlay.
            </p>
          </div>

          {loginError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>
                {invalidCredentials
                  ? "Email or password not recognised"
                  : rateLimited
                    ? "Too many attempts"
                    : "Could not sign in"}
              </AlertTitle>
              <AlertDescription>
                {isApiError(loginError)
                  ? loginError.message
                  : "Check your connection and try again."}
              </AlertDescription>
              {rateLimited ? (
                <p className="mt-2 text-xs">Wait a few minutes before trying again.</p>
              ) : null}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <div>
              <Label htmlFor="admin-email">Email address</Label>
              <div className="relative mt-1.5">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => changeField("email", event.target.value)}
                  autoComplete="email"
                  autoFocus
                  placeholder="owner@partyplay.co.ke"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
                  className="h-11 pl-9"
                />
              </div>
              {fieldErrors.email ? (
                <p id="admin-email-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative mt-1.5">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <PasswordInput
                  id="admin-password"
                  label="password"
                  value={password}
                  onChange={(event) => changeField("password", event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "admin-password-error" : undefined}
                  className="h-11 pl-9"
                />
              </div>
              {fieldErrors.password ? (
                <p id="admin-password-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="mt-3 text-right">
              <Link
                to="/admin/forgot-password"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-4 w-full"
              disabled={login.isPending}
              aria-busy={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to admin
                  <ArrowRight aria-hidden="true" className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            <Link to="/" className="font-medium text-brand-700 hover:underline">
              Back to PartyPlay
            </Link>
          </p>
        </div>

        <p className="mx-auto mt-5 flex items-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck aria-hidden="true" className="size-3.5 text-emerald-600" />
          Protected by a secure, http-only session cookie.
        </p>
      </div>
    </div>
  );
}
