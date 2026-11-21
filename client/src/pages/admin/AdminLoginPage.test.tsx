import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RequireAdmin } from "../../components/admin/RequireAdmin";
import AdminLoginPage from "./AdminLoginPage";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function renderWithClient(children: React.ReactNode, initialEntry: string | object) {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function LoginHarness() {
  const location = useLocation();
  return <p>Attempted page {`${location.pathname}${location.search}`}</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminLoginPage", () => {
  it("shows an inline 401 message", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return jsonResponse(401, {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }
      return jsonResponse(401, {
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>,
      "/admin/login",
    );

    await screen.findByRole("heading", { name: "Welcome back" });
    await user.type(screen.getByLabelText("Email address"), "owner@partyplay.co.ke");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in to admin/i }));

    expect(
      await screen.findByText("Email or password not recognised"),
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });

  it("shows the login rate-limit message", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return jsonResponse(401, {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }
      return jsonResponse(429, {
        error: "Too many login attempts. Try again in a few minutes.",
        code: "RATE_LIMITED",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>,
      "/admin/login",
    );

    await screen.findByRole("heading", { name: "Welcome back" });
    await user.type(screen.getByLabelText("Email address"), "owner@partyplay.co.ke");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in to admin/i }));

    expect(await screen.findByText("Too many attempts")).toBeInTheDocument();
    expect(
      screen.getByText("Too many login attempts. Try again in a few minutes."),
    ).toBeInTheDocument();
  });

  it("returns to the attempted admin page after signing in", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return jsonResponse(401, {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }
      return jsonResponse(200, {
        data: {
          id: "admin-1",
          email: "owner@partyplay.co.ke",
          name: "PartyPlay Owner",
          role: "OWNER",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderWithClient(
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<LoginHarness />} />
      </Routes>,
      {
        pathname: "/admin/login",
        state: { from: { pathname: "/admin/dashboard", search: "?tab=bookings" } },
      },
    );

    await screen.findByRole("heading", { name: "Welcome back" });
    await user.type(screen.getByLabelText("Email address"), "owner@partyplay.co.ke");
    await user.type(screen.getByLabelText("Password"), "partyplay-admin-2024");
    await user.click(screen.getByRole("button", { name: /sign in to admin/i }));

    expect(await screen.findByText("Attempted page /admin/dashboard?tab=bookings")).toBeInTheDocument();
  });

  it("keeps the guard between an unauthenticated visitor and the dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, {
          error: "Authentication required",
          code: "UNAUTHORIZED",
        }),
      ),
    );

    renderWithClient(
      <Routes>
        <Route path="/admin/login" element={<p>Login screen</p>} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin/dashboard" element={<p>Secret dashboard</p>} />
        </Route>
      </Routes>,
      "/admin/dashboard",
    );

    expect(await screen.findByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });
});
