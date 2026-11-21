/**
 * Shapes and link helpers for `GET /api/site`. The endpoint returns a flat settings row
 * plus the active transport providers; everything customer-facing is nullable except the
 * business name, currency and default duration.
 */

export interface SiteTransportProvider {
  name: string;
  phone: string;
  serviceArea: string | null;
}

export interface SiteSettings {
  businessName: string;
  contactPhone: string | null;
  contactWhatsApp: string | null;
  contactEmail: string | null;
  address: string | null;
  aboutText: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  xUrl: string | null;
  defaultDurationDays: number;
  currency: string;
  transportProviders: SiteTransportProvider[];
}

/**
 * Chrome must never go blank while the request is in flight or after it fails, so the
 * header and footer render from this until real settings arrive.
 */
export const SITE_FALLBACK: SiteSettings = {
  businessName: "PartyPlay",
  contactPhone: null,
  contactWhatsApp: null,
  contactEmail: null,
  address: null,
  aboutText: null,
  facebookUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  xUrl: null,
  defaultDurationDays: 1,
  currency: "KES",
  transportProviders: [],
};

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

export interface SiteSocialLink {
  label: string;
  href: string;
}

/** Only the profiles the owner has actually filled in, in a stable order. */
export function siteSocialLinks(site: SiteSettings): SiteSocialLink[] {
  const links: Array<SiteSocialLink | null> = [
    site.facebookUrl ? { label: "Facebook", href: site.facebookUrl } : null,
    site.instagramUrl ? { label: "Instagram", href: site.instagramUrl } : null,
    site.tiktokUrl ? { label: "TikTok", href: site.tiktokUrl } : null,
    site.xUrl ? { label: "X", href: site.xUrl } : null,
  ];
  return links.filter((link): link is SiteSocialLink => link !== null);
}
