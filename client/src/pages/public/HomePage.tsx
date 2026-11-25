import { ArrowRight, CalendarClock, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import { EquipmentCard, EquipmentCardSkeleton } from "../../components/catalogue/EquipmentCard";
import { PackageCard } from "../../components/packages/PackageCard";
import { Button } from "../../components/ui/button";
import { useEquipmentList } from "../../hooks/use-catalogue";
import { usePackages } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";

const FEATURED_LIMIT = 3;
const POPULAR_LIMIT = 4;

const highlights = [
  {
    icon: ShieldCheck,
    title: "Cleaned and checked",
    description: "Every castle and setup is inspected before it leaves for your venue.",
  },
  {
    icon: Truck,
    title: "Delivery or pickup",
    description: "We deliver and set up, or you collect — whichever suits the day.",
  },
  {
    icon: CalendarClock,
    title: "Simple booking request",
    description: "Pick items, choose dates and send one request. We confirm the rest.",
  },
];

export default function HomePage() {
  const packages = usePackages();
  const catalogue = useEquipmentList({ page: 1, pageSize: POPULAR_LIMIT });
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  const featuredPackages = (packages.data ?? [])
    .filter((pkg) => pkg.isFeatured)
    .slice(0, FEATURED_LIMIT);
  const popularEquipment = catalogue.data?.items ?? [];

  return (
    <div className="pb-20">
      {/* Hero: full-bleed image with overlay, matching the mockup */}
      <section className="mx-auto max-w-6xl px-4 pt-5">
        <div className="relative overflow-hidden rounded-[2rem] shadow-xl shadow-brand-900/10">
          <img
            src="/hero-party.jpg"
            alt="A colourful bouncy castle set up for a party"
            className="h-[420px] w-full object-cover sm:h-[500px]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-900/80 to-brand-900/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-900/75 to-transparent"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-xl px-6 text-white sm:px-10 lg:px-14">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white ring-1 ring-white/40 backdrop-blur">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Party equipment rental
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-5xl lg:text-6xl">
                Make Every Party <span className="text-blush-200">Unforgettable!</span>
              </h1>
              <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] sm:text-lg">
                Bouncy castles, slides, tents, tables and chairs for hire in Kenya. Premium party
                equipment, delivered and set up so you can enjoy the day.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/equipment"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
                >
                  Browse Equipment
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/15 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  View Packages
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 py-10 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular equipment */}
      <section className="mx-auto max-w-6xl px-4" aria-labelledby="popular-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Our popular equipment
            </p>
            <h2
              id="popular-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              What parties book the most
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Freshest picks from the fleet — open any item to see the price and full details.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 rounded-full">
            <Link to="/equipment">
              See all equipment
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {catalogue.isPending
            ? Array.from({ length: POPULAR_LIMIT }, (_, index) => (
                <EquipmentCardSkeleton key={index} />
              ))
            : popularEquipment.map((equipment) => (
                <EquipmentCard key={equipment.id} equipment={equipment} currency={currency} />
              ))}
        </div>
      </section>

      {/* Featured packages */}
      {featuredPackages.length > 0 ? (
        <section
          className="mx-auto mt-16 max-w-6xl px-4"
          aria-labelledby="featured-packages-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blush-700">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Featured packages
              </p>
              <h2
                id="featured-packages-heading"
                className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              >
                The setups our customers book most
              </h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Complete party bundles with the castle, seating, tables and sound already worked out
                — one price, one booking.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 rounded-full">
              <Link to="/packages">
                See all packages
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA band */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-blush-400/20 blur-3xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">
                Ready when you are
              </p>
              <p className="mt-1 text-2xl font-bold">Tell us the date, we bring the fun.</p>
              <p className="mt-1 max-w-md text-sm text-brand-100">
                Send one request and we will confirm availability, delivery and the final total.
              </p>
            </div>
            <Link
              to="/booking"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
            >
              Start a booking
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
