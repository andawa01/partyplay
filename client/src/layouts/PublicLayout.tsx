import { NavLink, Outlet } from "react-router-dom";

import { SiteFooter } from "../components/site/SiteFooter";
import { useSite } from "../hooks/use-site";
import { publicLinks } from "../lib/navigation";
import { SITE_FALLBACK } from "../lib/site";

export default function PublicLayout() {
  const { data } = useSite();
  const site = data ?? SITE_FALLBACK;

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <header className="border-b border-blush-100">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
          <NavLink to="/" className="text-xl font-bold text-brand-600 hover:text-brand-700">
            {site.businessName}
          </NavLink>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
            {publicLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    isActive
                      ? "rounded-sm text-brand-700 underline decoration-blush-300 decoration-2 underline-offset-4"
                      : "rounded-sm text-slate-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter site={site} />
    </div>
  );
}
