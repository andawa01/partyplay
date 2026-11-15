import type { Request, Response } from "express";

import {
  availabilityQuerySchema,
  calendarQuerySchema,
  packageAvailabilityQuerySchema,
} from "../schemas/availability";
import { slugParamsSchema } from "../schemas/common";
import * as availability from "../services/availability";

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const query = availabilityQuerySchema.parse(req.query);
  res.json(await availability.getPublicAvailability(query));
}

export async function getPackageAvailability(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamsSchema.parse(req.params);
  const query = packageAvailabilityQuerySchema.parse(req.query);
  res.json(await availability.getPackageAvailability(slug, query));
}

export async function getCalendar(req: Request, res: Response): Promise<void> {
  const query = calendarQuerySchema.parse(req.query);
  res.json(await availability.getEquipmentCalendar(query.equipmentId, query.month));
}
