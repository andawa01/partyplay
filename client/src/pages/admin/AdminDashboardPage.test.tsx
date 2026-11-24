import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminDashboard } from "../../lib/dashboard";
import AdminDashboardPage from "./AdminDashboardPage";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderDashboard(dashboard: AdminDashboard) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  queryClient.setQueryData(["admin", "me"], {
    id: "admin-1",
    email: "owner@partyplay.co.ke",
    name: "Owner",
    role: "OWNER",
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(200, { data: dashboard })),
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const dashboard: AdminDashboard = {
  generatedAt: "2026-11-22T10:00:00.000Z",
  asOf: "2026-11-22",
  month: "2026-11",
  bookings: { pending: 4, confirmedThisMonth: 7, completed: 12 },
  revenue: {
    currency: "KES",
    collected: "12500.00",
    thisMonth: "4200.00",
    outstanding: "3100.00",
  },
  inventory: {
    horizonDays: 7,
    lowStock: [
      {
        equipmentId: "equipment-1",
        name: "Folding chairs",
        total: 10,
        availableToday: 0,
        reservedToday: 10,
        daysFullyBooked: 3,
        firstFullDate: "2026-11-23",
      },
    ],
  },
  upcoming: [
    {
      id: "booking-1",
      code: "PP-UPCOMING",
      status: "CONFIRMED",
      customer: { name: "Jane Wanjiku", phone: "0711000001" },
      startDate: "2026-11-24",
      endDate: "2026-11-26",
      fulfilmentMethod: "DELIVERY",
      totalAmount: "8000.00",
      paidAmount: "3000.00",
      paymentStatus: "PARTIALLY_PAID",
      createdAt: "2026-11-20T10:00:00.000Z",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminDashboardPage", () => {
  it("renders the live booking and revenue figures from the API", async () => {
    renderDashboard({
      ...dashboard,
      inventory: { horizonDays: 7, lowStock: [] },
      upcoming: [],
    });

    expect(
      await screen.findByRole("heading", { name: /Good to see you, Owner/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending requests").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Confirmed this month").parentElement).toHaveTextContent("7");
    expect(screen.getByText("Completed jobs").parentElement).toHaveTextContent("12");
    expect(screen.getByText(/12,500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4,200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/3,100\.00/)).toBeInTheDocument();
    expect(screen.getByText("Nothing on the calendar")).toBeInTheDocument();
    expect(screen.getByText("Stock looks healthy")).toBeInTheDocument();
  });

  it("lists upcoming jobs and low-stock equipment", async () => {
    renderDashboard(dashboard);

    expect(await screen.findByText("PP-UPCOMING")).toBeInTheDocument();
    expect(screen.getByText("Jane Wanjiku")).toBeInTheDocument();
    expect(screen.getByText(/3,000\.00/)).toBeInTheDocument();
    expect(screen.getByText("Folding chairs")).toBeInTheDocument();
    expect(screen.getByText(/0 of 10 free today/)).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();
  });
});
