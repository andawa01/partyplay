import { Boxes, Sparkles } from "lucide-react";

import type { EquipmentSummary } from "../../lib/catalogue";
import { priceLabel } from "../../lib/catalogue";
import type { PartyPackage } from "../../lib/packages";
import { packagePriceLabel } from "../../lib/packages";
import { PackageImage } from "../packages/PackageImage";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { QuantityStepper } from "./QuantityStepper";

export function BookingItemsStep({
  packages,
  equipment,
  selectedPackageId,
  packageQuantity,
  onPackageChange,
  onPackageQuantityChange,
  equipmentQuantities,
  onEquipmentQuantityChange,
  includedUnits,
  currency,
}: {
  packages: PartyPackage[];
  equipment: EquipmentSummary[];
  selectedPackageId: string;
  packageQuantity: number;
  onPackageChange: (packageId: string) => void;
  onPackageQuantityChange: (quantity: number) => void;
  equipmentQuantities: Record<string, number>;
  onEquipmentQuantityChange: (equipmentId: string, quantity: number) => void;
  includedUnits: Record<string, number>;
  currency: string;
}) {
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="booking-items-heading"
    >
      <StepHeading
        number={1}
        id="booking-items-heading"
        title="What are you booking?"
        description="Start with a package, then add anything else the day needs."
      />

      <div className="mt-6 space-y-6">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label
                htmlFor="booking-package"
                className="text-sm font-semibold text-slate-900"
              >
                Party package
              </label>
              <span className="text-xs text-slate-500">Optional — equipment works too</span>
            </div>
            <Select
              value={selectedPackageId === "" ? "none" : selectedPackageId}
              onValueChange={(value) => onPackageChange(value === "none" ? "" : value)}
            >
              <SelectTrigger id="booking-package" className="mt-2 h-11">
                <SelectValue placeholder="Choose a package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No package — just equipment</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {packagePriceLabel(pkg, currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPackage ? (
              <div className="mt-3 flex flex-col gap-4 rounded-xl border border-blush-100 bg-blush-50/60 p-3.5 sm:flex-row sm:items-center">
                <PackageImage
                  src={selectedPackage.imageUrl}
                  alt={selectedPackage.name}
                  className="h-20 w-full rounded-lg sm:w-24"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{selectedPackage.name}</p>
                    <Badge variant="outline" className="bg-white">
                      {selectedPackage.items.length} item
                      {selectedPackage.items.length === 1 ? "" : "s"} included
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {packagePriceLabel(selectedPackage, currency)} per package
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Taking more than one? The whole package repeats.
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="mb-1 text-xs font-medium text-slate-500">Packages</p>
                  <QuantityStepper
                    value={packageQuantity}
                    max={50}
                    label={selectedPackage.name}
                    onChange={onPackageQuantityChange}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Extra equipment</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Units already covered by your package are not charged twice.
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Boxes aria-hidden="true" className="size-3" />
                {equipment.length} items
              </Badge>
            </div>

            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {equipment.map((item) => {
                const quantity = equipmentQuantities[item.id] ?? 0;
                const included = includedUnits[item.id] ?? 0;
                const price = priceLabel(item, currency);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        {included > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles aria-hidden="true" className="size-3" />
                            {included} included
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.category.name} · {price.amount}
                        {price.unit ? ` ${price.unit}` : ""}
                      </p>
                    </div>

                    {quantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <QuantityStepper
                          value={quantity}
                          max={item.maxQuantity}
                          label={item.name}
                          onChange={(next) =>
                            onEquipmentQuantityChange(item.id, Math.min(next, item.maxQuantity))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEquipmentQuantityChange(item.id, 0)}
                          aria-label={`Remove ${item.name}`}
                          className="h-9 px-2 text-xs text-slate-500"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={item.maxQuantity < 1}
                        aria-label={`Add ${item.name}`}
                        onClick={() =>
                          onEquipmentQuantityChange(
                            item.id,
                            Math.min(Math.max(1, item.minQuantity), item.maxQuantity),
                          )
                        }
                      >
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {equipment.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                No individual equipment is listed right now. Packages are still available.
              </p>
            ) : null}
          </div>
      </div>
    </section>
  );
}

export function StepHeading({
  number,
  id,
  title,
  description,
}: {
  number: number;
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white"
      >
        {number}
      </span>
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
