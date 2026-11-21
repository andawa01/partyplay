import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import type { SiteSettings } from "../lib/site";

/**
 * Site settings change rarely, so the shell shares one cached copy for five minutes.
 * Retry behaviour comes from the shared QueryClient: no retry on 4xx, one on 5xx.
 */
export function useSite() {
  return useQuery({
    queryKey: queryKeys.site(),
    queryFn: async () => (await apiFetch<SiteSettings>("/api/site")).data,
    staleTime: 5 * 60 * 1000,
  });
}
