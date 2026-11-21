import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { PackageCard } from "../../components/packages/PackageCard";
import { Button } from "../../components/ui/button";
import { usePackages } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";

const FEATURED_LIMIT = 3;

export default function HomePage() {
  const packages = usePackages();
  const site = useSite();
  const currency = site.data?.currency ?? "KES";
  const featuredPackages = (packages.data ?? [])
    .filter((pkg) => pkg.isFeatured)
    .slice(0, FEATURED_LIMIT);

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-slate-900">
          Make every <span className="text-brand-600">party</span> unforgettable
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Bouncing castles, sound systems, tables and chairs for hire in Kenya.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/equipment"
            className="rounded-lg bg-brand-700 px-6 py-3 font-medium text-white hover:bg-brand-800"
          >
            Browse equipment
          </Link>
          <Link
            to="/booking"
            className="rounded-lg border border-blush-200 bg-white px-6 py-3 font-medium text-blush-800 hover:bg-blush-50"
          >
            Book now
          </Link>
        </div>
      </section>


      {featuredPackages.length > 0 ? (
        <section
          className="mx-auto max-w-6xl px-4"
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
                className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
              >
                The setups our customers book most
              </h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Complete party bundles with the castle, seating, tables and sound already
                worked out — one price, one booking.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
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
    </div>
  );
}
