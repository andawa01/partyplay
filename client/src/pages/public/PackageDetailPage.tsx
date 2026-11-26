import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock, PartyPopper } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PackageImage } from "../../components/packages/PackageImage";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { usePackageDetail } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";
import { isApiError } from "../../lib/api";
import { itemLabel, packageDurationLabel, packagePriceLabel } from "../../lib/packages";

export default function PackageDetailPage() {
  const { slug = "" } = useParams();
  const detail = usePackageDetail(slug);
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  if (detail.isPending) {
    return <PackageDetailSkeleton />;
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
              That package is not available
            </h1>
            <p className="mt-2 text-slate-600">
              It may have been renamed or taken down. The current packages are still here.
            </p>
            <Button asChild className="mt-6">
              <Link to="/packages">Browse all packages</Link>
            </Button>
          </div>
        ) : (
          <ErrorState
            title="This package could not load"
            error={detail.error}
            onRetry={() => detail.refetch()}
            isRetrying={detail.isFetching}
          />
        )}
      </section>
    );
  }

  const pkg = detail.data;
  const duration = packageDurationLabel(pkg.duration);

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
          to="/packages"
          className="rounded-sm hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          Packages
        </Link>
        <ChevronRight aria-hidden="true" className="size-3.5 text-slate-400" />
        <span aria-current="page" className="truncate font-medium text-slate-700">
          {pkg.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="overflow-hidden rounded-3xl shadow-sm ring-1 ring-slate-200">
          <PackageImage src={pkg.imageUrl} alt={pkg.name} className="aspect-[16/10] w-full" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {pkg.isFeatured ? <Badge className="bg-blush-600 text-white">Featured</Badge> : null}
            {duration ? (
              <Badge variant="outline" className="gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                {duration} hire
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {pkg.name}
          </h1>

          {pkg.description ? (
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">
              {pkg.description}
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
              What is included
            </h2>
            <ul className="mt-3 space-y-2.5">
              {pkg.items.map((item) => (
                <li key={item.equipment.slug} className="flex items-start gap-2.5 text-slate-700">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                  <Link
                    to={`/equipment/${item.equipment.slug}`}
                    className="rounded-sm hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    {itemLabel(item)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Package price</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {packagePriceLabel(pkg, currency)}
              </span>
              {duration ? <span className="text-slate-500">for {duration}</span> : null}
            </p>

            <Button asChild size="lg" className="mt-5 w-full">
              <Link to={`/booking?package=${encodeURIComponent(pkg.slug)}`}>
                <CalendarDays aria-hidden="true" className="size-4" />
                Check dates &amp; book this package
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">
              The owner confirms availability, delivery and the final total after your request.
            </p>
          </div>

          <Link
            to="/packages"
            className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all packages
          </Link>
        </div>
      </div>
    </section>
  );
}

function PackageDetailSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
        <div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-44 w-full rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading package details…</span>
    </section>
  );
}
