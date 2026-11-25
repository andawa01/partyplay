import { ArrowRight, LogIn, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { publicLinks } from "../../lib/navigation";
import {
  mailtoHref,
  SITE_FALLBACK,
  telHref,
  whatsAppHref,
  type SiteSettings,
} from "../../lib/site";
import { Button } from "../ui/button";
import { SocialLinks } from "./SocialLinks";

const linkClass =
  "rounded-sm text-slate-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";

export function SiteFooter({ site = SITE_FALLBACK }: { site?: SiteSettings }) {
  const hasContact = Boolean(
    site.contactPhone ||
    site.contactWhatsApp ||
    site.contactEmail ||
    site.address ||
    site.transportProviders.length > 0,
  );

  return (
    <footer className="relative overflow-hidden border-t border-blush-100 bg-blush-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-blush-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-0 size-64 rounded-full bg-brand-100/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mt-10 flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-blush-100 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush-700">
              Ready when you are
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              Tell us the date, we bring the fun.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {site.contactPhone
                ? `Call ${site.contactPhone} or send a booking request — we reply the same day.`
                : "Send a booking request and we will confirm the details with you."}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to="/booking">
              Start a booking
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-sm text-xl font-bold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">
                {site.businessName.slice(0, 1)}
              </span>
              {site.businessName}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
              {site.aboutText ?? "Party equipment hire in Kenya."}
            </p>
            <SocialLinks site={site} className="mt-4" />
          </div>

          <nav aria-label="Footer">
            <h2 className="text-sm font-semibold text-slate-900">Explore</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {publicLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/booking/status" className={linkClass}>
                  Booking status
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
            {hasContact ? (
              <ul className="mt-4 space-y-3 text-sm">
                {site.contactPhone ? (
                  <li>
                    <a
                      href={telHref(site.contactPhone)}
                      className={`flex items-center gap-2.5 ${linkClass}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-blush-100">
                        <Phone aria-hidden="true" className="size-4" />
                      </span>
                      {site.contactPhone}
                      <span className="sr-only">Call us</span>
                    </a>
                  </li>
                ) : null}
                {site.contactWhatsApp ? (
                  <li>
                    <a
                      href={whatsAppHref(site.contactWhatsApp)}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2.5 ${linkClass}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-blush-100">
                        <MessageCircle aria-hidden="true" className="size-4" />
                      </span>
                      WhatsApp {site.contactWhatsApp}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ) : null}
                {site.contactEmail ? (
                  <li>
                    <a
                      href={mailtoHref(site.contactEmail)}
                      className={`flex items-center gap-2.5 ${linkClass}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-blush-100">
                        <Mail aria-hidden="true" className="size-4" />
                      </span>
                      {site.contactEmail}
                    </a>
                  </li>
                ) : null}
                {site.address ? (
                  <li className="flex items-start gap-2.5 text-slate-600">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-blush-100">
                      <MapPin aria-hidden="true" className="size-4" />
                    </span>
                    {site.address}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Phone, email and address are being updated.{" "}
                <Link to="/contact" className={linkClass}>
                  Visit the contact page
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-blush-200/70 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.businessName}. Party equipment hire.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <p>Bouncy castles, sound, tables and chairs.</p>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <LogIn aria-hidden="true" className="size-3.5" />
              Admin login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
