import { describe, expect, it } from "vitest";

import { ApiError } from "../lib/api-error";
import {
  expandPackages,
  netChargeableUnits,
  priceBooking,
  priceEquipmentLine,
  rentalDays,
  type PricedEquipment,
  type PricedPackage,
} from "./pricing";

// 20–22 October 2026 is three inclusive rental days.
const START = new Date(Date.UTC(2026, 9, 20));
const END = new Date(Date.UTC(2026, 9, 22));
const DAYS = 3;

const castle: PricedEquipment = {
  id: "eq-castle",
  name: "Combo Castle",
  pricingMode: "PER_DAY",
  pricePerDay: 1200,
  flatPrice: 9000,
};

const speaker: PricedEquipment = {
  id: "eq-speaker",
  name: "Party Speaker Pair",
  pricingMode: "FLAT",
  pricePerDay: 500,
  flatPrice: 2500,
};

const silverCombo: PricedPackage = {
  id: "pkg-silver",
  name: "Silver Combo",
  price: 14500,
  items: [{ equipmentId: castle.id, equipmentName: castle.name, quantity: 1 }],
};

function expectBadRequest(run: () => unknown): ApiError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    return error as ApiError;
  }
  throw new Error("expected a BAD_REQUEST error, but the call returned normally");
}

describe("rentalDays", () => {
  it("counts inclusively: 20–22 October is 3 days", () => {
    expect(rentalDays(START, END)).toBe(3);
  });

  it("counts a same-day hire as one day", () => {
    expect(rentalDays(START, START)).toBe(1);
  });

  it("rejects an inverted range", () => {
    expectBadRequest(() => rentalDays(END, START));
  });
});

describe("priceEquipmentLine", () => {
  it("charges per day × days × quantity for PER_DAY", () => {
    expect(priceEquipmentLine({ equipment: castle, quantity: 2, days: DAYS })).toEqual({
      unitPrice: 3600,
      priceForPeriod: 7200,
    });
  });

  it("ignores the number of days for FLAT equipment", () => {
    expect(priceEquipmentLine({ equipment: speaker, quantity: 2, days: 5 })).toEqual({
      unitPrice: 2500,
      priceForPeriod: 5000,
    });
  });

  it("keeps two-decimal money exact instead of drifting in floats", () => {
    const cheap: PricedEquipment = { ...castle, pricePerDay: 199.99 };
    // 199.99 × 3 is 599.9699999999999 in IEEE 754; cents arithmetic must not show it.
    expect(priceEquipmentLine({ equipment: cheap, quantity: 1, days: DAYS })).toEqual({
      unitPrice: 599.97,
      priceForPeriod: 599.97,
    });
    expect(priceEquipmentLine({ equipment: cheap, quantity: 3, days: DAYS }).priceForPeriod).toBe(1799.91);
  });

  it("prices a fractional daily rate without losing a cent", () => {
    const cheap: PricedEquipment = { ...castle, pricePerDay: 33.33 };
    expect(priceEquipmentLine({ equipment: cheap, quantity: 3, days: 3 }).priceForPeriod).toBe(299.97);
  });

  it("refuses an item with no price for its mode instead of silently charging zero", () => {
    const error = expectBadRequest(() =>
      priceEquipmentLine({ equipment: { ...castle, pricePerDay: null }, quantity: 1, days: DAYS }),
    );
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.details).toEqual({ equipmentId: castle.id, pricingMode: "PER_DAY" });
  });

  it("rejects a zero or fractional quantity", () => {
    expectBadRequest(() => priceEquipmentLine({ equipment: castle, quantity: 0, days: DAYS }));
    expectBadRequest(() => priceEquipmentLine({ equipment: castle, quantity: 1.5, days: DAYS }));
  });

  it("rejects a zero or fractional day count", () => {
    expectBadRequest(() => priceEquipmentLine({ equipment: castle, quantity: 1, days: 0 }));
    expectBadRequest(() => priceEquipmentLine({ equipment: castle, quantity: 1, days: 1.5 }));
  });
});

describe("expandPackages", () => {
  it("multiplies the included equipment by the number of packages", () => {
    const [line] = expandPackages([{ packageId: silverCombo.id, quantity: 2 }], [silverCombo]);

    expect(line.packageName).toBe("Silver Combo");
    expect(line.packagePrice).toBe(14500);
    expect(line.quantity).toBe(2);
    expect(line.lineTotal).toBe(29000);
    // Two packages of a package that includes one castle = two castles demanded.
    expect(line.items).toEqual([
      { equipmentId: castle.id, equipmentName: "Combo Castle", quantity: 2 },
    ]);
  });

  it("returns nothing when no packages are selected", () => {
    expect(expandPackages([], [silverCombo])).toEqual([]);
  });

  it("rejects a package id that is not in the catalogue", () => {
    const error = expectBadRequest(() =>
      expandPackages([{ packageId: "pkg-ghost", quantity: 1 }], [silverCombo]),
    );
    expect(error.details).toEqual({ missingPackageIds: ["pkg-ghost"] });
  });

  it("rejects the same package twice rather than merging silently", () => {
    const error = expectBadRequest(() =>
      expandPackages(
        [
          { packageId: silverCombo.id, quantity: 1 },
          { packageId: silverCombo.id, quantity: 2 },
        ],
        [silverCombo],
      ),
    );
    expect(error.details).toEqual({ duplicatePackageIds: [silverCombo.id] });
  });

  it("rejects a package quantity below one", () => {
    expectBadRequest(() => expandPackages([{ packageId: silverCombo.id, quantity: 0 }], [silverCombo]));
  });
});

