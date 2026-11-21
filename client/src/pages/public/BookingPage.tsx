import { ArrowRight, Boxes, CalendarDays, LifeBuoy, Package, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AvailabilityCalendar } from "../../components/availability/AvailabilityCalendar";
import { AvailabilitySummary } from "../../components/availability/AvailabilitySummary";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import {
  useCalendarForDemands,
  useEquipmentAvailability,
  usePackageAvailability,
} from "../../hooks/use-availability";
import { useEquipmentDetail, useEquipmentList } from "../../hooks/use-catalogue";
import { usePackageDetail } from "../../hooks/use-packages";
import { isApiError } from "../../lib/api";
import { currentMonth, todayCalendarDate } from "../../lib/dates";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const equipmentSlug = searchParams.get("equipment")?.trim() ?? "";
  const packageSlug =
    equipmentSlug === "" ? (searchParams.get("package")?.trim() ?? "") : "";
  const isEquipment = equipmentSlug !== "";
  const isPackage = packageSlug !== "";
  const targetKey = isEquipment
    ? `equipment:${equipmentSlug}`
    : isPackage
      ? `package:${packageSlug}`
      : "none";

  const [month, setMonth] = useState(currentMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setStartDate("");
    setEndDate("");
    setMonth(currentMonth());
  }, [targetKey]);

  const today = todayCalendarDate();
  const equipmentQuery = useEquipmentDetail(equipmentSlug);
  const packageQuery = usePackageDetail(packageSlug);
  const catalogueQuery = useEquipmentList(
    { page: 1, pageSize: 100 },
    { enabled: isPackage },
  );

  const equipment = equipmentQuery.data;
  const pkg = packageQuery.data;

  const packageDemands = useMemo(() => {
    if (!pkg || !catalogueQuery.data) {
      return [];
    }
    const bySlug = new Map(catalogueQuery.data.items.map((item) => [item.slug, item]));
    return pkg.items.flatMap((item) => {
      const match = bySlug.get(item.equipment.slug);
      return match
        ? [
            {
              equipmentId: match.id,
              name: match.name,
              quantityPerPackage: item.quantity,
            },
          ]
        : [];
    });
  }, [pkg, catalogueQuery.data]);

  const missingPackageItems = useMemo(() => {
    if (!pkg || !catalogueQuery.data) {
      return [];
    }
    const slugs = new Set(catalogueQuery.data.items.map((item) => item.slug));
    return pkg.items.filter((item) => !slugs.has(item.equipment.slug));
  }, [pkg, catalogueQuery.data]);

  const demands = useMemo(() => {
    if (isEquipment && equipment) {
      return [
        {
          equipmentId: equipment.id,
          name: equipment.name,
          quantityPerPackage: 1,
        },
      ];
    }
    return isPackage ? packageDemands : [];
  }, [equipment, isEquipment, isPackage, packageDemands]);

  const calendar = useCalendarForDemands(demands, month);
  const equipmentAvailability = useEquipmentAvailability(
    isEquipment ? (equipment?.id ?? "") : "",
    startDate,
    endDate,
  );
  const packageAvailability = usePackageAvailability(
    isPackage ? packageSlug : "",
    startDate,
    endDate,
  );

  const targetPending = isEquipment
    ? equipmentQuery.isPending
    : isPackage
      ? packageQuery.isPending || catalogueQuery.isPending
      : false;

  const targetError = isEquipment
    ? equipmentQuery.error
    : isPackage
      ? packageQuery.error ?? catalogueQuery.error
      : null;
  const notFound =
    (isEquipment &&
      isApiError(equipmentQuery.error) &&
      equipmentQuery.error.status === 404) ||
    (isPackage &&
      isApiError(packageQuery.error) &&
      packageQuery.error.status === 404);

  const hasRange = startDate !== "" && endDate !== "";
  const summaryPending =
    hasRange &&
    (isEquipment ? equipmentAvailability.isPending : packageAvailability.isPending);
  const summaryError = isEquipment
    ? equipmentAvailability.error
    : packageAvailability.error;
  const summaryRetry = () => {
    if (isEquipment) {
      void equipmentAvailability.refetch();
    } else {
      void packageAvailability.refetch();
    }
  };
  const summaryRetrying = isEquipment
    ? equipmentAvailability.isFetching
    : packageAvailability.isFetching;

  function selectDate(date: string) {
    if (startDate === "" || endDate !== "") {
      setStartDate(date);
      setEndDate("");
      return;
    }
    if (date < startDate) {
      setStartDate(date);
      return;
    }
    setEndDate(date);
  }

  const title = isEquipment ? equipment?.name : isPackage ? pkg?.name : null;
  const detailHref = isEquipment
    ? `/equipment/${equipmentSlug}`
    : isPackage
      ? `/packages/${packageSlug}`
      : "/equipment";

  return (
    <div className="pb-16">
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-100 px-6 py-10 ring-1 ring-blush-100 sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-blush-200/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-brand-100/70 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-100">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Check availability
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Find dates that work
            </h1>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
              Pick your hire dates and we will check the live diary before you send a
              request. One short booking, no back-and-forth about what is free.
            </p>
          </div>
        </div>
      </section>

      {!isEquipment && !isPackage ? (
        <NoTarget />
      ) : targetPending ? (
        <BookingSkeleton />
      ) : notFound ? (
        <TargetNotFound />
      ) : targetError ? (
        <section className="mx-auto mt-8 max-w-6xl px-4">
          <ErrorState
            title="We could not load this item"
            error={targetError}
            onRetry={() => {
              if (isEquipment) {
                void equipmentQuery.refetch();
              } else {
                void packageQuery.refetch();
                void catalogueQuery.refetch();
              }
            }}
            isRetrying={
              isEquipment ? equipmentQuery.isFetching : packageQuery.isFetching
            }
          />
        </section>
      ) : (
        <section className="mx-auto mt-8 max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blush-100 bg-blush-50/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-blush-100"
              >
                {isPackage ? <Package className="size-5" /> : <Boxes className="size-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blush-700">
                  {isPackage ? "Checking a package" : "Checking equipment"}
                </p>
                <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">
                  {title}
                </p>
              </div>
              {isPackage ? (
                <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                  {pkg?.items.length ?? 0} items included
                </Badge>
              ) : null}
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to={detailHref}>View details</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {calendar.isError ? (
                  <ErrorState
                    title="The calendar could not load"
                    error={calendar.error}
                    onRetry={() => void calendar.refetch()}
                    isRetrying={calendar.isFetching}
                  />
                ) : (
                  <AvailabilityCalendar
                    month={month}
                    today={today}
                    days={calendar.days}
                    isPending={calendar.isPending}
                    startDate={startDate}
                    endDate={endDate}
                    unitLabel={isPackage ? "package" : "unit"}
                    onMonthChange={setMonth}
                    onSelectDate={selectDate}
                  />
                )}

                {missingPackageItems.length > 0 ? (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-100">
                    Part of this package is no longer listed, so the month view may be
                    incomplete. Choose your dates to check the package itself.
                  </p>
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                <p>
                  Dates are confirmed by the owner after your request. The diary shown here
                  is the same stock the request will be checked against.
                </p>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-6">
              <AvailabilitySummary
                startDate={startDate}
                endDate={endDate}
                isPending={summaryPending}
                isError={hasRange && Boolean(summaryError)}
                error={summaryError}
                rows={equipmentAvailability.data?.rows}
                meta={equipmentAvailability.data?.meta}
                packageAvailability={packageAvailability.data}
                onRetry={summaryRetry}
                isRetrying={summaryRetrying}
                onClear={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              />

              <div className="rounded-2xl border border-blush-100 bg-blush-50/60 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-blush-700 ring-1 ring-blush-100">
                  <LifeBuoy aria-hidden="true" className="size-5" />
                </span>
                <h2 className="mt-3 text-sm font-semibold text-slate-900">
                  Planning something bigger?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Tell us the venue and what the day needs — we can check a combination of
                  items and suggest a setup.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/contact">
                    Talk to us
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function NoTarget() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <CalendarDays aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            First, choose what you are hiring
          </h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-slate-600">
            Pick a party package or a single piece of equipment. We will bring you back here
            with the calendar ready.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/packages">
                Browse packages
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/equipment">Browse equipment</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-blush-100 bg-blush-50/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-blush-700">
            How it works
          </h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white font-semibold text-brand-700 ring-1 ring-blush-100">
                1
              </span>
              Choose a package or equipment item.
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white font-semibold text-brand-700 ring-1 ring-blush-100">
                2
              </span>
              Select your dates and see what is free.
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white font-semibold text-brand-700 ring-1 ring-blush-100">
                3
              </span>
              Send the request — the owner confirms the details.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function TargetNotFound() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-blush-300 bg-blush-50 px-6 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-blush-700 ring-1 ring-blush-200">
          <CalendarDays aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
          We could not find that item
        </h2>
        <p className="mt-2 text-slate-600">
          It may have been renamed, taken down, or the link is incomplete. The calendar
          needs a current item to check.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/equipment">Browse equipment</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/packages">Browse packages</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function BookingSkeleton() {
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4" aria-busy="true">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[430px] w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <span className="sr-only">Loading availability…</span>
    </section>
  );
}
