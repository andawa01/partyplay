import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type { AdminDashboard } from "../lib/dashboard";
import { queryKeys } from "../lib/query-keys";

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: async () => (await apiFetch<AdminDashboard>("/api/admin/dashboard")).data,
    staleTime: 15_000,
  });
}
