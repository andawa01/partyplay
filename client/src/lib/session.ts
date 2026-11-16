import type { QueryClient } from "@tanstack/react-query";

import { queryClient } from "./query-client";

/**
 * Drop every cached query and mutation after a sign-out, so one operator's booking and
 * payment data can never be read from cache by the next person on the same browser.
 * Call it once the logout request has succeeded and before leaving the admin area.
 */
export function clearSession(client: QueryClient = queryClient): void {
  client.clear();
}
