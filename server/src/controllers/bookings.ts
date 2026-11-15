import type { Request, Response } from "express";

import { createBookingSchema } from "../schemas/bookings";
import * as bookings from "../services/bookings";

export async function createBooking(req: Request, res: Response): Promise<void> {
  const input = createBookingSchema.parse(req.body);
  res.status(201).json({ data: await bookings.createBookingRequest(input) });
}
