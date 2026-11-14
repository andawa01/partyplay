import type { Request, Response } from "express";

import { equipmentListQuerySchema } from "../schemas/catalogue";
import { idParamsSchema, slugParamsSchema } from "../schemas/common";
import {
  createEquipmentSchema,
  inventorySchema,
  updateEquipmentSchema,
} from "../schemas/equipment";
import * as equipment from "../services/equipment";

export async function listEquipment(req: Request, res: Response): Promise<void> {
  const query = equipmentListQuerySchema.parse(req.query);
  res.json(await equipment.listEquipment(query));
}

export async function getEquipment(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamsSchema.parse(req.params);
  res.json({ data: await equipment.getEquipmentBySlug(slug) });
}

export async function listAdminEquipment(req: Request, res: Response): Promise<void> {
  const query = equipmentListQuerySchema.parse(req.query);
  res.json(await equipment.listAdminEquipment(query));
}

export async function getAdminEquipment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await equipment.getAdminEquipmentById(id) });
}

export async function createEquipment(req: Request, res: Response): Promise<void> {
  const input = createEquipmentSchema.parse(req.body);
  res.status(201).json({ data: await equipment.createEquipment(input) });
}

export async function updateEquipment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateEquipmentSchema.parse(req.body);
  res.json({ data: await equipment.updateEquipmentById(id, input) });
}

export async function deactivateEquipment(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  await equipment.deactivateEquipmentById(id);
  res.status(204).send();
}

export async function setInventory(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const { total } = inventorySchema.parse(req.body);
  res.json({ data: await equipment.setInventoryTotal(id, total) });
}
