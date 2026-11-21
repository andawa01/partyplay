import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type { Offer, PartyPackage } from "../lib/packages";
import { queryKeys } from "../lib/query-keys";

export function usePackages() {
  return useQuery({
    queryKey: queryKeys.packages(),
    queryFn: async () => (await apiFetch<PartyPackage[]>("/api/packages")).data,
    staleTime: 60_000,
  });
}

export function usePackageDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.packages(slug),
    queryFn: async () => (await apiFetch<PartyPackage>(`/api/packages/${slug}`)).data,
    enabled: slug !== "",
    retry: false,
  });
}

export function useOffers() {
  return useQuery({
    queryKey: queryKeys.offers(),
    queryFn: async () => (await apiFetch<Offer[]>("/api/offers")).data,
    staleTime: 60_000,
  });
}
