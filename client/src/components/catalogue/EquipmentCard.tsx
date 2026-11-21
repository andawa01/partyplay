import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import type { EquipmentSummary } from "../../lib/catalogue";
import { priceLabel, stockLabel } from "../../lib/catalogue";
import { Badge } from "../ui/badge";
import { EquipmentImage } from "./EquipmentImage";

export function EquipmentCard({
  equipment,
  currency,
}: {
  equipment: EquipmentSummary;
  currency: string;
}) {
  const price = priceLabel(equipment, currency);
  const stock = stockLabel(equipment.total);

  return (
    <Link
      to={`/equipment/${equipment.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3]">
        <EquipmentImage
          src={equipment.imageUrl}
          alt={equipment.name}
          className="size-full"
        />
        <Badge
          variant="outline"
          className="absolute left-3 top-3 border-white/70 bg-white/90 text-brand-800 backdrop-blur"
        >
          {equipment.category.name}
        </Badge>
        <Badge
          variant={stock.variant}
          className="absolute right-3 top-3 shadow-sm"
        >
          {stock.label}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-brand-800">
          {equipment.name}
        </h3>
        {equipment.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {equipment.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-xl font-semibold tracking-tight text-slate-900">
              {price.amount}
            </span>
            {price.unit ? <span className="text-sm text-slate-500">{price.unit}</span> : null}
          </p>
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-700 group-hover:text-white"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function EquipmentCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="size-9 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
