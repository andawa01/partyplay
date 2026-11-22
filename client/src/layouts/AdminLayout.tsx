import {
  ArrowUpRight,
  Boxes,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAdminSession, useLogout } from "../hooks/use-auth";
import { isApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { clearSession } from "../lib/session";
import { toastError } from "../lib/toast";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/catalogue", label: "Catalogue", icon: Boxes },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAdminSession();
  const logout = useLogout();
  const admin = session.data;

  function signOut() {
    logout.mutate(undefined, {
      onSuccess: () => {
        clearSession(queryClient);
        navigate("/admin/login", { replace: true });
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 401) {
          clearSession(queryClient);
          navigate("/admin/login", { replace: true });
          return;
        }
        toastError(error, "Could not sign out. Please try again.");
      },
    });
  }

  const displayName = admin?.name?.trim() || admin?.email || "Admin";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <NavLink
              to="/admin/dashboard"
              className="shrink-0 rounded-sm text-lg font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              PartyPlay <span className="text-brand-700">Admin</span>
            </NavLink>
            <nav aria-label="Admin" className="hidden items-center gap-1 md:flex">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                      isActive
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LinkToSite />
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {initial}
              </span>
              <div className="max-w-40 leading-tight">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {admin?.role === "OWNER" ? "Owner" : "Staff"}
                </p>
              </div>
              <Badge variant="outline" className="hidden lg:inline-flex">
                <ShieldCheck aria-hidden="true" className="mr-1 size-3" />
                Signed in
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={signOut}
              disabled={logout.isPending}
              aria-busy={logout.isPending}
              className="gap-1.5"
            >
              {logout.isPending ? (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <LogOut aria-hidden="true" className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {logout.isPending ? "Signing out…" : "Sign out"}
              </span>
              <span className="sr-only sm:hidden">Sign out</span>
            </Button>
          </div>
        </div>

        <nav
          aria-label="Admin mobile"
          className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"
        >
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  isActive
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-600 hover:bg-slate-50",
                )
              }
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

function LinkToSite() {
  return (
    <a
      href="/"
      target="_blank"
      rel="noreferrer"
      className="hidden rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:inline-flex sm:items-center sm:gap-1"
    >
      View site
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
