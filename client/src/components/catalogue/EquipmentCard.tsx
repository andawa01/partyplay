import { Link } from "react-router-dom";

import type { EquipmentSummary } from "../../lib/catalogue";
import { priceLabel } from "../../lib/catalogue";
import { EquipmentImage } from "./EquipmentImage";

export function EquipmentCard({
  equipment,
  currency,
}: {
  equipment: EquipmentSummary;
  currency: string;
}) {
  const price = priceLabel(equipment, currency);
  const unit = price.unit === "per day" ? "day" : null;
  const detailPath = `/equipment/${equipment.slug}`;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={detailPath}
        className="relative block aspect-[4/3] shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset"
      >
        <EquipmentImage
          src={equipment.imageUrl}
          alt={equipment.name}
          className="absolute inset-0 size-full transition duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col items-center p-4 text-center">
        <h3 className="text-base font-semibold tracking-tight text-slate-900 group-hover:text-brand-800">
          <Link to={detailPath} className="hover:underline">
            {equipment.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-baseline justify-center gap-x-1">
          <span className="text-lg font-bold tracking-tight text-brand-800">{price.amount}</span>
          {unit ? <span className="text-xs text-slate-500">/ {unit}</span> : null}
        </p>

        <Link
          to={`/booking?equipment=${encodeURIComponent(equipment.slug)}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}

export function EquipmentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-10 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}
