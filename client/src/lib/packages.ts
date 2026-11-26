import { formatMoney, formatMoneyCompact } from "./money";

export interface PackageEquipment {
  slug: string;
  name: string;
}

export interface PackageItem {
  quantity: number;
  equipment: PackageEquipment;
}

export interface PartyPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  minQuantity: number;
  maxQuantity: number | null;
  duration: number | null;
  isFeatured: boolean;
  items: PackageItem[];
}

export type OfferAppliesTo =
  "ALL_BOOKINGS" | "ALL_EQUIPMENT" | "ALL_PACKAGES" | "ONE_EQUIPMENT" | "ONE_PACKAGE";

export interface Offer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  appliesTo: OfferAppliesTo;
  appliesToId: string | null;
  code: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

const momentFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Timestamps arrive as ISO strings; show the Nairobi calendar day the window closes. */
function formatMoment(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return momentFormat.format(date);
}

/** A package is priced per package, not per guest, so no guest-count language appears. */
export function packagePriceLabel(pkg: Pick<PartyPackage, "price">, currency: string): string {
  return formatMoneyCompact(pkg.price, currency);
}

export function packageDurationLabel(duration: number | null): string | null {
  if (!duration || duration < 1) {
    return null;
  }
  return duration === 1 ? "1 day" : `${duration} days`;
}

export function itemLabel(item: PackageItem): string {
  return item.quantity === 1 ? item.equipment.name : `${item.quantity} × ${item.equipment.name}`;
}

export function offerDiscountLabel(offer: Offer, currency: string): string {
  if (offer.discountType === "PERCENTAGE") {
    return `${Number(offer.discountValue)}% off`;
  }
  return `${formatMoney(offer.discountValue, currency)} off`;
}

export function offerValidityLabel(offer: Pick<Offer, "endsAt">): string {
  return offer.endsAt ? `Until ${formatMoment(offer.endsAt)}` : "Ongoing";
}

const appliesToLabels: Record<OfferAppliesTo, string> = {
  ALL_BOOKINGS: "All bookings",
  ALL_EQUIPMENT: "Equipment hire",
  ALL_PACKAGES: "Packages",
  ONE_EQUIPMENT: "One equipment item",
  ONE_PACKAGE: "One package",
};

export function offerAppliesToLabel(offer: Pick<Offer, "appliesTo">): string {
  return appliesToLabels[offer.appliesTo];
}
