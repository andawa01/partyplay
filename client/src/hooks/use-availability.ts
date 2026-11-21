import { useQueries, useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  AvailabilityMeta,
  AvailabilityRow,
  CalendarDay,
  CalendarMeta,
  EquipmentDemand,
} from "../lib/availability";
import { combineCalendars } from "../lib/availability";
import { queryKeys } from "../lib/query-keys";

function calendarPath(equipmentId: string, month: string): string {
  const search = new URLSearchParams({ equipmentId, month });
  return `/api/calendar?${search.toString()}`;
}

/**
 * Month availability for one or more equipment items. A selection passes every item it needs
 * and gets back the number of complete selections that fit on each day; a single item is
 * simply its remaining unit count.
 */
export function useCalendarForDemands(demands: EquipmentDemand[], month: string) {
  const results = useQueries({
    queries: demands.map((demand) => ({
      queryKey: queryKeys.calendar(demand.equipmentId, month),
      queryFn: async () =>
        (
          await apiFetch<CalendarDay[], CalendarMeta>(
            calendarPath(demand.equipmentId, month),
          )
        ).data,
      enabled: demand.equipmentId !== "",
      staleTime: 30_000,
      retry: false,
    })),
  });

  const isPending = results.some((result) => result.isPending);
  const failed = results.find((result) => result.isError);
  const hasEveryCalendar =
    !isPending && !failed && results.every((result) => result.data !== undefined);

  return {
    days: hasEveryCalendar
      ? combineCalendars(
          results.map((result) => result.data ?? []),
          demands,
        )
      : [],
    isPending,
    isFetching: results.some((result) => result.isFetching),
    isError: Boolean(failed),
    error: failed?.error,
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

/** Availability for every equipment item in the current booking selection. */
export function useSelectionAvailability(
  equipmentIds: string[],
  startDate: string,
  endDate: string,
) {
  const ids = [...new Set(equipmentIds)].sort();

  return useQuery({
    queryKey: queryKeys.availability(ids, startDate, endDate),
    queryFn: async () => {
      const search = new URLSearchParams({
        equipmentIds: ids.join(","),
        startDate,
        endDate,
      });
      const result = await apiFetch<AvailabilityRow[], AvailabilityMeta>(
        `/api/availability?${search.toString()}`,
      );
      return { rows: result.data, meta: result.meta };
    },
    enabled: ids.length > 0 && startDate !== "" && endDate !== "",
    retry: false,
  });
}
