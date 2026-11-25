import "dotenv/config";

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import bcrypt from "bcrypt";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const emailMock = vi.hoisted(() => ({
  isEmailConfigured: vi.fn(() => true),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./lib/email", () => ({
  isEmailConfigured: emailMock.isEmailConfigured,
  sendEmail: emailMock.sendEmail,
  sendPasswordResetEmail: emailMock.sendPasswordResetEmail,
}));

import { createApp } from "./app";
import { db, ensureClient } from "./config/db";
import { formatCalendarDate, todayInNairobi } from "./lib/dates";
import { issuePasswordResetToken, PASSWORD_RESET_RETENTION_MS } from "./services/auth";

/**
 * HTTP smoke tests: the real app, middleware and routes against the configured database.
 *
 * These cover the invariants that cost money or oversell stock, which unit tests cannot
 * reach: the admin guard, a hold moving into a confirmed reservation and back, the
 * payment cache staying equal to the rows, and the dashboard reporting what was written.
 * Fixtures are created here and removed afterwards, so the suite is repeatable against a
 * seeded database and never depends on seed ids.
 *
 * Whether the suite runs is decided before any test loads: the global setup probes the
 * database and sets PARTYPLAY_SMOKE_DB. CI supplies a DATABASE_URL even when no database
 * is running, so the variable alone cannot gate this.
 */
