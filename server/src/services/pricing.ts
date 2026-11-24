import { badRequest } from "../lib/api-error";
import { rentalDays as inclusiveRentalDays } from "../lib/dates";

/**
 * Pure pricing arithmetic (F6a). No database, no HTTP: the caller supplies the rows it
 * already read and the module only decides what to charge. Booking creation snapshots
 * these numbers, so a later catalogue edit can never change an agreed total.
 */

/**
 * Rental days are inclusive, so 20–22 Oct is 3 days. Implemented once in `lib/dates` to
 * keep one definition of "inclusive" for pricing, availability and the client preview.
 */
export const rentalDays = inclusiveRentalDays;

/** D3: equipment is either charged per rental day, or once per unit for the whole hire. */
export type PricingMode = "PER_DAY" | "FLAT";

/** The pricing fields of an `Equipment` row, as plain numbers in major currency units. */
export type PricedEquipment = {
  id: string;
  name: string;
  pricingMode: PricingMode;
  pricePerDay: number | null;
  flatPrice: number | null;
};

export type EquipmentLineInput = {
  equipment: PricedEquipment;
  quantity: number;
  days: number;
};

export type EquipmentPrice = {
  /** Price of one unit for the whole rental period: `pricePerDay × days`, or `flatPrice`. */
  unitPrice: number;
  /** `unitPrice × quantity` — what this line contributes to the subtotal. */
  priceForPeriod: number;
};

export type PackageSelection = { packageId: string; quantity: number };

export type PricedPackageItem = {
  equipmentId: string;
  equipmentName: string;
  /** Units of this equipment included in one package. */
  quantity: number;
};

export type PricedPackage = {
  id: string;
  name: string;
  price: number;
  items: PricedPackageItem[];
};

/** `BookingPackageItem`-shaped snapshot lines plus the `PackageBooking` snapshot fields. */
export type PackageLine = {
  packageId: string;
  packageName: string;
  packagePrice: number;
  quantity: number;
  lineTotal: number;
  items: Array<{ equipmentId: string; equipmentName: string; quantity: number }>;
};

export type BookingEquipmentSelection = { equipment: PricedEquipment; quantity: number };

export type BookingPriceInput = {
  days: number;
  equipment?: BookingEquipmentSelection[];
  packages?: PackageSelection[];
  /** Every package that may be selected, so the caller keeps one database read. */
  packageCatalogue: PricedPackage[];
  discountAmount?: number;
  transportCharge?: number;
};

export type BookingItemLine = {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  days: number;
  unitPrice: number;
  priceForPeriod: number;
};

export type BookingPrice = {
  items: BookingItemLine[];
  packages: PackageLine[];
  subtotal: number;
  discountAmount: number;
  transportCharge: number;
  totalAmount: number;
};

// ---------------------------------------------------------------------------
// Money: arithmetic happens in integer cents. Decimal(10,2) has at most two
// decimals, so cents are exact where float multiplication is not (199.99 × 3).
// ---------------------------------------------------------------------------

const CENTS_PER_UNIT = 100;

function toCents(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw badRequest(`${label} must be a non-negative amount`, { value });
  }
  return Math.round(value * CENTS_PER_UNIT);
}

function fromCents(cents: number): number {
  return Number((cents / CENTS_PER_UNIT).toFixed(2));
}

function assertQuantity(quantity: number, label: string): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw badRequest(`${label} must be a whole number of at least 1`, { quantity });
  }
}

function assertDays(days: number): void {
  if (!Number.isInteger(days) || days < 1) {
    throw badRequest("days must be a whole number of at least 1", { days });
  }
}

/** Price of one unit and of the whole line, in cents, applying D3. */
function equipmentLineCents(
  equipment: PricedEquipment,
  quantity: number,
  days: number,
): { unitCents: number; totalCents: number } {
  const unitCents =
    equipment.pricingMode === "FLAT"
      ? toCents(
          requirePrice(equipment.flatPrice, equipment, "flatPrice"),
          `Equipment "${equipment.name}" flatPrice`,
        )
      : toCents(
          requirePrice(equipment.pricePerDay, equipment, "pricePerDay"),
          `Equipment "${equipment.name}" pricePerDay`,
        ) * days;

  return { unitCents, totalCents: unitCents * quantity };
}

function requirePrice(
  value: number | null,
  equipment: PricedEquipment,
  field: "pricePerDay" | "flatPrice",
): number {
  if (value === null) {
    throw badRequest(
      `Equipment "${equipment.name}" has no ${field} for pricing mode ${equipment.pricingMode}`,
      { equipmentId: equipment.id, pricingMode: equipment.pricingMode },
    );
  }
  return value;
}

/**
 * PER_DAY: `pricePerDay × days × quantity`. FLAT: `flatPrice × quantity`, ignoring days
 * (a bouncy castle delivered for three days still costs one flat hire).
 */
