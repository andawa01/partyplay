import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PartyPopper,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAdminSession, useLogout } from "../hooks/use-auth";
import { isApiError } from "../lib/api";
import { adminRoleLabel, type AdminRole } from "../lib/auth";
import { cn } from "../lib/cn";
import { clearSession } from "../lib/session";
import { toastError } from "../lib/toast";

const links: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AdminRole[];
}> = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, roles: ["OWNER", "ADMIN"] },
  { to: "/admin/catalogue", label: "Catalogue", icon: Boxes, roles: ["OWNER", "ADMIN"] },
  { to: "/admin/team", label: "Team", icon: UsersRound, roles: ["OWNER"] },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAdminSession();
  const logout = useLogout();
  const admin = session.data;
  const [menuOpen, setMenuOpen] = useState(false);

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
  const availableLinks = links.filter(
    ({ roles }) => !roles || (admin?.role !== undefined && roles.includes(admin.role)),
  );

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
      {availableLinks.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              isActive
                ? "bg-brand-50 text-brand-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-lg transition",
                  isActive
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand-700",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-xs text-slate-500">{adminRoleLabel(admin?.role)}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={signOut}
        disabled={logout.isPending}
        aria-busy={logout.isPending}
        className="mt-3 w-full justify-start gap-2"
      >
        {logout.isPending ? (
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-3.5" />
        )}
        {logout.isPending ? "Signing out…" : "Sign out"}
      </Button>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-xs font-medium text-slate-500 transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        View site
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <NavLink
          to="/admin/dashboard"
          className="flex items-center gap-2 rounded-sm text-lg font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <PartyPopper aria-hidden="true" className="size-4" />
          </span>
          PartyPlay <span className="text-brand-700">Admin</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </header>

      {menuOpen ? (
        <div
          id="admin-mobile-nav"
          className="sticky top-[57px] z-30 border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          {nav}
          <div className="mt-3">{sidebarFooter}</div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[100rem]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
          <NavLink
            to="/admin/dashboard"
            className="mb-8 flex items-center gap-2.5 rounded-lg px-1 text-lg font-extrabold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <PartyPopper aria-hidden="true" className="size-5" />
            </span>
            PartyPlay <span className="text-brand-700">Admin</span>
          </NavLink>
          {nav}
          <div className="mt-6">{sidebarFooter}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur lg:flex">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Owner workspace
              </p>
              <p className="text-sm font-semibold text-slate-700">PartyPlay admin</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck aria-hidden="true" className="size-3" />
              Signed in as {adminRoleLabel(admin?.role)}
            </Badge>
          </div>
          <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