const smokeDbAvailable = process.env.PARTYPLAY_SMOKE_DB === "run";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe.skipIf(!smokeDbAvailable)("API smoke tests", () => {
  const password = "smoke-test-password";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `smoke-${suffix}@example.test`;
  const phone = `07${String(Date.now()).slice(-8)}`;
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
  const maintenanceDates = {
    startDate: formatCalendarDate(new Date(today.getTime() + 10 * 86_400_000)),
    endDate: formatCalendarDate(new Date(today.getTime() + 11 * 86_400_000)),
  };
  const confirmationDates = {
    startDate: formatCalendarDate(new Date(today.getTime() + 15 * 86_400_000)),
    endDate: formatCalendarDate(new Date(today.getTime() + 16 * 86_400_000)),
  };

  let server: Server;
  let base: string;
  let cookie: string;
  let adminId: string;
  let categoryId: string;
  let equipmentId: string;
  let lastUnitEquipmentId: string | null = null;
  const staffAccountIds: string[] = [];
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

    // Prisma must mint UUIDs server-side for every new primary key.
    expect(adminId).toMatch(UUID_PATTERN);
    expect(categoryId).toMatch(UUID_PATTERN);
    expect(equipmentId).toMatch(UUID_PATTERN);

    // The session is an httpOnly cookie; tests speak HTTP so they replay it verbatim.
    const login = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const setCookie =
      (login.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const sessionCookie = setCookie.find((value) => value.startsWith("pt_sess="));
    expect(sessionCookie).toBeDefined();
    cookie = sessionCookie!.split(";")[0];

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
    if (!server) {
      if (db) {
        await db.$disconnect().catch(() => undefined);
      }
      return;
    }

    const bookings = await db.booking.findMany({
      where: { customer: { phone } },
      select: { id: true },
    });
    const bookingIds = bookings.map((row) => row.id);

    // Payment -> Booking is a restricting FK; refunds must go before their payments.
    await db.paymentRefund.deleteMany({ where: { payment: { bookingId: { in: bookingIds } } } });
    await db.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await db.customer.deleteMany({ where: { phone } });
    await db.equipment.deleteMany({ where: { id: equipmentId } });
    if (lastUnitEquipmentId) {
      await db.equipment.deleteMany({ where: { id: lastUnitEquipmentId } });
    }
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.bookingStatusHistory.deleteMany({ where: { adminId } });
    await db.admin.deleteMany({ where: { id: { in: [adminId, ...staffAccountIds] } } });

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

  it("quotes a booking without creating one", async () => {
    const quoted = await api("POST", "/api/bookings/quote", {
      body: {
        ...futureDates,
        packages: [],
        equipment: [{ equipmentId, quantity: 2 }],
      },
    });

    expect(quoted.status).toBe(200);
    expect(quoted.body.data).toMatchObject({
      startDate: futureDates.startDate,
      endDate: futureDates.endDate,
      rentalDays: 2,
      subtotal: "4000.00",
      discountAmount: "0.00",
      transportCharge: "0.00",
      totalAmount: "4000.00",
    });
    expect((quoted.body.data as { items: unknown[] }).items).toHaveLength(1);

    // A quote must never create a customer or booking.
    expect(await db.booking.count({ where: { customer: { phone } } })).toBe(0);
    expect(await db.customer.count({ where: { phone } })).toBe(0);
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
    expect(booking.id).toMatch(UUID_PATTERN);

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

  it("removes blacked-out equipment from availability and refuses new bookings", async () => {
    const created = await api("POST", "/api/admin/blackouts", {
      cookie,
      body: {
        equipmentId,
        ...maintenanceDates,
        reason: "Damaged blower; awaiting repair",
      },
    });
    expect(created.status).toBe(201);
    const blackoutId = (created.body.data as { id: string }).id;

    const availabilityPath = `/api/availability?equipmentIds=${equipmentId}&startDate=${maintenanceDates.startDate}&endDate=${maintenanceDates.endDate}`;
    let rows = (await api("GET", availabilityPath)).body.data as Array<{
      available: number;
      blocked: number;
      maintenance: boolean;
    }>;
    expect(rows[0]).toMatchObject({ available: 0, blocked: 3, maintenance: true });

    const booking = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(maintenanceDates),
        equipment: [{ equipmentId, quantity: 1 }],
      },
    });
    expect(booking.status).toBe(409);
    expect(booking.body).toMatchObject({ code: "CONFLICT" });
    expect(String(booking.body.error)).toContain("maintenance");

    const removed = await api("DELETE", `/api/admin/blackouts/${blackoutId}`, { cookie });
    expect(removed.status).toBe(204);

    rows = (await api("GET", availabilityPath)).body.data as Array<{
      available: number;
      blocked: number;
      maintenance: boolean;
    }>;
    expect(rows[0]).toMatchObject({ available: 3, maintenance: false });
  }, 30_000);

  it("refuses to confirm a pending booking after maintenance is added", async () => {
    const created = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(confirmationDates),
        equipment: [{ equipmentId, quantity: 1 }],
      },
    });
    expect(created.status).toBe(201);
    const code = (created.body.data as { code: string }).code;
    const booking = await db.booking.findUniqueOrThrow({ where: { code } });

    const blackout = await api("POST", "/api/admin/blackouts", {
      cookie,
      body: {
        equipmentId,
        ...confirmationDates,
        reason: "Inspection before the weekend",
      },
    });
    expect(blackout.status).toBe(201);

    const blocked = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CONFIRMED" },
    });
    expect(blocked.status).toBe(409);
    expect(String(blocked.body.error)).toContain("maintenance");
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true } }))
        .status,
    ).toBe("PENDING");

    const blackoutId = (blackout.body.data as { id: string }).id;
    expect((await api("DELETE", `/api/admin/blackouts/${blackoutId}`, { cookie })).status).toBe(
      204,
    );

    const confirmed = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CONFIRMED" },
    });
    expect(confirmed.status).toBe(200);

    const cancelled = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CANCELLED", reason: "Smoke test cleanup" },
    });
    expect(cancelled.status).toBe(200);
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

  it("throttles public booking lookups", async () => {
    // 60 lookups per window are allowed; the next one is refused.
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const { status } = await api("GET", "/api/bookings/PP-AAAAAA");
      expect(status).toBe(404);
    }

    const blocked = await api("GET", "/api/bookings/PP-AAAAAA");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ code: "RATE_LIMITED" });
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

  it("rejects overpayment and records partial then full refunds", async () => {
    const before = await api("GET", "/api/admin/dashboard", { cookie });
    const beforeCollected = Number(
      (before.body.data as { revenue: { collected: string } }).revenue.collected,
    );

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

    const overpaid = await api("POST", `/api/admin/bookings/${booking.id}/payments`, {
      cookie,
      body: { amount: 2500, method: "CASH", paidAt },
    });
    expect(overpaid.status).toBe(409);
    expect(String(overpaid.body.error)).toContain("outstanding balance");

    const paid = await api("POST", `/api/admin/bookings/${booking.id}/payments`, {
      cookie,
      body: { amount: 2000, method: "CASH", paidAt },
    });
    expect(paid.status).toBe(201);
    expect(paid.body.data).toMatchObject({
      booking: { paidAmount: "2000.00", paymentStatus: "PAID" },
    });
    const paymentId = (paid.body.data as { payment: { id: string } }).payment.id;

    const partial = await api("POST", `/api/admin/payments/${paymentId}/refunds`, {
      cookie,
      body: {
        amount: 500,
        reason: "Customer reduced the guest count",
        reference: "REF-001",
        refundedAt: paidAt,
      },
    });
    expect(partial.status).toBe(201);
    expect(partial.body.data).toMatchObject({
      payment: {
        status: "PAID",
        refundedAmount: "500.00",
        refundableAmount: "1500.00",
      },
      booking: { paidAmount: "1500.00", paymentStatus: "PARTIALLY_PAID" },
    });

    const tooMuch = await api("POST", `/api/admin/payments/${paymentId}/refunds`, {
      cookie,
      body: { amount: 1600, reason: "Too much" },
    });
    expect(tooMuch.status).toBe(400);
    expect(String(tooMuch.body.error)).toContain("unrefunded");

    const full = await api("POST", `/api/admin/payments/${paymentId}/refunds`, {
      cookie,
      body: { amount: 1500, reason: "Booking cancelled" },
    });
    expect(full.status).toBe(201);
    expect(full.body.data).toMatchObject({
      payment: {
        status: "REFUNDED",
        refundedAmount: "2000.00",
        refundableAmount: "0.00",
      },
      booking: { paidAmount: "0.00", paymentStatus: "UNPAID" },
    });

    const again = await api("POST", `/api/admin/payments/${paymentId}/refunds`, {
      cookie,
      body: { amount: 1, reason: "Already refunded" },
    });
    expect(again.status).toBe(409);

    const listed = await api("GET", `/api/admin/bookings/${booking.id}/payments`, { cookie });
    expect(listed.status).toBe(200);
    expect(listed.body.meta).toMatchObject({
      refundedTotal: "2000.00",
      paidTotal: "0.00",
      booking: { paidAmount: "0.00" },
    });
    expect((listed.body.data as Array<{ refunds: unknown[] }>)[0].refunds).toHaveLength(2);

    const after = await api("GET", "/api/admin/dashboard", { cookie });
    expect(
      Number((after.body.data as { revenue: { collected: string } }).revenue.collected),
    ).toBeCloseTo(beforeCollected, 2);
  }, 30_000);

  it("edits dates and items without double-counting the booking's own stock", async () => {
    const firstDates = {
      startDate: formatCalendarDate(new Date(today.getTime() + 22 * 86_400_000)),
      endDate: formatCalendarDate(new Date(today.getTime() + 23 * 86_400_000)),
    };
    const secondDates = {
      startDate: formatCalendarDate(new Date(today.getTime() + 24 * 86_400_000)),
      endDate: formatCalendarDate(new Date(today.getTime() + 25 * 86_400_000)),
    };

    const created = await api("POST", "/api/bookings", {
      body: {
        ...bookingDates(firstDates),
        equipment: [{ equipmentId, quantity: 1 }],
      },
    });
    expect(created.status).toBe(201);
    const code = (created.body.data as { code: string }).code;
    const booking = await db.booking.findUniqueOrThrow({ where: { code } });

    const edited = await api("PATCH", `/api/admin/bookings/${booking.id}`, {
      cookie,
      body: {
        ...secondDates,
        packages: [],
        equipment: [{ equipmentId, quantity: 2 }],
        note: "Customer added a second unit",
      },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({
      status: "PENDING",
      startDate: secondDates.startDate,
      endDate: secondDates.endDate,
      totals: { totalAmount: "4000.00" },
      previousTotalAmount: "2000.00",
      totalChanged: true,
    });
    expect((edited.body.data as { edits: unknown[] }).edits).toHaveLength(1);

    const firstAvailability = await api(
      "GET",
      `/api/availability?equipmentIds=${equipmentId}&startDate=${firstDates.startDate}&endDate=${firstDates.endDate}`,
    );
    expect((firstAvailability.body.data as Array<{ available: number }>)[0].available).toBe(3);

    const secondAvailability = await api(
      "GET",
      `/api/availability?equipmentIds=${equipmentId}&startDate=${secondDates.startDate}&endDate=${secondDates.endDate}`,
    );
    expect((secondAvailability.body.data as Array<{ available: number }>)[0].available).toBe(1);

    const tooMany = await api("PATCH", `/api/admin/bookings/${booking.id}`, {
      cookie,
      body: {
        ...secondDates,
        packages: [],
        equipment: [{ equipmentId, quantity: 4 }],
      },
    });
    expect(tooMany.status).toBe(409);

    const confirmed = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CONFIRMED" },
    });
    expect(confirmed.status).toBe(200);

    const confirmedEdit = await api("PATCH", `/api/admin/bookings/${booking.id}`, {
      cookie,
      body: {
        ...secondDates,
        packages: [],
        equipment: [{ equipmentId, quantity: 3 }],
        note: "Added the last unit after confirmation",
      },
    });
    expect(confirmedEdit.status).toBe(200);
    expect(confirmedEdit.body.data).toMatchObject({
      status: "CONFIRMED",
      totals: { totalAmount: "6000.00" },
      items: [{ quantity: 3 }],
      stockHolds: [{ quantity: 3, status: "CONSUMED" }],
    });
    expect((confirmedEdit.body.data as { edits: unknown[] }).edits).toHaveLength(2);

    const confirmedTooMany = await api("PATCH", `/api/admin/bookings/${booking.id}`, {
      cookie,
      body: {
        ...secondDates,
        packages: [],
        equipment: [{ equipmentId, quantity: 4 }],
      },
    });
    expect(confirmedTooMany.status).toBe(409);

    const edits = await db.bookingEdit.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
      select: { previousTotalAmount: true, newTotalAmount: true, note: true },
    });
    expect(edits).toHaveLength(2);
    expect(Number(edits[0]?.previousTotalAmount)).toBe(2000);
    expect(Number(edits[0]?.newTotalAmount)).toBe(4000);
    expect(Number(edits[1]?.newTotalAmount)).toBe(6000);
    expect(edits[1]?.note).toBe("Added the last unit after confirmation");

    const cancelled = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
      cookie,
      body: { status: "CANCELLED", reason: "Smoke test cleanup" },
    });
    expect(cancelled.status).toBe(200);
  }, 30_000);

  it("manages team accounts and scopes admin routes by role", async () => {
    const staffEmail = `smoke-staff-${suffix}@example.test`;
    const staffPassword = "Staff-Password1";
    const replacementPassword = "Replacement-Password2";

    const listed = await api("GET", "/api/admin/users", { cookie });
    expect(listed.status).toBe(200);
    expect((listed.body.data as Array<{ id: string }>).map((row) => row.id)).toContain(adminId);

    const created = await api("POST", "/api/admin/users", {
      cookie,
      body: {
        name: "Smoke Staff",
        email: staffEmail,
        role: "STAFF",
        password: staffPassword,
      },
    });
    expect(created.status).toBe(201);
    const staffMember = created.body.data as { id: string; role: string; isActive: boolean };
    expect(staffMember).toMatchObject({ role: "STAFF", isActive: true });
    staffAccountIds.push(staffMember.id);

    const duplicate = await api("POST", "/api/admin/users", {
      cookie,
      body: {
        name: "Smoke Staff Copy",
        email: staffEmail,
        role: "STAFF",
        password: staffPassword,
      },
    });
    expect(duplicate.status).toBe(409);

    async function loginCookie(emailAddress: string, pass: string): Promise<string> {
      const response = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress, password: pass }),
      });
      const setCookies =
        (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
      const value = setCookies.find((entry) => entry.startsWith("pt_sess="));
      return response.status === 200 && value ? value.split(";")[0] : "";
    }

    const staffCookie = await loginCookie(staffEmail, staffPassword);
    expect(staffCookie).not.toBe("");

    // Staff can see the board but not manage accounts or touch money.
    expect((await api("GET", "/api/admin/dashboard", { cookie: staffCookie })).status).toBe(200);
    expect((await api("GET", "/api/admin/users", { cookie: staffCookie })).status).toBe(403);
    const staffPayment = await api(
      "POST",
      "/api/admin/bookings/00000000-0000-4000-8000-000000000000/payments",
      { cookie: staffCookie, body: { amount: 100 } },
    );
    expect(staffPayment.status).toBe(403);
    expect(staffPayment.body).toMatchObject({ code: "FORBIDDEN" });

    // Promoting the same session takes effect on the next request, not the next login.
    const promoted = await api("PATCH", `/api/admin/users/${staffMember.id}`, {
      cookie,
      body: { role: "ADMIN" },
    });
    expect(promoted.status).toBe(200);
    expect((promoted.body.data as { role: string }).role).toBe("ADMIN");
    const nowAllowed = await api(
      "POST",
      "/api/admin/bookings/00000000-0000-4000-8000-000000000000/payments",
      { cookie: staffCookie, body: {} },
    );
    expect(nowAllowed.status).toBe(400);

    // Disabling ends the existing session and blocks a fresh login immediately.
    const disabled = await api("PATCH", `/api/admin/users/${staffMember.id}`, {
      cookie,
      body: { isActive: false },
    });
    expect(disabled.status).toBe(200);
    expect((disabled.body.data as { isActive: boolean }).isActive).toBe(false);
    expect((await api("GET", "/api/admin/dashboard", { cookie: staffCookie })).status).toBe(401);
    expect(await loginCookie(staffEmail, staffPassword)).toBe("");

    await api("PATCH", `/api/admin/users/${staffMember.id}`, {
      cookie,
      body: { isActive: true },
    });
    const reset = await api("POST", `/api/admin/users/${staffMember.id}/password`, {
      cookie,
      body: { password: replacementPassword },
    });
    expect(reset.status).toBe(204);
    expect(await loginCookie(staffEmail, staffPassword)).toBe("");
    expect(await loginCookie(staffEmail, replacementPassword)).not.toBe("");

    // An owner cannot lock themselves out.
    const selfDisable = await api("PATCH", `/api/admin/users/${adminId}`, {
      cookie,
      body: { isActive: false },
    });
    expect(selfDisable.status).toBe(400);
    const selfDemote = await api("PATCH", `/api/admin/users/${adminId}`, {
      cookie,
      body: { role: "STAFF" },
    });
    expect(selfDemote.status).toBe(400);
  }, 30_000);

  it("requests a reset email without revealing whether the account exists", async () => {
    emailMock.sendPasswordResetEmail.mockClear();

    const known = await api("POST", "/api/auth/forgot-password", {
      body: { email },
    });
    expect(known.status).toBe(202);
    expect(emailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const sent = emailMock.sendPasswordResetEmail.mock.calls[0]?.[0] as {
      to: string;
      resetUrl: string;
    };
    expect(sent.to).toBe(email);
    expect(sent.resetUrl).toContain("/admin/reset-password#token=");

    const unknown = await api("POST", "/api/auth/forgot-password", {
      body: { email: `unknown-${suffix}@example.test` },
    });
    expect(unknown.status).toBe(202);
    expect(unknown.body).toMatchObject({ data: { message: expect.any(String) } });
    expect(emailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("cleans up reset tokens after the retention window", async () => {
    const stale = await db.passwordResetToken.create({
      data: {
        adminId,
        tokenHash: `stale-${suffix}`,
        expiresAt: new Date(Date.now() - PASSWORD_RESET_RETENTION_MS - 60_000),
      },
    });
    const recentUsed = await db.passwordResetToken.create({
      data: {
        adminId,
        tokenHash: `used-${suffix}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    await issuePasswordResetToken(adminId);

    const remaining = await db.passwordResetToken.findMany({
      where: { id: { in: [stale.id, recentUsed.id] } },
      select: { id: true },
    });
    const ids = remaining.map((row) => row.id);
    expect(ids).not.toContain(stale.id);
    expect(ids).toContain(recentUsed.id);
  }, 30_000);

  it("reports missing email configuration without sending or looking up an account", async () => {
    emailMock.sendPasswordResetEmail.mockClear();
    emailMock.isEmailConfigured.mockReturnValueOnce(false);

    const response = await api("POST", "/api/auth/forgot-password", {
      body: { email },
    });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "EMAIL_NOT_CONFIGURED" });
    expect(emailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  }, 30_000);

  it("resets a password once, expires old links and invalidates old sessions", async () => {
    const { token } = await issuePasswordResetToken(adminId);
    const stored = await db.passwordResetToken.findFirstOrThrow({
      where: { adminId },
      orderBy: { createdAt: "desc" },
    });

    // The raw token never reaches the database.
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(token);

    const newPassword = "Reset-Password1";
    const reset = await api("POST", "/api/auth/reset-password", {
      body: { token, newPassword },
    });
    expect(reset.status).toBe(204);

    const reused = await api("POST", "/api/auth/reset-password", {
      body: { token, newPassword },
    });
    expect(reused.status).toBe(400);

    // The session issued before the reset carries the old session version.
    expect((await api("GET", "/api/admin/dashboard", { cookie })).status).toBe(401);

    const oldLogin = await api("POST", "/api/auth/login", {
      body: { email, password },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: newPassword }),
    });
    expect(newLogin.status).toBe(200);

    const { token: expiredToken } = await issuePasswordResetToken(adminId);
    await db.passwordResetToken.updateMany({
      where: { adminId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = await api("POST", "/api/auth/reset-password", {
      body: { token: expiredToken, newPassword: "Another-Password1" },
    });
    expect(expired.status).toBe(400);
  }, 30_000);

  it("allows only one of two concurrent requests for the last unit", async () => {
    const lastUnit = await db.equipment.create({
      data: {
        slug: `smoke-last-unit-${suffix}`,
        name: `Smoke Last Unit ${suffix}`,
        categoryId,
        pricingMode: "FLAT",
        flatPrice: "2000.00",
        inventory: { create: { total: 1 } },
      },
    });
    lastUnitEquipmentId = lastUnit.id;

    const request = () =>
      api("POST", "/api/bookings", {
        body: {
          ...bookingDates(futureDates),
          equipment: [{ equipmentId: lastUnit.id, quantity: 1 }],
        },
      });

    const responses = await Promise.all([request(), request()]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);

    const accepted = responses.find((response) => response.status === 201);
    const rejected = responses.find((response) => response.status === 409);
    expect(accepted?.body).toMatchObject({ data: { status: "PENDING" } });
    expect(rejected?.body).toMatchObject({ code: "CONFLICT" });

    const acceptedBookings = await db.booking.findMany({
      where: {
        customer: { phone },
        items: { some: { equipmentId: lastUnit.id } },
      },
      select: { id: true, status: true },
    });
    expect(acceptedBookings).toHaveLength(1);
    expect(acceptedBookings[0]?.status).toBe("PENDING");

    const activeHolds = await db.stockHold.findMany({
      where: { equipmentId: lastUnit.id, status: "ACTIVE" },
      select: { quantity: true },
    });
    expect(activeHolds).toHaveLength(1);
    expect(activeHolds[0]?.quantity).toBe(1);
  }, 30_000);
});
