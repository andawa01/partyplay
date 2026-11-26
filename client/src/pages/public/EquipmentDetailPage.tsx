import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  Info,
  PartyPopper,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { EquipmentImage } from "../../components/catalogue/EquipmentImage";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { useEquipmentDetail } from "../../hooks/use-catalogue";
import { useSite } from "../../hooks/use-site";
import { isApiError } from "../../lib/api";
import { priceLabel, stockLabel, weeklyPriceLabel } from "../../lib/catalogue";
import { todayCalendarDate } from "../../lib/dates";

export default function EquipmentDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const detail = useEquipmentDetail(slug);
  const site = useSite();
  const currency = site.data?.currency ?? "KES";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (detail.isPending) {
    return <DetailSkeleton />;
  }

  if (detail.isError) {
    const notFound = isApiError(detail.error) && detail.error.status === 404;

    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        {notFound ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-blush-300 bg-blush-50 px-6 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-blush-700 ring-1 ring-blush-200">
              <PartyPopper aria-hidden="true" className="size-5" />
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              We could not find that item
            </h1>
            <p className="mt-2 text-slate-600">
              It may have been renamed or taken out of the catalogue. The rest of the fleet is still
              here.
            </p>
            <Button asChild className="mt-6">
              <Link to="/equipment">Browse all equipment</Link>
            </Button>
          </div>
        ) : (
          <ErrorState
            title="This item could not load"
            error={detail.error}
            onRetry={() => detail.refetch()}
            isRetrying={detail.isFetching}
          />
        )}
      </section>
    );
  }

  const equipment = detail.data;
  const price = priceLabel(equipment, currency);
  const weekly = weeklyPriceLabel(equipment, currency);
  const stock = stockLabel(equipment.total);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link
          to="/"
          className="rounded-sm hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          Home
        </Link>
        <ChevronRight aria-hidden="true" className="size-3.5 text-slate-400" />
        <Link
          to="/equipment"
          className="rounded-sm hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          Equipment
        </Link>
        <ChevronRight aria-hidden="true" className="size-3.5 text-slate-400" />
        <span aria-current="page" className="truncate font-medium text-slate-700">
          {equipment.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="overflow-hidden rounded-3xl shadow-sm ring-1 ring-slate-200">
          <EquipmentImage
            src={equipment.imageUrl}
            alt={equipment.name}
            className="aspect-[4/3] w-full"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{equipment.category.name}</Badge>
            <Badge variant={stock.variant}>{stock.label}</Badge>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {equipment.name}
          </h1>

          {equipment.description ? (
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">
              {equipment.description}
            </p>
          ) : (
            <p className="mt-3 leading-relaxed text-slate-600">
              Ask us about the details, delivery and setup for this item.
            </p>
          )}

          {equipment.note ? (
            <div className="mt-5 flex gap-3 rounded-xl bg-blush-50 p-4 ring-1 ring-blush-100">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blush-700" />
              <p className="text-sm leading-relaxed text-blush-900">{equipment.note}</p>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Hire rate</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {price.amount}
              </span>
              {price.unit ? <span className="text-slate-500">/ {price.unit}</span> : null}
            </p>
            {weekly ? <p className="mt-1 text-sm text-slate-500">{weekly}</p> : null}

            <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  <Boxes aria-hidden="true" className="size-4 text-slate-400" />
                  In the fleet
                </dt>
                <dd className="font-medium text-slate-900">
                  {equipment.total} unit{equipment.total === 1 ? "" : "s"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Hire quantity</dt>
                <dd className="font-medium text-slate-900">
                  {equipment.minQuantity === equipment.maxQuantity
                    ? `${equipment.minQuantity}`
                    : `${equipment.minQuantity}–${equipment.maxQuantity}`}
                </dd>
              </div>
            </dl>

            <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm text-slate-700 sm:grid-cols-2">
              {["Delivery or collection", "Flexible hire dates", "Stock confirmed by owner"].map(
                (feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Check aria-hidden="true" className="size-3" />
                    </span>
                    {feature}
                  </li>
                ),
              )}
            </ul>

            <form
              className="mt-5 border-t border-slate-100 pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                const query = new URLSearchParams({ equipment: equipment.slug });
                if (startDate) query.set("startDate", startDate);
                if (endDate) query.set("endDate", endDate);
                navigate(`/booking?${query.toString()}`);
              }}
            >
              <p className="text-sm font-semibold text-slate-900">Select rental dates</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="hire-start" className="text-xs text-slate-500">
                    Start date
                  </Label>
                  <Input
                    id="hire-start"
                    type="date"
                    value={startDate}
                    min={todayCalendarDate()}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="hire-end" className="text-xs text-slate-500">
                    End date
                  </Label>
                  <Input
                    id="hire-end"
                    type="date"
                    value={endDate}
                    min={startDate || todayCalendarDate()}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-4 w-full">
                <CalendarDays aria-hidden="true" className="size-4" />
                Add to Booking
              </Button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Dates are confirmed by the owner after you send the request.
              </p>
            </form>
          </div>

          <Link
            to="/equipment"
            className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all equipment
          </Link>
        </div>
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        <div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading equipment details…</span>
    </section>
  );
}
