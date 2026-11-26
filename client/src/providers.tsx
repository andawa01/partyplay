import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

import { RouteProgress } from "./components/ui/route-progress";
import { Toaster } from "./components/ui/sonner";
import { queryClient } from "./lib/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouteProgress />
      {children}
      <Toaster />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen /> : null}
    </QueryClientProvider>
  );
}
