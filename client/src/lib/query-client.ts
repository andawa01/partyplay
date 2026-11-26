import { MutationCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api";
import { toastError } from "./toast";

/**
 * Every mutation reports its failure through the shared toast, using the message the
 * backend returned. Components may still show inline detail; toastError marks the error
 * so the two paths never produce two toasts.
 */
const mutationCache = new MutationCache({
  onError: (error) => toastError(error),
});

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
