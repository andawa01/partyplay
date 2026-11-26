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

/**
 * Numbers are stored in the local 10-digit format the API validates (0712345678).
 * WhatsApp needs the country code, so a leading 0 becomes 254.
 */
export function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international =
    digits.length === 10 && digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

/** Display only: 0115299171 reads as +254 115 299171 while storage stays local. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+254 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 12 && digits.startsWith("254")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
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
