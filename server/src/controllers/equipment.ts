import type { Request, Response } from "express";

import { equipmentListQuerySchema } from "../schemas/catalogue";
import { slugParamsSchema } from "../schemas/common";
import * as equipment from "../services/equipment";

export async function listEquipment(req: Request, res: Response): Promise<void> {
  const query = equipmentListQuerySchema.parse(req.query);
  res.json(await equipment.listEquipment(query));
}

export async function getEquipment(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamsSchema.parse(req.params);
  res.json({ data: await equipment.getEquipmentBySlug(slug) });
}
