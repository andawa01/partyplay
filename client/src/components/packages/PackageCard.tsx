import { Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import type { PartyPackage } from "../../lib/packages";
import { itemLabel, packageDurationLabel, packagePriceLabel } from "../../lib/packages";
import { Badge } from "../ui/badge";
import { PackageImage } from "./PackageImage";

export function PackageCard({ pkg, currency }: { pkg: PartyPackage; currency: string }) {
  const duration = packageDurationLabel(pkg.duration);
  const visibleItems = pkg.items.slice(0, 3);
  const extraItems = pkg.items.length - visibleItems.length;

  return (
    <Link
      to={`/packages/${pkg.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] shrink-0">
        <PackageImage src={pkg.imageUrl} alt={pkg.name} className="absolute inset-0 size-full" />
        {pkg.isFeatured ? (
          <Badge className="absolute left-3 top-3 bg-blush-600 text-white shadow-sm">
            Featured
          </Badge>
        ) : null}
        {duration ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            <Clock aria-hidden="true" className="size-3.5" />
            {duration}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900 group-hover:text-brand-800">
          {pkg.name}
        </h3>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            What is included
          </p>
          <ul className="mt-2 space-y-1.5">
            {visibleItems.map((item) => (
              <li
                key={item.equipment.slug}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                {itemLabel(item)}
              </li>
            ))}
          </ul>
          {extraItems > 0 ? (
            <p className="mt-2 pl-5.5 text-sm text-slate-500">+ {extraItems} more included</p>
          ) : null}
        </div>

        <div className="mt-auto pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Package price
          </p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">
            {packagePriceLabel(pkg, currency)}
          </p>
          <span className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-brand-800">
            View Package
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PackageCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="flex items-center justify-between pt-3">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
          <div className="size-9 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
