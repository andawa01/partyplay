import { LayoutGrid, PartyPopper, Search, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EquipmentCard, EquipmentCardSkeleton } from "../../components/catalogue/EquipmentCard";
import { Pagination } from "../../components/catalogue/Pagination";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/ui/error-state";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { useCategories, useEquipmentList } from "../../hooks/use-catalogue";
import { useSite } from "../../hooks/use-site";
import { cn } from "../../lib/cn";

const PAGE_SIZE = 12;

export default function EquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const site = useSite();
  const currency = site.data?.currency ?? "KES";
  const categories = useCategories();
  const list = useEquipmentList({
    category: category || undefined,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const [search, setSearch] = useState(q);

  const patchParams = useCallback(
    (patch: Record<string, string | null>, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    const term = search.trim();
    if (term === q) {
      return;
    }
    const timer = window.setTimeout(() => {
      patchParams({ q: term || null, page: null }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [patchParams, q, search]);

  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageOutOfRange = !list.isPending && total > 0 && page > totalPages;
  const from = total === 0 || pageOutOfRange ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = pageOutOfRange ? 0 : Math.min(page * PAGE_SIZE, total);
  const hasFilters = Boolean(q || category);
  const items = list.data?.items;

  function clearFilters() {
    setSearch("");
    patchParams({ q: null, category: null, page: null });
  }

  return (
    <div className="pb-16">
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
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-100">
              <PartyPopper aria-hidden="true" className="size-3.5" />
              Our equipment
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              High-quality party equipment for every occasion
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              Browse what is in the fleet, check the price and open an item to see everything
              included before you pick dates.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10" aria-labelledby="catalogue-heading">
        <h2 id="catalogue-heading" className="sr-only">
          Equipment catalogue
        </h2>

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
          {/* Category sidebar */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <LayoutGrid aria-hidden="true" className="size-3.5" />
                Categories
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                {categories.isPending ? (
                  <>
                    <Skeleton className="h-9 w-24 rounded-xl" />
                    <Skeleton className="h-9 w-28 rounded-xl" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                  </>
                ) : (
                  <>
                    <CategoryButton
                      active={category === ""}
                      onClick={() => patchParams({ category: null, page: null })}
                    >
                      All equipment
                    </CategoryButton>
                    {categories.data?.map((item) => (
                      <CategoryButton
                        key={item.id}
                        active={
                          category === item.slug ||
                          item.children.some((child) => child.slug === category)
                        }
                        onClick={() => patchParams({ category: item.slug, page: null })}
                      >
                        {item.name}
                      </CategoryButton>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 hidden rounded-2xl bg-gradient-to-br from-blush-100 to-blush-200 p-5 text-blush-900 ring-1 ring-blush-200 lg:block">
              <p className="text-sm font-semibold">Not sure what you need?</p>
              <p className="mt-1 text-xs leading-relaxed text-blush-800">
                Tell us about the venue and guest list and we will suggest a setup.
              </p>
              <Link
                to="/contact"
                className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-blush-800 shadow-sm transition hover:bg-blush-50"
              >
                Talk to us
              </Link>
            </div>
          </aside>

          {/* Grid */}
          <div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <label htmlFor="equipment-search" className="sr-only">
                  Search equipment
                </label>
                <Input
                  id="equipment-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search castles, sound, furniture…"
                  className="h-11 pl-9 pr-9"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      patchParams({ q: null, page: null }, true);
                    }}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
              <p className="px-1 text-sm text-slate-600 sm:text-right" aria-live="polite">
                {list.isPending
                  ? "Loading the catalogue…"
                  : pageOutOfRange
                    ? "That page is past the end"
                    : total === 0
                      ? hasFilters
                        ? "No matches for these filters"
                        : "The catalogue is empty"
                      : `${from}–${to} of ${total} item${total === 1 ? "" : "s"}`}
              </p>
            </div>

            <div className="mt-5">
              {list.isPending ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <EquipmentCardSkeleton key={index} />
                  ))}
                </div>
              ) : null}

              {list.isError && !list.data ? (
                <ErrorState
                  title="The catalogue could not load"
                  error={list.error}
                  onRetry={() => list.refetch()}
                  isRetrying={list.isFetching}
                />
              ) : null}

              {list.isError && list.data ? (
                <ErrorState
                  className="mb-5"
                  title="Some results may be out of date"
                  error={list.error}
                  onRetry={() => list.refetch()}
                  isRetrying={list.isFetching}
                />
              ) : null}

              {items && items.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((equipment) => (
                    <EquipmentCard key={equipment.id} equipment={equipment} currency={currency} />
                  ))}
                </div>
              ) : null}

              {pageOutOfRange ? (
                <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center sm:p-12">
                  <h3 className="text-xl font-semibold text-slate-900">
                    That page is past the end
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-slate-600">
                    The catalogue has {totalPages} page{totalPages === 1 ? "" : "s"} with these
                    filters. Jump back to the beginning.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() => patchParams({ page: null })}
                  >
                    Back to first page
                  </Button>
                </div>
              ) : null}

              {!list.isPending && !pageOutOfRange && items?.length === 0 ? (
                hasFilters ? (
                  <div className="rounded-2xl border border-dashed border-blush-300 bg-blush-50 p-8 text-center sm:p-12">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-blush-700 ring-1 ring-blush-200">
                      <Search aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      No equipment matches those filters
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-slate-600">
                      Try a shorter search term or a different category — the rest of the fleet is
                      one click away.
                    </p>
                    <Button type="button" variant="outline" className="mt-5" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center sm:p-12">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
                      <PartyPopper aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      The catalogue is being stocked
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-slate-600">
                      Nothing is listed for hire just yet. Tell us what you are planning and we will
                      point you to what is available.
                    </p>
                    <Button asChild className="mt-5">
                      <Link to="/contact">Talk to us</Link>
                    </Button>
                  </div>
                )
              ) : null}

              {items && items.length > 0 ? (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(nextPage) =>
                    patchParams({ page: nextPage <= 1 ? null : String(nextPage) })
                  }
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:w-full",
        active
          ? "bg-brand-700 text-white shadow-sm"
          : "text-slate-600 hover:bg-brand-50 hover:text-brand-800",
      )}
    >
      {children}
    </button>
  );
}
