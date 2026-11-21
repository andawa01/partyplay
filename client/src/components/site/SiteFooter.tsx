import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { publicLinks } from "../../lib/navigation";
import {
  mailtoHref,
  SITE_FALLBACK,
  telHref,
  whatsAppHref,
  type SiteSettings,
} from "../../lib/site";
import { SocialLinks } from "./SocialLinks";

const linkClass =
  "rounded-sm text-slate-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200";

export function SiteFooter({ site = SITE_FALLBACK }: { site?: SiteSettings }) {
  const hasContact = Boolean(
    site.contactPhone ||
      site.contactWhatsApp ||
      site.contactEmail ||
      site.address ||
      site.transportProviders.length > 0,
  );

  return (
    <footer className="border-t border-blush-100 bg-blush-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-semibold text-brand-700">{site.businessName}</p>
          <p className="mt-2 max-w-xs text-sm text-slate-600">
            {site.aboutText ?? "Party equipment hire in Kenya."}
          </p>
          <SocialLinks site={site} className="mt-4" />
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-slate-900">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {publicLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          {hasContact ? (
            <ul className="mt-3 space-y-2 text-sm">
              {site.contactPhone ? (
                <li>
                  <a
                    href={telHref(site.contactPhone)}
                    className={`inline-flex items-center gap-2 ${linkClass}`}
                  >
                    <Phone aria-hidden="true" className="size-4 text-brand-600" />
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
                    className={`inline-flex items-center gap-2 ${linkClass}`}
                  >
                    <MessageCircle aria-hidden="true" className="size-4 text-brand-600" />
                    WhatsApp {site.contactWhatsApp}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
              {site.contactEmail ? (
                <li>
                  <a
                    href={mailtoHref(site.contactEmail)}
                    className={`inline-flex items-center gap-2 ${linkClass}`}
                  >
                    <Mail aria-hidden="true" className="size-4 text-brand-600" />
                    {site.contactEmail}
                  </a>
                </li>
              ) : null}
              {site.address ? (
                <li className="flex items-start gap-2 text-slate-600">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {site.address}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Phone, email and address are being updated.{" "}
              <Link to="/contact" className={linkClass}>
                Visit the contact page
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-blush-200/70">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-slate-500">
          © {new Date().getFullYear()} {site.businessName}. Party equipment hire.
        </p>
      </div>
    </footer>
  );
}
