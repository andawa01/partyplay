import { useMutation, useQuery } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  BookingQuote,
  BookingQuoteRequest,
  CreateBookingRequest,
  CreatedBooking,
  PublicBooking,
} from "../lib/bookings";
import { queryKeys } from "../lib/query-keys";

/**
 * A quote is a POST because the selection is too structured for a readable query string,
 * but it is read-only. React Query still cancels stale estimates when the selection
 * changes, so the preview on screen always belongs to the latest quantities.
 */
export function useBookingQuote(request: BookingQuoteRequest | null) {
  return useQuery({
    queryKey: queryKeys.bookingQuote(
      request ?? { startDate: "", endDate: "", packages: [], equipment: [] },
    ),
    queryFn: async ({ signal }) =>
      (
        await apiFetch<BookingQuote>("/api/bookings/quote", {
          method: "POST",
          body: JSON.stringify(request),
          signal,
        })
      ).data,
    enabled: request !== null,
    retry: false,
    staleTime: 15_000,
  });
}

/**
 * Code lookup is an explicit action, not a background query: the code is the only
 * credential and the owner may change the status at any time, so every result comes from
 * a submit or the visible refresh button. No polling and no cached stale status.
 */
export function useBookingLookup() {
  return useMutation({
    mutationFn: async (code: string) =>
      (
        await apiFetch<PublicBooking>(`/api/bookings/${encodeURIComponent(code)}`)
      ).data,
    retry: false,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (request: CreateBookingRequest) =>
      (
        await apiFetch<CreatedBooking>("/api/bookings", {
          method: "POST",
          body: JSON.stringify(request),
        })
      ).data,
    // A create must never be retried automatically: a timeout may already have written.
    retry: false,
  });
}
