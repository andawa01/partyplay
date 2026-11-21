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

/** One equipment item and the units one complete selection consumes. */
export interface EquipmentDemand {
  equipmentId: string;
  name: string;
  requiredUnits: number;
}

/**
 * A selection is only available on a day when every included item is. Combine each item's
 * month calendar into the number of complete selections that fit on that day.
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
      return Math.floor(units / demand.requiredUnits);
    });
    return {
      date: day.date,
      available: Math.max(0, Math.min(...availablePackages)),
    };
  });
}
