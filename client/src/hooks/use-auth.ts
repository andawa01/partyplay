import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  AdminUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "../lib/auth";
import { queryKeys } from "../lib/query-keys";

/**
 * `me` is the boot check for every guarded route. A 401 is an expected answer, not a
 * failure to retry, so the guard can send the operator to login immediately.
 */
export function useAdminSession() {
  return useQuery({
    queryKey: queryKeys.admin.me(),
    queryFn: async () => (await apiFetch<AdminUser>("/api/auth/me")).data,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) =>
      (
        await apiFetch<AdminUser>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    retry: false,
    onSuccess: (admin) => {
      // The login response is the new session; seed `me` so the guard does not refetch
      // and flash a redirect between the form and the dashboard.
      queryClient.setQueryData(queryKeys.admin.me(), admin);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiFetch<undefined>("/api/auth/logout", { method: "POST" });
    },
    retry: false,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      await apiFetch<undefined>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    retry: false,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) =>
      (
        await apiFetch<{ message: string }>("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    retry: false,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      await apiFetch<undefined>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    retry: false,
  });
}
