import type { Request, Response } from "express";

import { unauthorized } from "../lib/api-error";
import { idParamsSchema } from "../schemas/common";
import {
  adminBookingListQuerySchema,
  bookingCodeParamsSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  updateBookingTransportSchema,
} from "../schemas/bookings";
import * as bookings from "../services/bookings";

export async function createBooking(req: Request, res: Response): Promise<void> {
  const input = createBookingSchema.parse(req.body);
  res.status(201).json({ data: await bookings.createBookingRequest(input) });
}

export async function getBooking(req: Request, res: Response): Promise<void> {
  const { code } = bookingCodeParamsSchema.parse(req.params);
  res.json({ data: await bookings.getBookingByCode(code) });
}

// ---------------------------------------------------------------------------
// Admin (F8). `requireAdmin` has already attached the session.
// ---------------------------------------------------------------------------

function adminId(req: Request): string {
  const id = req.admin?.id;
  if (!id) {
    throw unauthorized("Authentication required");
  }
  return id;
}

export async function listAdminBookings(req: Request, res: Response): Promise<void> {
  const query = adminBookingListQuerySchema.parse(req.query);
  res.json(await bookings.listAdminBookings(query));
}

export async function getAdminBooking(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await bookings.getAdminBookingById(id) });
}

export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateBookingStatusSchema.parse(req.body);
  res.json({ data: await bookings.changeBookingStatus(id, input, adminId(req)) });
}

export async function updateBookingTransport(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateBookingTransportSchema.parse(req.body);
  res.json({ data: await bookings.updateBookingTransportCharge(id, input, adminId(req)) });
}

export async function checkBookingAvailability(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await bookings.checkAdminBookingAvailability(id) });
}
