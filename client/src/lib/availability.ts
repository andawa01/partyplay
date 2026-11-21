/**
 * Shapes returned by the public availability endpoints. Dates are calendar strings and
 * quantities are integers; the client never turns either into a local `Date`.
 */

export interface CalendarDay {
  date: string;
  available: number;
}

export interface CalendarMeta {
  equipmentId: string;
  name: string;
  total: number;
  month: string;
}

export interface AvailabilityRow {
  equipmentId: string;
  name: string;
  total: number;
  reserved: number;
  available: number;
}

export interface AvailabilityMeta {
  startDate: string;
  endDate: string;
  note?: string;
}

export interface PackageAvailabilityItem {
  equipmentId: string;
  name: string;
  total: number;
  reserved: number;
  available: number;
  quantityPerPackage: number;
  required: number;
  shortfall: number;
}

export interface PackageAvailabilityResponse {
  package: {
    id: string;
    slug: string;
    name: string;
    price: string;
  };
  startDate: string;
  endDate: string;
  requestedQuantity: number;
  minAvailable: number;
  bookable: boolean;
  items: PackageAvailabilityItem[];
}

/** One included item and how many units one package consumes. */
export interface EquipmentDemand {
  equipmentId: string;
  name: string;
  quantityPerPackage: number;
}

export type AvailabilityTarget =
  | {
      kind: "equipment";
      slug: string;
      id: string;
      name: string;
      imageUrl: string | null;
    }
  | {
      kind: "package";
      slug: string;
      name: string;
      imageUrl: string | null;
      /** Equipment id to per-package quantity for the package month grid. */
      demands: EquipmentDemand[];
      packageDuration: number | null;
    };

/**
 * A package is only available on a day when every included item is. Combine each item's
 * month calendar into the number of whole packages that fit on that day.
 */
export function combineCalendars(
  calendars: CalendarDay[][],
  demands: EquipmentDemand[],
): CalendarDay[] {
  if (calendars.length === 0 || calendars.length !== demands.length) {
    return [];
  }
  const availabilityByEquipment = calendars.map(
    (days) => new Map(days.map((day) => [day.date, day.available])),
  );

  return calendars[0].map((day) => {
    const availablePackages = demands.map((demand, index) => {
      const units = availabilityByEquipment[index].get(day.date) ?? 0;
      return Math.floor(units / demand.quantityPerPackage);
    });
    return {
      date: day.date,
      available: Math.max(0, Math.min(...availablePackages)),
    };
  });
}

export function isDayUnavailable(day: CalendarDay | undefined): boolean {
  return day !== undefined && day.available <= 0;
}
