import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import BookingStatusPage from "./BookingStatusPage";

function renderStatusPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/booking/status"]}>
        <BookingStatusPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BookingStatusPage", () => {
  it("shows the rate-limited state without retrying the lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Too many booking lookups. Please wait a few minutes and try again.",
          code: "RATE_LIMITED",
          details: { retryAfterSeconds: 600 },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderStatusPage();

    await user.type(screen.getByLabelText("Booking code"), "PP-4ITSLZ");
    await user.click(screen.getByRole("button", { name: /find booking/i }));

    expect(await screen.findByText("Too many lookups")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Too many booking lookups. Please wait a few minutes and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("RATE_LIMITED")).toBeInTheDocument();
    expect(
      screen.getByText(/please wait a few minutes before checking again/i),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/bookings/PP-4ITSLZ");
  });
});
