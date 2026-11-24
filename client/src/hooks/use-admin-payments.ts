import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../lib/api";
import type {
  BookingPaymentSummary,
  PaymentDeleteResult,
  PaymentEditFormValues,
  PaymentMutationResult,
  PaymentsMeta,
  PaymentRow,
  PaymentWriteInput,
  RefundWriteInput,
} from "../lib/admin-payments";
import { paymentEditPayload } from "../lib/admin-payments";
import type { AdminBookingDetail } from "../lib/admin-bookings";
import { queryKeys } from "../lib/query-keys";

function applyPaymentSummary(queryClient: QueryClient, summary: BookingPaymentSummary): void {
  queryClient.setQueryData<AdminBookingDetail>(queryKeys.admin.booking(summary.id), (current) =>
    current
      ? {
          ...current,
          paidAmount: summary.paidAmount,
          paymentStatus: summary.paymentStatus,
          totals: {
            ...current.totals,
            paidAmount: summary.paidAmount,
            amountDue: summary.amountDue,
            overpaidBy: summary.overpaidBy,
          },
        }
      : current,
  );
}

function refreshAfterPayment(queryClient: QueryClient, bookingId: string): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.payments(bookingId) }),
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "booking-counts"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
  ]);
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.admin.payments(bookingId),
    queryFn: async () => {
      const result = await apiFetch<PaymentRow[], PaymentsMeta>(
        `/api/admin/bookings/${bookingId}/payments`,
      );
      return {
        items: result.data,
        meta: result.meta,
      };
    },
    enabled: bookingId !== "",
    staleTime: 15_000,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, input }: { bookingId: string; input: PaymentWriteInput }) =>
      (
        await apiFetch<PaymentMutationResult>(`/api/admin/bookings/${bookingId}/payments`, {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    onSuccess: (result) => {
      applyPaymentSummary(queryClient, result.booking);
      return refreshAfterPayment(queryClient, result.booking.id);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, input }: { paymentId: string; input: PaymentEditFormValues }) =>
      (
        await apiFetch<PaymentMutationResult>(`/api/admin/payments/${paymentId}`, {
          method: "PATCH",
          body: JSON.stringify(paymentEditPayload(input)),
        })
      ).data,
    onSuccess: (result) => {
      applyPaymentSummary(queryClient, result.booking);
      return refreshAfterPayment(queryClient, result.booking.id);
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, input }: { paymentId: string; input: RefundWriteInput }) =>
      (
        await apiFetch<PaymentMutationResult>(`/api/admin/payments/${paymentId}/refunds`, {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,
    onSuccess: (result) => {
      applyPaymentSummary(queryClient, result.booking);
      return refreshAfterPayment(queryClient, result.booking.id);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) =>
      (
        await apiFetch<PaymentDeleteResult>(`/api/admin/payments/${paymentId}`, {
          method: "DELETE",
        })
      ).data,
    onSuccess: (result) => {
      applyPaymentSummary(queryClient, result.booking);
      return refreshAfterPayment(queryClient, result.booking.id);
    },
  });
}
