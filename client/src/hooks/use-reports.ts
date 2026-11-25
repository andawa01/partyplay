import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import type { AdminReport, ReportRange } from "../lib/reports";

export function useAdminReport(range: ReportRange) {
  return useQuery({
    queryKey: queryKeys.admin.reports(range),
    queryFn: async () => {
      const params = new URLSearchParams({ from: range.from, to: range.to });
      return (await apiFetch<AdminReport>(`/api/admin/reports?${params.toString()}`)).data;
    },
    enabled: Boolean(range.from && range.to),
    staleTime: 30_000,
  });
}
