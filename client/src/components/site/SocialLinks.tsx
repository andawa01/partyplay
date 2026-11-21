import { ArrowUpRight } from "lucide-react";

import { cn } from "../../lib/cn";
import { siteSocialLinks, type SiteSettings } from "../../lib/site";

/** Renders nothing when the owner has not filled in any profile. */
export function SocialLinks({
  site,
  className,
}: {
  site: SiteSettings;
  className?: string;
}) {
  const links = siteSocialLinks(site);
  if (links.length === 0) {
    return null;
  }

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-blush-200 bg-white px-3 py-1 text-sm font-medium text-blush-800 hover:bg-blush-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {link.label}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
