import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarDays,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
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
import {
  adminReturnPath,
  loginFormSchema,
  type LoginFormValues,
} from "../../lib/auth";

const highlights = [
  {
    icon: CalendarDays,
    title: "Bookings in one place",
    description: "See requests, confirm dates and keep every hire moving.",
  },
  {
    icon: Boxes,
    title: "Catalogue control",
    description: "Update equipment, packages and offers without a rebuild.",
  },
  {
    icon: ShieldCheck,
    title: "Private owner access",
    description: "Customer and payment details stay behind a secure session.",
  },
];

export default function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAdminSession();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginFormValues, string>>
  >({});

  const returnTo = adminReturnPath((location.state as { from?: unknown } | null)?.from);

  if (session.isPending) {
    return <AdminSessionLoading />;
  }

  if (session.data) {
    return <Navigate to={returnTo} replace />;
  }

  const loginError = login.error;
  const invalidCredentials =
    isApiError(loginError) && loginError.status === 401;
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
      for (const [field, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-brand-700/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-blush-700/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-72 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden max-w-xl lg:block">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-sm text-2xl font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            PartyPlay <span className="text-brand-300">Admin</span>
          </Link>
          <p className="mt-12 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-200 ring-1 ring-white/10">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Owner workspace
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white xl:text-5xl">
            Run the party.
            <br />
            We&apos;ll keep the details together.
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-300">
            One private place for booking requests, stock, customer details and the
            money side of the business.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/10">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to the public site
          </Link>
        </section>

        <section className="w-full justify-self-end rounded-3xl bg-white p-6 text-slate-900 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link to="/" className="text-xl font-bold text-slate-900">
              PartyPlay <span className="text-brand-700">Admin</span>
            </Link>
            <Link
              to="/"
              className="text-xs font-medium text-slate-500 hover:text-brand-700"
            >
              View site
            </Link>
          </div>

          <div className="mt-7 lg:mt-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 ring-1 ring-brand-100">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Secure sign in
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
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
                <p className="mt-2 text-xs">
                  Wait a few minutes before trying again.
                </p>
              ) : null}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <div>
              <Label htmlFor="admin-email">Email address</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => changeField("email", event.target.value)}
                autoComplete="email"
                autoFocus
                placeholder="owner@partyplay.co.ke"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? "admin-email-error" : undefined
                }
                className="mt-1.5 h-11"
              />
              {fieldErrors.email ? (
                <p id="admin-email-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <Label htmlFor="admin-password">Password</Label>
              <PasswordInput
                id="admin-password"
                label="password"
                value={password}
                onChange={(event) => changeField("password", event.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "admin-password-error" : undefined
                }
                className="mt-1.5 h-11"
              />
              {fieldErrors.password ? (
                <p
                  id="admin-password-error"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full"
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

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            Your session is stored in a secure, http-only cookie and expires automatically.
          </div>

          <p className="mt-5 text-center text-xs text-slate-500 lg:hidden">
            <Link to="/" className="font-medium text-brand-700 hover:underline">
              Back to PartyPlay
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
