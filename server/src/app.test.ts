import "dotenv/config";

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import bcrypt from "bcrypt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { db, ensureClient } from "./config/db";
import { formatCalendarDate, todayInNairobi } from "./lib/dates";

/**
 * HTTP smoke tests: the real app, middleware and routes against the configured database.
 *
 * These cover the invariants that cost money or oversell stock, which unit tests cannot
 * reach: the admin guard, a hold moving into a confirmed reservation and back, the
 * payment cache staying equal to the rows, and the dashboard reporting what was written.
 * Fixtures are created here and removed afterwards, so the suite is repeatable against a
 * seeded database and never depends on seed ids.
 *
 * Skipped when DATABASE_URL is absent; if the database is unreachable the hook fails with
 * the connection error rather than a misleading assertion.
 */
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("API smoke tests", () => {
  const password = "smoke-test-password";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `smoke-${suffix}@example.test`;
  const phone = `0799${String(Date.now()).slice(-7)}`;
  const equipmentSlug = `smoke-equipment-${suffix}`;
  const categorySlug = `smoke-category-${suffix}`;

  const today = todayInNairobi();
  const dates = {
    startDate: formatCalendarDate(today),
    endDate: formatCalendarDate(new Date(today.getTime() + 86_400_000)),
  };
  const futureDates = {
    startDate: formatCalendarDate(new Date(today.getTime() + 5 * 86_400_000)),
    endDate: formatCalendarDate(new Date(today.getTime() + 6 * 86_400_000)),
  };

  let server: Server;
  let base: string;
  let cookie: string;
  let adminId: string;
  let categoryId: string;
  let equipmentId: string;
  let baseline: {
    pending: number;
    collected: number;
    upcoming: Array<{ code: string }>;
  };

  type Json = Record<string, unknown>;

  async function api(
    method: string,
    path: string,
    options: { body?: unknown; cookie?: string } = {},
  ): Promise<{ status: number; body: Json }> {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.cookie ? { Cookie: options.cookie } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Json) : {} };
  }

  function bookingDates(range: { startDate: string; endDate: string }) {
    return {
      ...range,
      fulfilmentMethod: "COLLECTION",
      pickupAddress: "PartyPlay store, Nairobi",
      customer: { name: "Smoke Test", phone },
    };
  }

  beforeAll(async () => {
    await ensureClient();

    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    adminId = (
      await db.admin.create({
        data: {
          email,
          name: "Smoke Test Admin",
          role: "OWNER",
          password: await bcrypt.hash(password, 4),
        },
      })
    ).id;

    categoryId = (
      await db.category.create({
        data: { slug: categorySlug, name: `Smoke Category ${suffix}` },
      })
    ).id;

    equipmentId = (
      await db.equipment.create({
        data: {
          slug: equipmentSlug,
          name: `Smoke Equipment ${suffix}`,
          categoryId,
          pricingMode: "FLAT",
          flatPrice: "2000.00",
          inventory: { create: { total: 3 } },
        },
      })
    ).id;

    // The session is an httpOnly cookie; tests speak HTTP so they replay it verbatim.
    const login = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const setCookie =
      (login.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    expect(setCookie.length).toBeGreaterThan(0);
    cookie = setCookie[0].split(";")[0];

    const dashboard = await api("GET", "/api/admin/dashboard", { cookie });
    expect(dashboard.status).toBe(200);
    const data = dashboard.body.data as {
      bookings: { pending: number };
      revenue: { collected: string };
      upcoming: Array<{ code: string }>;
    };
    baseline = {
      pending: data.bookings.pending,
      collected: Number(data.revenue.collected),
      upcoming: data.upcoming,
    };
  }, 30_000);

  afterAll(async () => {
    if (!databaseUrl) return;

    if (!server) {
      await db.$disconnect();
      return;
    }

    const bookings = await db.booking.findMany({
      where: { customer: { phone } },
      select: { id: true },
    });
    const bookingIds = bookings.map((row) => row.id);

    // Payment -> Booking is a restricting FK; money rows must go first.
    await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await db.customer.deleteMany({ where: { phone } });
    await db.equipment.deleteMany({ where: { id: equipmentId } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.bookingStatusHistory.deleteMany({ where: { adminId } });
    await db.admin.deleteMany({ where: { id: adminId } });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.$disconnect();
  }, 30_000);

  it("reports health", async () => {
    const { status, body } = await api("GET", "/api/health");
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "partyplay-api" });
  });

  it("refuses admin routes without a session", async () => {
    const { status, body } = await api("GET", "/api/admin/dashboard");
    expect(status).toBe(401);
    expect(body).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an empty booking request", async () => {
    const { status, body } = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(dates),
        equipment: [],
        packages: [],
      },
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("moves a hold through confirmation and cancellation without leaking stock", async () => {
    const created = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(dates),
        equipment: [{ equipmentId, quantity: 3 }],
      },
    });
    expect(created.status).toBe(201);

    const code = (created.body.data as { code: string }).code;
    const booking = await db.booking.findUniqueOrThrow({ where: { code } });

    const availability = () =>
      api(
        "GET",
        `/api/availability?equipmentIds=${equipmentId}&startDate=${dates.startDate}&endDate=${dates.endDate}`,
      );

    // A pending request holds all three units.
    let rows = (await availability()).body.data as Array<{ available: number }>;
    expect(rows[0].available).toBe(0);

    const confirmed = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CONFIRMED" },
    });
    expect(confirmed.status).toBe(200);
    expect((confirmed.body.data as { status: string }).status).toBe("CONFIRMED");

    rows = (await availability()).body.data as Array<{ available: number }>;
    expect(rows[0].available).toBe(0);

    const cancelled = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CANCELLED", reason: "Smoke test" },
    });
    expect(cancelled.status).toBe(200);

    // Cancelling a confirmed booking releases the item rows.
    rows = (await availability()).body.data as Array<{ available: number }>;
    expect(rows[0].available).toBe(3);
  }, 30_000);

  it("recomputes the payment cache from the rows after a deletion", async () => {
    const created = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(futureDates),
        equipment: [{ equipmentId, quantity: 1 }],
      },
    });
    expect(created.status).toBe(201);
    const code = (created.body.data as { code: string }).code;
    const booking = await db.booking.findUniqueOrThrow({ where: { code } });

    const paidAt = new Date().toISOString();
    const first = await api("POST", `/api/admin/bookings/${booking.id}/payments`, {
      cookie,
      body: { amount: 500, method: "CASH", paidAt },
    });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      booking: { paidAmount: "500.00", paymentStatus: "PARTIALLY_PAID" },
    });

    const second = await api("POST", `/api/admin/bookings/${booking.id}/payments`, {
      cookie,
      body: { amount: 1500, method: "CASH", paidAt },
    });
    expect(second.status).toBe(201);
    expect(second.body.data).toMatchObject({
      booking: { paidAmount: "2000.00", paymentStatus: "PAID" },
    });

    const firstPaymentId = (first.body.data as { payment: { id: string } }).payment.id;
    const deleted = await api("DELETE", `/api/admin/payments/${firstPaymentId}`, { cookie });
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toMatchObject({
      booking: { paidAmount: "1500.00", paymentStatus: "PARTIALLY_PAID" },
    });

    // The cache must equal the rows, not a counter that drifted.
    const sum = await db.payment.aggregate({
      where: { bookingId: booking.id, status: "PAID" },
      _sum: { amount: true },
    });
    const cached = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { paidAmount: true },
    });
    expect(Number(cached.paidAmount)).toBe(Number(sum._sum.amount ?? 0));
    expect(Number(cached.paidAmount)).toBe(1500);
  }, 30_000);

  it("reflects the written booking and money on the dashboard", async () => {
    const { status, body } = await api("GET", "/api/admin/dashboard", { cookie });
    expect(status).toBe(200);

    const data = body.data as {
      bookings: { pending: number };
      revenue: { collected: string };
      upcoming: Array<{ code: string }>;
    };

    // One unpaid pending request was added by the payment test; the lifecycle booking
    // ended cancelled, so it must not inflate the count.
    expect(data.bookings.pending).toBe(baseline.pending + 1);
    expect(Number(data.revenue.collected)).toBeCloseTo(baseline.collected + 1500, 2);
    expect(Array.isArray(data.upcoming)).toBe(true);
    expect(data.upcoming).toEqual(baseline.upcoming);
  }, 30_000);
});
