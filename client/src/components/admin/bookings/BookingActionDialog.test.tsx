import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AdminBookingDetail,
  BookingAvailabilityCheck,
} from "../../../lib/admin-bookings";
import { allowedBookingActions } from "../../../lib/admin-bookings";
import { BookingActionDialog } from "./BookingActionDialog";

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

const available: BookingAvailabilityCheck = {
  bookingId: booking.id,
  status: "PENDING",
  startDate: booking.startDate,
  endDate: booking.endDate,
  holdExpiresAt: null,
  holdExpired: false,
  available: true,
  shortages: [],
};

const unavailable: BookingAvailabilityCheck = {
  ...available,
  available: false,
  shortages: [
    {
      equipmentId: "equipment-1",
      name: "Folding chairs",
      total: 3,
      reserved: 2,
      available: 1,
      requested: 2,
      shortfall: 1,
    },
  ],
};

const confirmAction = allowedBookingActions("PENDING").find(
  (action) => action.to === "CONFIRMED",
)!;
const cancelAction = allowedBookingActions("PENDING").find(
  (action) => action.to === "CANCELLED",
)!;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingActionDialog", () => {
  it("blocks confirmation when the fresh stock check reports a shortage", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(
      <BookingActionDialog
        booking={booking}
        action={confirmAction}
        availability={unavailable}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Not enough stock for these dates")).toBeInTheDocument();
    expect(screen.getByText(/short by/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm booking" }),
    ).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a reason before cancelling", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <BookingActionDialog
        booking={booking}
        action={cancelAction}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(
      await screen.findByText("Record why the booking was cancelled"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's INVALID_TRANSITION message and stays open", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse(409, {
          error: "A booking cannot move from CANCELLED to CONFIRMED",
          code: "INVALID_TRANSITION",
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <BookingActionDialog
        booking={booking}
        action={confirmAction}
        availability={available}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      await screen.findByText("That status change is not allowed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A booking cannot move from CANCELLED to CONFIRMED"),
    ).toBeInTheDocument();
    expect(screen.getByText("INVALID_TRANSITION")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/admin/bookings/booking-1/status",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
  });
});
