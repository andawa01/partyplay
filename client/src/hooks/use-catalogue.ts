import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  CategoryOption,
  EquipmentDetail,
  EquipmentListParams,
  EquipmentSummary,
} from "../lib/catalogue";
import { equipmentListPath } from "../lib/catalogue";
import { queryKeys } from "../lib/query-keys";

/**
 * Filters are part of the query key, so a category, search term or page is a distinct cache
 * entry. Previous page results are kept on screen while the next page loads to avoid a
 * layout jump.
 */
export function useEquipmentList(
  params: EquipmentListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.equipment({
      category: params.category,
      q: params.q,
      page: params.page,
      pageSize: params.pageSize,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    queryFn: async () => {
      const result = await apiFetch<EquipmentSummary[]>(equipmentListPath(params));
      return {
        items: result.data,
        total: result.meta?.total ?? result.data.length,
        page: result.meta?.page ?? params.page,
        pageSize: result.meta?.pageSize ?? params.pageSize ?? 12,
      };
    },
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  });
}

export function useEquipmentDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.equipmentDetail(slug),
    queryFn: async () => (await apiFetch<EquipmentDetail>(`/api/equipment/${slug}`)).data,
    enabled: slug !== "",
    retry: false,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => (await apiFetch<CategoryOption[]>("/api/categories")).data,
    staleTime: 5 * 60 * 1000,
  });
}
