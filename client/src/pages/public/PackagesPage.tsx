import { ArrowRight, PartyPopper, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PackageCard, PackageCardSkeleton } from '../../components/packages/PackageCard'
import { Button } from '../../components/ui/button'
import { ErrorState } from '../../components/ui/error-state'
import { usePackages } from '../../hooks/use-packages'
import { useSite } from '../../hooks/use-site'

export default function PackagesPage() {
  const packages = usePackages()
  const site = useSite()
  const currency = site.data?.currency ?? 'KES'

  return (
    <div className="pb-4">
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blush-50 via-white to-brand-100 px-6 py-12 ring-1 ring-blush-100 sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-blush-200/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-brand-100/70 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blush-700 ring-1 ring-blush-200">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Party packages
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everything for the party, in one booking
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              A castle, the seating, the tables and the sound — put together so you can plan
              less and celebrate more.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4" aria-labelledby="packages-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="packages-heading" className="text-2xl font-semibold tracking-tight text-slate-900">
              Choose your setup
            </h2>
            <p className="mt-1 text-slate-600">
              Every package lists exactly what arrives, straight from the catalogue.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/equipment">
              Prefer to pick items?
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          {packages.isPending ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <PackageCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {packages.isError ? (
            <ErrorState
              title="Packages could not load"
              error={packages.error}
              onRetry={() => packages.refetch()}
              isRetrying={packages.isFetching}
            />
          ) : null}

          {packages.data && packages.data.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {packages.data.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} currency={currency} />
              ))}
            </div>
          ) : null}

          {packages.data && packages.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center sm:p-12">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
                <PartyPopper aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                No packages are published yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                The owner is putting the bundles together. You can still browse individual
                items or tell us what you are planning.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/equipment">Browse equipment</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contact">Talk to us</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="flex flex-col gap-4 rounded-2xl bg-brand-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-100">
              Need a different mix?
            </p>
            <p className="mt-1 text-xl font-semibold">
              We can build around your venue and guest list.
            </p>
          </div>
          <Button asChild variant="secondary" size="lg" className="shrink-0">
            <Link to="/contact">
              Ask us to tailor one
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
