import { CalendarDays, Gift, Percent, Sparkles, Tag } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { useOffers } from "../../hooks/use-packages";
import { useSite } from "../../hooks/use-site";
import {
  offerAppliesToLabel,
  offerDiscountLabel,
  offerValidityLabel,
  type Offer,
} from "../../lib/packages";

export default function OffersPage() {
  const offers = useOffers();
  const site = useSite();
  const currency = site.data?.currency ?? "KES";

  return (
    <div className="pb-4">
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blush-100 via-white to-brand-50 px-6 py-12 ring-1 ring-blush-200 sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-blush-200/70 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/4 size-64 rounded-full bg-brand-100/70 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blush-700 ring-1 ring-blush-200">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Promotions
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              A little extra for your celebration
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              Seasonal offers and weekday savings we are running right now. Take a look, then tell
              us which one caught your eye.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4" aria-labelledby="offers-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="offers-heading"
              className="text-2xl font-semibold tracking-tight text-slate-900"
            >
              Current offers
            </h2>
            <p className="mt-1 text-slate-600">
              Promotions are display-only — the owner confirms any discount when your booking is
              confirmed.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/contact">
              <Tag aria-hidden="true" className="size-4" />
              Ask about an offer
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          {offers.isPending ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <OfferSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {offers.isError ? (
            <ErrorState
              title="Offers could not load"
              error={offers.error}
              onRetry={() => offers.refetch()}
              isRetrying={offers.isFetching}
            />
          ) : null}

          {offers.data && offers.data.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {offers.data.map((offer) => (
                <OfferCard key={offer.id} offer={offer} currency={currency} />
              ))}
            </div>
          ) : null}

          {offers.data && offers.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blush-300 bg-blush-50 p-8 text-center sm:p-12">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-blush-700 ring-1 ring-blush-200">
                <Gift aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                No offers are running right now
              </h3>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                New promotions appear here when the owner publishes them. In the meantime, browse
                the packages or ask us what is available.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/packages">Browse packages</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
          <strong className="font-semibold text-slate-800">How offers work:</strong> the online
          booking request does not apply discounts automatically. Any offer you see here is
          confirmed by the owner by phone or WhatsApp before your booking is final.
        </p>
      </section>
    </div>
  );
}

function OfferCard({ offer, currency }: { offer: Offer; currency: string }) {
  const Icon = offer.discountType === "PERCENTAGE" ? Percent : Gift;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-blush-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blush-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-blush-50 text-blush-700 ring-1 ring-blush-100">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="text-lg font-bold tracking-tight text-blush-700">
          {offerDiscountLabel(offer, currency)}
        </p>
      </div>

      <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{offer.name}</h3>
      {offer.description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{offer.description}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100">
          {offerAppliesToLabel(offer)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          {offerValidityLabel(offer)}
        </span>
      </div>
    </article>
  );
}

function OfferSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="size-11 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-5 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-200" />
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