export function priceEquipmentLine({
  equipment,
  quantity,
  days,
}: EquipmentLineInput): EquipmentPrice {
  assertQuantity(quantity, "quantity");
  assertDays(days);

  const { unitCents, totalCents } = equipmentLineCents(equipment, quantity, days);
  return { unitPrice: fromCents(unitCents), priceForPeriod: fromCents(totalCents) };
}

/**
 * Turns package selections into booking snapshot lines (Rule A). Each included item's
 * quantity is multiplied by the number of packages, so two "Silver Combo"s demand two
 * of everything the combo contains.
 */
export function expandPackages(
  selections: PackageSelection[],
  packages: PricedPackage[],
): PackageLine[] {
  const seen = new Set<string>();
  const duplicatePackageIds: string[] = [];

  for (const selection of selections) {
    assertQuantity(selection.quantity, "package quantity");
    if (seen.has(selection.packageId)) {
      duplicatePackageIds.push(selection.packageId);
    }
    seen.add(selection.packageId);
  }

  if (duplicatePackageIds.length > 0) {
    throw badRequest("Each package may appear only once; increase its quantity instead", {
      duplicatePackageIds,
    });
  }

  const byId = new Map(packages.map((entry) => [entry.id, entry]));
  const missingPackageIds = selections
    .map((selection) => selection.packageId)
    .filter((packageId) => !byId.has(packageId));

  if (missingPackageIds.length > 0) {
    throw badRequest("Some packages were not found", { missingPackageIds });
  }

  return selections.map((selection) => {
    // Validation above guarantees the package exists.
    const pkg = byId.get(selection.packageId) as PricedPackage;
    const packageCents = toCents(pkg.price, `Package "${pkg.name}" price`);

    return {
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: fromCents(packageCents),
      quantity: selection.quantity,
      lineTotal: fromCents(packageCents * selection.quantity),
      items: pkg.items.map((item) => ({
        equipmentId: item.equipmentId,
        equipmentName: item.equipmentName,
        quantity: item.quantity * selection.quantity,
      })),
    };
  });
}

/**
 * Rule B: units already covered by a package are free, only the excess is charged.
 * Demand is the larger of "requested" and "included" (see the F6b expansion), so this
 * never goes negative.
 */
export function netChargeableUnits(requested: number, included: number): number {
  return Math.max(0, requested - included);
}

/**
 * Prices a whole booking. Equipment that is fully covered by the selected packages
 * produces no line at all, so a zero-value `BookingItem` is never stored.
 *
 * Discounts are an explicit owner adjustment (D6), not engine output, and are clamped to
 * the subtotal: a booking can never go negative because of one.
 */
export function priceBooking(input: BookingPriceInput): BookingPrice {
  assertDays(input.days);

  const packageLines = expandPackages(input.packages ?? [], input.packageCatalogue);

  const includedPerEquipment = new Map<string, number>();
  for (const line of packageLines) {
    for (const item of line.items) {
      includedPerEquipment.set(
        item.equipmentId,
        (includedPerEquipment.get(item.equipmentId) ?? 0) + item.quantity,
      );
    }
  }

  const seenEquipment = new Set<string>();
  const duplicateEquipmentIds: string[] = [];
  for (const selection of input.equipment ?? []) {
    if (seenEquipment.has(selection.equipment.id)) {
      duplicateEquipmentIds.push(selection.equipment.id);
    }
    seenEquipment.add(selection.equipment.id);
  }

  if (duplicateEquipmentIds.length > 0) {
    throw badRequest("Each equipment item may appear only once; increase its quantity instead", {
      duplicateEquipmentIds,
    });
  }

  const items: BookingItemLine[] = [];
  let subtotalCents = packageLines.reduce(
    (sum, line) => sum + toCents(line.lineTotal, `Package "${line.packageName}" total`),
    0,
  );

  for (const selection of input.equipment ?? []) {
    assertQuantity(selection.quantity, "equipment quantity");

    const chargeable = netChargeableUnits(
      selection.quantity,
      includedPerEquipment.get(selection.equipment.id) ?? 0,
    );
    if (chargeable === 0) {
      continue;
    }

    const { unitCents, totalCents } = equipmentLineCents(
      selection.equipment,
      chargeable,
      input.days,
    );
    items.push({
      equipmentId: selection.equipment.id,
      equipmentName: selection.equipment.name,
      quantity: chargeable,
      days: input.days,
      unitPrice: fromCents(unitCents),
      priceForPeriod: fromCents(totalCents),
    });
    subtotalCents += totalCents;
  }

  const requestedDiscount = toCents(input.discountAmount ?? 0, "discountAmount");
  const discountCents = Math.min(requestedDiscount, subtotalCents);
  const transportCents = toCents(input.transportCharge ?? 0, "transportCharge");
  const totalCents = subtotalCents - discountCents + transportCents;

  return {
    items,
    packages: packageLines,
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    transportCharge: fromCents(transportCents),
    totalAmount: fromCents(totalCents),
  };
}
