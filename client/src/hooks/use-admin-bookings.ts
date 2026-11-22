import type { QueryClient } from "@tanstack/react-query";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  AdminBookingDetail,
  AdminBookingSummary,
  BookingActionTarget,
  BookingAvailabilityCheck,
  BookingListFilters,
} from "../lib/admin-bookings";
import {
  ADMIN_BOOKING_STATUSES,
  adminBookingsPath,
} from "../lib/admin-bookings";
import type { BookingStatus } from "../lib/bookings";
import { queryKeys } from "../lib/query-keys";

function invalidateBookingLists(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "booking-counts"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
  ]);
}

export function useAdminBookings(filters: BookingListFilters) {
  return useQuery({
    queryKey: queryKeys.admin.bookings(filters),
    queryFn: async () => {
      const result = await apiFetch<AdminBookingSummary[]>(
        adminBookingsPath(filters),
      );
      return {
        items: result.data,
        total: result.meta?.total ?? result.data.length,
        page: result.meta?.page ?? filters.page,
        pageSize: result.meta?.pageSize ?? filters.pageSize ?? 20,
      };
    },
    placeholderData: (previous) => previous,
  });
}

export function useAdminBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.booking(id),
    queryFn: async () =>
      (await apiFetch<AdminBookingDetail>(`/api/admin/bookings/${id}`)).data,
    enabled: id !== "",
    retry: false,
    staleTime: 15_000,
  });
}

export function useAdminBookingCounts(filters: {
  from?: string;
  to?: string;
  q?: string;
}) {
  const results = useQueries({
    queries: ADMIN_BOOKING_STATUSES.map((status) => ({
      queryKey: queryKeys.admin.bookingCounts({ ...filters, status }),
      queryFn: async () => {
        const result = await apiFetch<AdminBookingSummary[]>(
          adminBookingsPath({ ...filters, status, page: 1, pageSize: 1 }),
        );
        return result.meta?.total ?? result.data.length;
      },
      staleTime: 30_000,
    })),
  });

  const counts: Partial<Record<BookingStatus, number>> = {};
  ADMIN_BOOKING_STATUSES.forEach((status, index) => {
    const value = results[index]?.data;
    if (typeof value === "number") {
      counts[status] = value;
    }
  });

  const allLoaded = ADMIN_BOOKING_STATUSES.every(
    (status) => counts[status] !== undefined,
  );
  const total = allLoaded
    ? ADMIN_BOOKING_STATUSES.reduce(
        (sum, status) => sum + (counts[status] ?? 0),
        0,
      )
    : undefined;

  return {
    counts,
    total,
    isPending: results.some((result) => result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    error: results.find((result) => result.isError)?.error,
  };
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      note,
    }: {
      id: string;
      status: BookingActionTarget;
      reason?: string;
      note?: string;
    }) => {
      return (
        await apiFetch<AdminBookingDetail>(`/api/admin/bookings/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status,
            ...(reason ? { reason } : {}),
            ...(note ? { note } : {}),
          }),
        })
      ).data;
    },
    onSuccess: (booking) => {
      queryClient.setQueryData(queryKeys.admin.booking(booking.id), booking);
      return invalidateBookingLists(queryClient);
    },
  });
}

export function useUpdateTransportCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      transportCharge,
    }: {
      id: string;
      transportCharge: number;
    }) => {
      return (
        await apiFetch<
          AdminBookingDetail & { totalChanged: boolean; changedBy: string }
        >(`/api/admin/bookings/${id}/transport`, {
          method: "PATCH",
          body: JSON.stringify({ transportCharge }),
        })
      ).data;
    },
    onSuccess: (booking) => {
      const { totalChanged: _totalChanged, changedBy: _changedBy, ...detail } = booking;
      queryClient.setQueryData(queryKeys.admin.booking(booking.id), detail);
      return invalidateBookingLists(queryClient);
    },
  });
}

export function useCheckBookingAvailability() {
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiFetch<BookingAvailabilityCheck>(
          `/api/admin/bookings/${id}/availability`,
          { method: "POST" },
        )
      ).data,
    retry: false,
  });
}
