import { formatMoney } from "./money";

export type PricingMode = "PER_DAY" | "FLAT";

export interface EquipmentCategory {
  slug: string;
  name: string;
}

export interface EquipmentSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  note: string | null;
  pricePerDay: string | null;
  pricePerWeek: string | null;
  flatPrice: string | null;
  pricingMode: PricingMode;
  minQuantity: number;
  maxQuantity: number;
  /** Inventory count from the server; not a date-specific availability. */
  total: number;
  category: EquipmentCategory;
  /** Present only when the request supplied a start and end date. */
  available?: number;
}

export interface EquipmentDetail extends EquipmentSummary {
  category: EquipmentCategory & {
    parent: EquipmentCategory | null;
  };
}

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
}

export interface EquipmentListParams {
  category?: string;
  q?: string;
  page: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

export function equipmentListPath(params: EquipmentListParams): string {
  const search = new URLSearchParams();
  if (params.category) {
    search.set("category", params.category);
  }
  if (params.q) {
    search.set("q", params.q);
  }
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize ?? 12));
  if (params.startDate && params.endDate) {
    search.set("startDate", params.startDate);
    search.set("endDate", params.endDate);
  }
  return `/api/equipment?${search.toString()}`;
}

export interface PriceLabel {
  amount: string;
  unit: string | null;
}

/**
 * Prices are rendered straight from the decimal strings the API sent. A weekly rate is
 * shown as a secondary note rather than replacing the daily price.
 */
export function priceLabel(
  equipment: Pick<EquipmentSummary, "pricingMode" | "pricePerDay" | "pricePerWeek" | "flatPrice">,
  currency: string,
): PriceLabel {
  if (equipment.pricingMode === "FLAT") {
    if (equipment.flatPrice) {
      return { amount: formatMoney(equipment.flatPrice, currency), unit: "flat rate" };
    }
    if (equipment.pricePerDay) {
      return { amount: formatMoney(equipment.pricePerDay, currency), unit: "per day" };
    }
  } else {
    if (equipment.pricePerDay) {
      return { amount: formatMoney(equipment.pricePerDay, currency), unit: "per day" };
    }
    if (equipment.flatPrice) {
      return { amount: formatMoney(equipment.flatPrice, currency), unit: "flat rate" };
    }
  }
  return { amount: "Price on request", unit: null };
}

export function weeklyPriceLabel(
  equipment: Pick<EquipmentSummary, "pricingMode" | "pricePerWeek">,
  currency: string,
): string | null {
  if (equipment.pricingMode !== "PER_DAY" || !equipment.pricePerWeek) {
    return null;
  }
  return `${formatMoney(equipment.pricePerWeek, currency)} per week`;
}

export function stockLabel(total: number): {
  label: string;
  variant: "success" | "warning";
} {
  if (total <= 0) {
    return { label: "Unavailable", variant: "warning" };
  }
  return { label: total === 1 ? "1 unit in stock" : `${total} units in stock`, variant: "success" };
}
