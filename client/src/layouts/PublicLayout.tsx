import { LogIn, Menu, PartyPopper, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { SiteFooter } from "../components/site/SiteFooter";
import { useSite } from "../hooks/use-site";
import { publicLinks } from "../lib/navigation";
import { SITE_FALLBACK } from "../lib/site";
import { cn } from "../lib/cn";

export default function PublicLayout() {
  const { data } = useSite();
  const site = data ?? SITE_FALLBACK;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink
            to="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm transition group-hover:from-brand-600 group-hover:to-brand-800">
              <PartyPopper aria-hidden="true" className="size-5" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              {site.businessName}
            </span>
          </NavLink>

          <ul className="hidden items-center gap-1 lg:flex">
            {publicLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                      isActive
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-800",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <NavLink
              to="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <LogIn aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Admin</span>
              <span className="sr-only sm:hidden">Admin login</span>
            </NavLink>
            <NavLink
              to="/booking"
              className="hidden rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 sm:inline-flex"
            >
              Book Now
            </NavLink>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-xl border border-brand-100 text-slate-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div id="mobile-nav" className="border-t border-brand-100 bg-white lg:hidden">
            <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {publicLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-lg px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-brand-50 text-brand-800"
                          : "text-slate-600 hover:bg-brand-50 hover:text-brand-800",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-1">
                <NavLink
                  to="/booking"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Book Now
                </NavLink>
              </li>
            </ul>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter site={site} />
    </div>
  );
}
