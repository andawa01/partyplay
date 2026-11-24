import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminBookingDetail } from "../../../lib/admin-bookings";
import { BookingEditDialog } from "./BookingEditDialog";

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
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

const booking: AdminBookingDetail = {
  id: "booking-1",
  code: "PP-EDIT01",
  status: "PENDING",
  customer: {
    id: "customer-1",
    name: "Test Customer",
    phone: "0711000001",
    email: null,
  },
  startDate: "2026-12-10",
  endDate: "2026-12-11",
  rentalDays: 2,
  fulfilmentMethod: "COLLECTION",
  totalAmount: "1400.00",
  paidAmount: "0.00",
  paymentStatus: "UNPAID",
  currency: "KES",
  holdExpiresAt: "2026-12-01T10:00:00.000Z",
  holdExpired: false,
  createdAt: "2026-11-22T10:00:00.000Z",
  createdBy: null,
  items: [
    {
      id: "line-1",
      equipmentId: "eq-1",
      equipmentName: "Chair",
      equipmentSlug: "chair",
      quantity: 2,
      days: 2,
      unitPrice: "100.00",
      priceForPeriod: "400.00",
    },
  ],
  packages: [
    {
      id: "package-line-1",
      packageId: "pkg-1",
      packageName: "Silver Combo",
      packagePrice: "1000.00",
      quantity: 1,
      lineTotal: "1000.00",
      items: [{ equipmentId: "eq-1", equipmentName: "Chair", quantity: 4 }],
    },
  ],
  stockHolds: [
    {
      id: "hold-1",
      equipmentId: "eq-1",
      quantity: 6,
      status: "ACTIVE",
      expiresAt: "2026-12-01T10:00:00.000Z",
      releasedAt: null,
    },
  ],
  payments: [],
  statusHistory: [],
  edits: [],
  totals: {
    subtotal: "1400.00",
    discountAmount: "0.00",
    transportCharge: "0.00",
    totalAmount: "1400.00",
    paidAmount: "0.00",
    amountDue: "1400.00",
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingEditDialog", () => {
  it("prefills package-inclusive quantities and submits the edited selection", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        return jsonResponse(200, {
          data: {
            ...booking,
            startDate: "2026-12-12",
            endDate: "2026-12-13",
            totals: { ...booking.totals, totalAmount: "1600.00" },
            previousTotalAmount: "1400.00",
            totalChanged: true,
            changedBy: "admin-1",
          },
        });
      }
      if (url.includes("/api/admin/packages")) {
        return jsonResponse(200, {
          data: [
            {
              id: "pkg-1",
              name: "Silver Combo",
              isActive: true,
              price: "1000.00",
              items: [
                {
                  equipmentId: "eq-1",
                  quantity: 4,
                  equipment: { slug: "chair", name: "Chair" },
                },
              ],
            },
          ],
        });
      }
      return jsonResponse(200, {
        data: [
          {
            id: "eq-1",
            name: "Chair",
            isActive: true,
            maxQuantity: 10,
            pricePerDay: "100.00",
            flatPrice: null,
            total: 10,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 100 },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(<BookingEditDialog booking={booking} onClose={() => undefined} />);

    const chairGroup = within(await screen.findByRole("group", { name: "Quantity for Chair" }));
    expect(chairGroup.getByText("6")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/First day/));
    await user.type(screen.getByLabelText(/First day/), "2026-12-12");
    await user.clear(screen.getByLabelText(/Last day/));
    await user.type(screen.getByLabelText(/Last day/), "2026-12-13");
    await user.click(screen.getByRole("button", { name: "Increase Chair quantity" }));
    await user.type(screen.getByLabelText("Reason / note"), "Added one chair");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/bookings/booking-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    const body = JSON.parse(String(patchCall?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      startDate: "2026-12-12",
      endDate: "2026-12-13",
      packages: [{ packageId: "pkg-1", quantity: 1 }],
      equipment: [{ equipmentId: "eq-1", quantity: 7 }],
      note: "Added one chair",
    });
  });
});
