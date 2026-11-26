import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { EquipmentCard, EquipmentCardSkeleton } from "../../components/catalogue/EquipmentCard";
import { useEquipmentList } from "../../hooks/use-catalogue";
import { useSite } from "../../hooks/use-site";

const POPULAR_LIMIT = 4;

/** Castles first so the shelf leads with the party pieces, like the mockup. */
function castleRank(equipment: { category: { name: string } }): number {
  return /castle/i.test(equipment.category.name) ? 0 : 1;
}

export default function HomePage() {
  const catalogue = useEquipmentList({ page: 1, pageSize: 12 });
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  const popularEquipment = [...(catalogue.data?.items ?? [])]
    .sort((a, b) => castleRank(a) - castleRank(b))
    .slice(0, POPULAR_LIMIT);

  return (
    <div className="pb-16">
      {/* Hero: full-bleed photo with a sky-blue wash and baby-pink accent. */}
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
        <div className="relative mx-auto flex min-h-[480px] max-w-6xl items-center px-4 py-14 sm:min-h-[540px]">
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
    </div>
  );
}
