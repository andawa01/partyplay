import { useQueries, useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  AvailabilityMeta,
  AvailabilityRow,
  CalendarDay,
  CalendarMeta,
  EquipmentDemand,
  PackageAvailabilityResponse,
} from "../lib/availability";
import { combineCalendars } from "../lib/availability";
import { queryKeys } from "../lib/query-keys";

function calendarPath(equipmentId: string, month: string): string {
  const search = new URLSearchParams({ equipmentId, month });
  return `/api/calendar?${search.toString()}`;
}

/**
 * Month availability for one or more equipment items. A package passes every included item
 * and gets back the number of whole packages that fit on each day; a single item is simply
 * its remaining unit count.
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

/** Range check for a single equipment item. */
export function useEquipmentAvailability(
  equipmentId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: queryKeys.availability([equipmentId], startDate, endDate),
    queryFn: async () => {
      const search = new URLSearchParams({
        equipmentIds: equipmentId,
        startDate,
        endDate,
      });
      const result = await apiFetch<AvailabilityRow[], AvailabilityMeta>(
        `/api/availability?${search.toString()}`,
      );
      return { rows: result.data, meta: result.meta };
    },
    enabled: equipmentId !== "" && startDate !== "" && endDate !== "",
    retry: false,
  });
}

/**
 * Range check for a package at quantity one. C6 owns quantity selection; this slice only
 * answers whether the dates work for a single package.
 */
export function usePackageAvailability(
  slug: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: queryKeys.packageAvailability(slug, startDate, endDate, 1),
    queryFn: async () => {
      const search = new URLSearchParams({
        startDate,
        endDate,
        quantity: "1",
      });
      return (
        await apiFetch<PackageAvailabilityResponse>(
          `/api/packages/${encodeURIComponent(slug)}/availability?${search.toString()}`,
        )
      ).data;
    },
    enabled: slug !== "" && startDate !== "" && endDate !== "",
    retry: false,
  });
}