describe("netChargeableUnits", () => {
  it("charges nothing for units already included in a package", () => {
    expect(netChargeableUnits(1, 2)).toBe(0);
  });

  it("charges only the excess beyond the included units", () => {
    expect(netChargeableUnits(3, 2)).toBe(1);
  });

  it("charges everything when no package includes the item", () => {
    expect(netChargeableUnits(4, 0)).toBe(4);
  });
});

describe("priceBooking", () => {
  it("prices two packages and charges nothing for the castle they already include", () => {
    const price = priceBooking({
      days: DAYS,
      packages: [{ packageId: silverCombo.id, quantity: 2 }],
      equipment: [{ equipment: castle, quantity: 1 }],
      packageCatalogue: [silverCombo],
    });

    // One requested castle next to two included ones: 0 chargeable, 2 units of demand.
    const includedDemand = 2;
    expect(netChargeableUnits(1, includedDemand)).toBe(0);
    expect(price.items).toEqual([]);
    expect(price.packages[0].items[0].quantity).toBe(2);
    expect(price.subtotal).toBe(29000);
    expect(price.discountAmount).toBe(0);
    expect(price.transportCharge).toBe(0);
    expect(price.totalAmount).toBe(29000);
  });

  it("charges the units beyond the package at the individual rate", () => {
    const price = priceBooking({
      days: DAYS,
      packages: [{ packageId: silverCombo.id, quantity: 2 }],
      equipment: [{ equipment: castle, quantity: 3 }],
      packageCatalogue: [silverCombo],
    });

    expect(price.items).toEqual([
      {
        equipmentId: castle.id,
        equipmentName: "Combo Castle",
        quantity: 1,
        days: 3,
        unitPrice: 3600,
        priceForPeriod: 3600,
      },
    ]);
    expect(price.subtotal).toBe(29000 + 3600);
    expect(price.totalAmount).toBe(32600);
  });

  it("mixes PER_DAY and FLAT equipment lines", () => {
    const price = priceBooking({
      days: DAYS,
      equipment: [
        { equipment: castle, quantity: 2 },
        { equipment: speaker, quantity: 1 },
      ],
      packageCatalogue: [],
    });

    expect(price.items.map((line) => line.priceForPeriod)).toEqual([7200, 2500]);
    expect(price.subtotal).toBe(9700);
    expect(price.totalAmount).toBe(9700);
  });

  it("clamps a discount to the subtotal so a booking never goes negative", () => {
    const price = priceBooking({
      days: DAYS,
      equipment: [{ equipment: castle, quantity: 1 }],
      packageCatalogue: [],
      discountAmount: 999999,
    });

    expect(price.subtotal).toBe(3600);
    expect(price.discountAmount).toBe(3600);
    expect(price.totalAmount).toBe(0);
  });

  it("adds transport after the discount", () => {
    const price = priceBooking({
      days: DAYS,
      equipment: [{ equipment: castle, quantity: 1 }],
      packageCatalogue: [],
      discountAmount: 600,
      transportCharge: 500,
    });

    expect(price.subtotal).toBe(3600);
    expect(price.discountAmount).toBe(600);
    expect(price.transportCharge).toBe(500);
    expect(price.totalAmount).toBe(3500);
  });

  it("rejects a negative discount or transport rather than quietly changing the money", () => {
    expectBadRequest(() =>
      priceBooking({
        days: DAYS,
        equipment: [{ equipment: castle, quantity: 1 }],
        packageCatalogue: [],
        discountAmount: -1000,
      }),
    );
    expectBadRequest(() =>
      priceBooking({
        days: DAYS,
        equipment: [{ equipment: castle, quantity: 1 }],
        packageCatalogue: [],
        transportCharge: -500,
      }),
    );
  });

  it("returns zeros for an empty booking (F6b rejects it before pricing)", () => {
    expect(priceBooking({ days: DAYS, packageCatalogue: [] })).toEqual({
      items: [],
      packages: [],
      subtotal: 0,
      discountAmount: 0,
      transportCharge: 0,
      totalAmount: 0,
    });
  });

  it("rounds discounted totals to two decimals", () => {
    const cheap: PricedEquipment = { ...castle, pricePerDay: 99.99 };
    const price = priceBooking({
      days: 2,
      equipment: [{ equipment: cheap, quantity: 1 }],
      packageCatalogue: [],
      discountAmount: 33.33,
      transportCharge: 12.5,
    });

    expect(price.subtotal).toBe(199.98);
    expect(price.totalAmount).toBe(179.15);
  });

  it("rejects the same equipment line twice", () => {
    const error = expectBadRequest(() =>
      priceBooking({
        days: DAYS,
        equipment: [
          { equipment: castle, quantity: 1 },
          { equipment: castle, quantity: 2 },
        ],
        packageCatalogue: [],
      }),
    );
    expect(error.details).toEqual({ duplicateEquipmentIds: [castle.id] });
  });

  it("rejects an unknown package before doing any arithmetic", () => {
    expectBadRequest(() =>
      priceBooking({
        days: DAYS,
        packages: [{ packageId: "pkg-ghost", quantity: 1 }],
        packageCatalogue: [silverCombo],
      }),
    );
  });

});
