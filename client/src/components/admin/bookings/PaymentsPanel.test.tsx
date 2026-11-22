import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminBookingDetail } from "../../../lib/admin-bookings";
import type {
  BookingPaymentSummary,
  PaymentRow,
} from "../../../lib/admin-payments";
import { PaymentsPanel } from "./PaymentsPanel";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderWithClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

const booking: AdminBookingDetail = {
  id: "booking-1",
  code: "PP-TEST01",
  status: "PENDING",
  customer: {
    id: "customer-1",
    name: "Test Customer",
    phone: "0711000001",
    email: "test@example.test",
  },
  startDate: "2026-12-10",
  endDate: "2026-12-12",
  rentalDays: 3,
  fulfilmentMethod: "COLLECTION",
  totalAmount: "1200.00",
  paidAmount: "0.00",
  paymentStatus: "UNPAID",
  currency: "KES",
  holdExpiresAt: null,
  holdExpired: false,
  createdAt: "2026-11-22T10:00:00.000Z",
  createdBy: null,
  items: [],
  packages: [],
  stockHolds: [],
  payments: [],
  statusHistory: [],
  totals: {
    subtotal: "1200.00",
    discountAmount: "0.00",
    transportCharge: "0.00",
    totalAmount: "1200.00",
    paidAmount: "0.00",
    amountDue: "1200.00",
    overpaidBy: "0.00",
  },
  notes: null,
  specialRequests: null,
  dropoffAddress: null,
  dropoffNotes: null,
  pickupAddress: "Test collection point",
  pickupNotes: null,
  approvedAt: null,
  cancelledAt: null,
  fulfilmentDate: null,
  updatedAt: "2026-11-22T10:00:00.000Z",
};

const summary: BookingPaymentSummary = {
  id: booking.id,
  code: booking.code,
  status: booking.status,
  totalAmount: "1200.00",
  paidAmount: "500.00",
  amountDue: "700.00",
  overpaidBy: "0.00",
  paymentStatus: "PARTIALLY_PAID",
};

const payment: PaymentRow = {
  id: "payment-1",
  bookingId: booking.id,
  amount: "500.00",
  method: "MPESA",
  status: "PAID",
  providerRef: "QJ72X8ABC",
  description: "Deposit",
  paidAt: "2026-11-22T09:00:00.000Z",
  createdAt: "2026-11-22T09:00:00.000Z",
  updatedAt: "2026-11-22T09:00:00.000Z",
  paidBy: { id: "admin-1", name: "Owner", email: "owner@partyplay.co.ke" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PaymentsPanel", () => {
  it("uses the server's paid total and balance instead of recalculating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          data: [payment],
          meta: { total: 1, paidTotal: "500.00", booking: summary },
        }),
      ),
    );

    renderWithClient(<PaymentsPanel booking={booking} />);

    const table = within(await screen.findByRole("table"));
    expect(table.getByText("QJ72X8ABC")).toBeInTheDocument();
    expect(table.getByText("M-Pesa")).toBeInTheDocument();
    expect(screen.getByText("Paid to date").parentElement).toHaveTextContent(
      "500.00",
    );
    expect(screen.getByText("Amount due").parentElement).toHaveTextContent("700.00");
    expect(screen.getByText("Part paid")).toBeInTheDocument();
  });

  it("posts the recorded payment and lets the server settle the balance", async () => {
    const newPayment: PaymentRow = {
      ...payment,
      id: "payment-2",
      amount: "300.00",
      method: "CASH",
      providerRef: null,
      description: null,
      paidBy: { id: "admin-1", name: "Owner", email: "owner@partyplay.co.ke" },
    };
    const settled: BookingPaymentSummary = {
      ...summary,
      paidAmount: "800.00",
      amountDue: "400.00",
    };
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return jsonResponse(201, { data: { payment: newPayment, booking: settled } });
        }
        return jsonResponse(200, {
          data: [payment],
          meta: { total: 1, paidTotal: "500.00", booking: summary },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(<PaymentsPanel booking={booking} />);
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await user.type(screen.getByLabelText(/Amount received/), "300");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Record payment",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/bookings/booking-1/payments",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    );
    const body = JSON.parse(String(postCall?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ amount: 300, method: "CASH" });
    expect(typeof body.paidAt).toBe("string");
  });

  it("hides delete for bookings that are no longer pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          data: [payment],
          meta: { total: 1, paidTotal: "500.00", booking: summary },
        }),
      ),
    );

    renderWithClient(
      <PaymentsPanel booking={{ ...booking, status: "CONFIRMED" }} />,
    );

    const table = within(await screen.findByRole("table"));
    expect(
      table.queryByRole("button", { name: /Delete payment/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/only be deleted while the booking is pending/),
    ).toBeInTheDocument();
  });
});
