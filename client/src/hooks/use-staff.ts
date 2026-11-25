import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import type { CreateStaffFormValues, StaffMember, StaffRole } from "../lib/team";

function refreshStaff(queryClient: QueryClient): Promise<unknown> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
}

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.admin.staff(),
    queryFn: async () => (await apiFetch<StaffMember[]>("/api/admin/users")).data,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffFormValues) =>
      (
        await apiFetch<StaffMember>("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    onSuccess: () => refreshStaff(queryClient),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; role?: StaffRole; isActive?: boolean };
    }) =>
      (
        await apiFetch<StaffMember>(`/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        })
      ).data,
    onSuccess: () => refreshStaff(queryClient),
  });
}

export function useSetStaffPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      await apiFetch<undefined>(`/api/admin/users/${id}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
    },
  });
}
