import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import { uploadCatalogueImage, type ImageUploadKind } from "../lib/image-upload";
import type {
  AdminCategory,
  AdminEquipment,
  AdminOffer,
  AdminPackage,
  CategoryWriteInput,
  EquipmentWriteInput,
  OfferWriteInput,
  PackageWriteInput,
  TransportProvider,
  TransportProviderWriteInput,
} from "../lib/admin-catalogue";
import { queryKeys } from "../lib/query-keys";

const adminEquipmentFilters = { page: 1, pageSize: 100 };

function refreshCatalogue(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "equipment"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "packages"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "offers"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "transport-providers"] }),
    queryClient.invalidateQueries({ queryKey: ["categories"] }),
    queryClient.invalidateQueries({ queryKey: ["equipment"] }),
    queryClient.invalidateQueries({ queryKey: ["packages"] }),
    queryClient.invalidateQueries({ queryKey: ["offers"] }),
  ]);
}

function withoutSlug<T extends { slug?: string }>(input: T): Omit<T, "slug"> {
  const { slug: _slug, ...rest } = input;
  return rest;
}

export function useAdminCategories() {
  return useQuery({
    queryKey: queryKeys.admin.categories(),
    queryFn: async () =>
      (await apiFetch<AdminCategory[]>("/api/categories")).data,
  });
}

export function useAdminEquipment() {
  return useQuery({
    queryKey: queryKeys.admin.equipment(adminEquipmentFilters),
    queryFn: async () => {
      const result = await apiFetch<AdminEquipment[]>(
        `/api/admin/equipment?page=${adminEquipmentFilters.page}&pageSize=${adminEquipmentFilters.pageSize}`,
      );
      return {
        items: result.data,
        total: result.meta?.total ?? result.data.length,
      };
    },
  });
}

export function useAdminPackages() {
  return useQuery({
    queryKey: queryKeys.admin.packages(),
    queryFn: async () => (await apiFetch<AdminPackage[]>("/api/admin/packages")).data,
  });
}

export function useAdminOffers() {
  return useQuery({
    queryKey: queryKeys.admin.offers(),
    queryFn: async () => (await apiFetch<AdminOffer[]>("/api/admin/offers")).data,
  });
}

export function useTransportProviders() {
  return useQuery({
    queryKey: queryKeys.admin.transportProviders(),
    queryFn: async () =>
      (await apiFetch<TransportProvider[]>("/api/admin/transport-providers")).data,
  });
}

export function useSaveEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: EquipmentWriteInput;
    }) => {
      const path = id ? `/api/admin/equipment/${id}` : "/api/admin/equipment";
      return (
        await apiFetch<AdminEquipment>(path, {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(id ? withoutSlug(input) : input),
        })
      ).data;
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useDeactivateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<undefined>(`/api/admin/equipment/${id}`, { method: "DELETE" });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useSetInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, total }: { id: string; total: number }) => {
      await apiFetch(`/api/admin/equipment/${id}/inventory`, {
        method: "PUT",
        body: JSON.stringify({ total }),
      });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useSavePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: PackageWriteInput;
    }) => {
      const { items, ...packageInput } = input;
      const path = id ? `/api/admin/packages/${id}` : "/api/admin/packages";
      const saved = (
        await apiFetch<AdminPackage>(path, {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(id ? withoutSlug(packageInput) : packageInput),
        })
      ).data;

      return (
        await apiFetch<AdminPackage>(`/api/admin/packages/${saved.id}/items`, {
          method: "PUT",
          body: JSON.stringify({ items }),
        })
      ).data;
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<undefined>(`/api/admin/packages/${id}`, { method: "DELETE" });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useSaveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: OfferWriteInput }) => {
      const path = id ? `/api/admin/offers/${id}` : "/api/admin/offers";
      return (
        await apiFetch<AdminOffer>(path, {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(id ? withoutSlug(input) : input),
        })
      ).data;
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<undefined>(`/api/admin/offers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: CategoryWriteInput }) => {
      const path = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
      return (
        await apiFetch<AdminCategory>(path, {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(id ? withoutSlug(input) : input),
        })
      ).data;
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<undefined>(`/api/admin/categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useSaveTransportProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: TransportProviderWriteInput;
    }) => {
      const path = id
        ? `/api/admin/transport-providers/${id}`
        : "/api/admin/transport-providers";
      return (
        await apiFetch<TransportProvider>(path, {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(input),
        })
      ).data;
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: ImageUploadKind }) =>
      uploadCatalogueImage(file, kind),
    retry: false,
  });
}

export function useDeleteTransportProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<undefined>(`/api/admin/transport-providers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => refreshCatalogue(queryClient),
  });
}
