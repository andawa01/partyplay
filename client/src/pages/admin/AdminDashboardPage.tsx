import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  Package,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { useAdminSession } from "../../hooks/use-auth";

const cards = [
  {
    label: "Bookings",
    icon: CalendarDays,
    description: "Requests and confirmed hires will appear here.",
  },
  {
    label: "Catalogue",
    icon: Package,
    description: "Equipment, packages and offers at a glance.",
  },
  {
    label: "Revenue",
    icon: Wallet,
    description: "Payments and outstanding balances for the period.",
  },
];

export default function AdminDashboardPage() {
  const session = useAdminSession();
  const displayName = session.data?.name?.trim() || "there";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
              <LayoutDashboard aria-hidden="true" className="size-3.5" />
              Admin overview
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Good to see you, {displayName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Your private workspace for bookings, stock and payments. Keep the day
              moving from one place.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 bg-white">
            <Link to="/admin/settings">
              <KeyRound aria-hidden="true" className="size-4" />
              Account settings
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="dashboard-summary-heading">
        <h2 id="dashboard-summary-heading" className="sr-only">
          Business summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map(({ label, icon: Icon, description }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-300">—</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Account and security</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Change the password used to sign in, or confirm which account is active in
            this browser.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/admin/settings">
              Open settings
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Public site</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Check the customer-facing catalogue, packages and booking flow in another
            tab.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <a href="/" target="_blank" rel="noreferrer">
              View PartyPlay
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}
