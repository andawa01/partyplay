import type { Request, Response } from "express";

import { idParamsSchema } from "../schemas/common";
import { createStaffSchema, setStaffPasswordSchema, updateStaffSchema } from "../schemas/staff";
import * as staff from "../services/staff";

export async function listStaff(_req: Request, res: Response): Promise<void> {
  res.json({ data: await staff.listStaff() });
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  const input = createStaffSchema.parse(req.body);
  const created = await staff.createStaff(input);
  res.status(201).json({ data: created });
}

export async function updateStaff(req: Request, res: Response): Promise<void> {
  const actor = req.admin!;
  const { id } = idParamsSchema.parse(req.params);
  const input = updateStaffSchema.parse(req.body);
  const updated = await staff.updateStaff(actor.id, id, input);
  res.json({ data: updated });
}

export async function setStaffPassword(req: Request, res: Response): Promise<void> {
  const actor = req.admin!;
  const { id } = idParamsSchema.parse(req.params);
  const input = setStaffPasswordSchema.parse(req.body);
  await staff.setStaffPassword(actor.id, id, input);
  res.status(204).send();
}
