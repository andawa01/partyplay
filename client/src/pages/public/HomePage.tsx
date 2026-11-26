import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Sparkles,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EquipmentCard, EquipmentCardSkeleton } from "../../components/catalogue/EquipmentCard";
import { PackageCard, PackageCardSkeleton } from "../../components/packages/PackageCard";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { useCategories, useEquipmentList } from "../../hooks/use-catalogue";
import { usePackages } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";
import { hasValidRentalDates } from "../../lib/bookings";
import { todayCalendarDate } from "../../lib/dates";

const POPULAR_LIMIT = 4;
const PACKAGE_LIMIT = 3;

const trustPoints = [
  { icon: Truck, label: "Delivery and setup", detail: "We bring it, set it up and collect it." },
  { icon: ShieldCheck, label: "Cleaned and inspected", detail: "Checked before every booking." },
  { icon: CalendarRange, label: "Flexible hire dates", detail: "Single days or full weekends." },
  {
    icon: CalendarDays,
    label: "One booking request",
    detail: "We confirm availability and totals.",
  },
];

const steps = [
  {
    title: "Pick items and dates",
    body: "Browse the fleet, choose what you need and add your rental dates.",
  },
  {
    title: "Send one request",
    body: "Tell us the venue and contact details. No payment is taken online.",
  },
  {
    title: "We confirm and deliver",
    body: "We check stock, confirm the total and bring everything on the day.",
  },
];

/** Castles first so the shelf leads with the party pieces. */
function castleRank(equipment: { category: { name: string } }): number {
  return /castle/i.test(equipment.category.name) ? 0 : 1;
}

export default function HomePage() {
  const navigate = useNavigate();
  const catalogue = useEquipmentList({ page: 1, pageSize: 12 });
  const categories = useCategories();
  const packages = usePackages();
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const popularEquipment = [...(catalogue.data?.items ?? [])]
    .sort((a, b) => castleRank(a) - castleRank(b))
    .slice(0, POPULAR_LIMIT);

  const allPackages = packages.data ?? [];
  const featuredPackages = allPackages.filter((pkg) => pkg.isFeatured);
  const shownPackages = (
    featuredPackages.length >= PACKAGE_LIMIT
      ? featuredPackages
      : [...featuredPackages, ...allPackages.filter((pkg) => !pkg.isFeatured)]
  ).slice(0, PACKAGE_LIMIT);

  const rootCategories = (categories.data ?? []).slice(0, 3);

  function handleDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (hasValidRentalDates(startDate, endDate)) {
      query.set("startDate", startDate);
      query.set("endDate", endDate);
    }
    const suffix = query.toString();
    navigate(`/booking${suffix ? `?${suffix}` : ""}`);
  }

  return (
    <div className="pb-16">
      {/* Hero with a date entry bar, the pattern shared by the strongest rental sites. */}
      <section className="relative isolate overflow-hidden bg-brand-900">
        <img
          src="/hero-party.jpg"
          alt="Children celebrating at a party with balloons and a bouncy castle"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-800/75 to-blush-400/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-900/70 to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-14 sm:pt-20">
          <div className="max-w-xl text-white">
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
              Make Every Party <span className="block text-blush-200">Unforgettable!</span>
            </h1>
            <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] sm:text-lg">
              Premium party equipment rentals for kids&apos; celebrations.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/equipment"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-900 shadow-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
              >
                Browse Equipment
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                to="/packages"
                className="inline-flex items-center gap-2 rounded-full bg-blush-400 px-6 py-3 font-semibold text-brand-950 shadow-sm transition hover:bg-blush-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
              >
                View Packages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Date bar overlapping the hero */}
      <div className="relative z-10 mx-auto -mt-16 max-w-4xl px-4">
        <form
          onSubmit={handleDateSubmit}
          className="grid gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5"
          aria-label="Start a booking with your dates"
        >
          <div>
            <Label htmlFor="home-start" className="text-xs font-semibold text-slate-600">
              Start date
            </Label>
            <Input
              id="home-start"
              type="date"
              value={startDate}
              min={todayCalendarDate()}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label htmlFor="home-end" className="text-xs font-semibold text-slate-600">
              End date
            </Label>
            <Input
              id="home-end"
              type="date"
              value={endDate}
              min={startDate || todayCalendarDate()}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 h-11"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            Check dates &amp; book
          </button>
        </form>
      </div>

      {/* Trust strip */}
      <section className="mx-auto mt-12 max-w-6xl px-4" aria-label="Why book with us">
        <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by category */}
      <section className="mt-14 bg-blush-50/70 py-12" aria-labelledby="categories-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blush-700">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Shop by category
              </p>
              <h2
                id="categories-heading"
                className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              >
                Everything for the day, in one place
              </h2>
            </div>
            <Link
              to="/equipment"
              className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition hover:border-brand-200"
            >
              All equipment
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {categories.isPending
              ? Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-20 rounded-2xl bg-white/80" />
                ))
              : rootCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/equipment?category=${encodeURIComponent(category.slug)}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-blush-100 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span>
                      <span className="block text-base font-semibold text-slate-900 group-hover:text-brand-800">
                        {category.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">Browse the range</span>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush-100 text-blush-700 transition group-hover:bg-brand-700 group-hover:text-white">
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Our Popular Equipment */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="popular-heading">
        <h2
          id="popular-heading"
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Our Popular Equipment
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {catalogue.isPending
            ? Array.from({ length: POPULAR_LIMIT }, (_, index) => (
                <EquipmentCardSkeleton key={index} />
              ))
            : popularEquipment.map((equipment) => (
                <EquipmentCard key={equipment.id} equipment={equipment} currency={currency} />
              ))}
        </div>
      </section>

      {/* Packages */}
      {packages.isPending || shownPackages.length > 0 ? (
        <section className="bg-brand-50/70 py-12" aria-labelledby="packages-heading">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  Party packages
                </p>
                <h2
                  id="packages-heading"
                  className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                >
                  One price for the whole setup
                </h2>
              </div>
              <Link
                to="/packages"
                className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition hover:border-brand-200"
              >
                All packages
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.isPending
                ? Array.from({ length: PACKAGE_LIMIT }, (_, index) => (
                    <PackageCardSkeleton key={index} />
                  ))
                : shownPackages.map((pkg) => (
                    <PackageCard key={pkg.id} pkg={pkg} currency={currency} />
                  ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="steps-heading">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush-700">
            How it works
          </p>
          <h2
            id="steps-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Booking takes three steps
          </h2>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
