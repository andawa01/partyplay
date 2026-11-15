import type { Request, Response } from "express";

import { bookingCodeParamsSchema, createBookingSchema } from "../schemas/bookings";
import * as bookings from "../services/bookings";

export async function createBooking(req: Request, res: Response): Promise<void> {
  const input = createBookingSchema.parse(req.body);
  res.status(201).json({ data: await bookings.createBookingRequest(input) });
}

export async function getBooking(req: Request, res: Response): Promise<void> {
  const { code } = bookingCodeParamsSchema.parse(req.params);
  res.json({ data: await bookings.getBookingByCode(code) });
}
