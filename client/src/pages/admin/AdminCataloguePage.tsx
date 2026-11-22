import {
  ArrowUpRight,
  BadgePercent,
  Boxes,
  Folder,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { CategoriesPanel } from "../../components/admin/catalogue/CategoriesPanel";
import { EquipmentPanel } from "../../components/admin/catalogue/EquipmentPanel";
import { OffersPanel } from "../../components/admin/catalogue/OffersPanel";
import { PackagesPanel } from "../../components/admin/catalogue/PackagesPanel";
import { TransportProvidersPanel } from "../../components/admin/catalogue/TransportProvidersPanel";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  useAdminCategories,
  useAdminEquipment,
  useAdminOffers,
  useAdminPackages,
  useTransportProviders,
} from "../../hooks/use-admin-catalogue";
import { useSite } from "../../hooks/use-site";
import { cn } from "../../lib/cn";

const tabs = [
  {
    id: "equipment",
    label: "Equipment",
    icon: Boxes,
    description: "Items, prices and stock",
  },
  {
    id: "packages",
    label: "Packages",
    icon: Package,
    description: "Bundles and included items",
  },
  {
    id: "offers",
    label: "Offers",
    icon: BadgePercent,
    description: "Public promotions",
  },
  {
    id: "categories",
    label: "Categories",
    icon: Folder,
    description: "Catalogue groups",
  },
  {
    id: "transport",
    label: "Transport",
    icon: Truck,
    description: "Delivery providers",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

const tabIds = new Set<TabId>(tabs.map((tab) => tab.id));

export default function AdminCataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab: TabId = tabIds.has(requested as TabId)
    ? (requested as TabId)
    : "equipment";

  const site = useSite();
  const currency = site.data?.currency ?? "KES";
  const equipment = useAdminEquipment();
  const packages = useAdminPackages();
  const offers = useAdminOffers();
  const categories = useAdminCategories();
  const transport = useTransportProviders();

  const counts: Record<TabId, number | null> = {
    equipment: equipment.data?.total ?? (equipment.isPending ? null : 0),
    packages: packages.data?.length ?? (packages.isPending ? null : 0),
    offers: offers.data?.length ?? (offers.isPending ? null : 0),
    categories:
      categories.data?.reduce(
        (total, category) => total + 1 + (category.children?.length ?? 0),
        0,
      ) ?? (categories.isPending ? null : 0),
    transport: transport.data?.length ?? (transport.isPending ? null : 0),
  };

  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  function selectTab(tab: TabId) {
    setSearchParams(tab === "equipment" ? {} : { tab }, { replace: true });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-50 via-white to-blush-50 p-6 ring-1 ring-blush-100 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-blush-200/60 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Catalogue control
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              The public catalogue, without a rebuild.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Add equipment, build packages, publish offers and keep delivery
              providers reachable. Saving a change refreshes the public catalogue.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 bg-white">
            <a href="/equipment" target="_blank" rel="noreferrer">
              View public catalogue
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>

        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Equipment", value: counts.equipment },
            { label: "Packages", value: counts.packages },
            { label: "Offers", value: counts.offers },
            { label: "Providers", value: counts.transport },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-white"
            >
              <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold text-slate-900">
                {item.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div
          role="tablist"
          aria-label="Catalogue sections"
          className="flex gap-1 overflow-x-auto"
        >
          {tabs.map(({ id, label, icon: Icon, description }) => {
            const selected = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`catalogue-tab-${id}`}
                aria-selected={selected}
                aria-controls={`catalogue-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  selected
                    ? "bg-brand-50 text-brand-900 ring-1 ring-brand-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-4", selected ? "text-brand-700" : "text-slate-400")}
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {label}
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {counts[id] ?? "…"}
                    </Badge>
                  </span>
                  <span className="hidden text-xs text-slate-500 sm:block">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`catalogue-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`catalogue-tab-${activeTab}`}
        tabIndex={0}
        className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:p-6"
      >
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {active.label} · {active.description}
        </p>
        {activeTab === "equipment" ? <EquipmentPanel currency={currency} /> : null}
        {activeTab === "packages" ? <PackagesPanel currency={currency} /> : null}
        {activeTab === "offers" ? <OffersPanel currency={currency} /> : null}
        {activeTab === "categories" ? <CategoriesPanel /> : null}
        {activeTab === "transport" ? <TransportProvidersPanel /> : null}
      </div>

      <p className="text-center text-xs text-slate-500">
        Need to update the public site text?{" "}
        <Link to="/admin/settings" className="font-medium text-brand-700 hover:underline">
          Account settings
        </Link>{" "}
        covers sign-in and password changes.
      </p>
    </div>
  );
}
