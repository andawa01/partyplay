import type { Request, Response } from "express";

import { idParamsSchema } from "../schemas/common";
import { createBlackoutSchema } from "../schemas/blackouts";
import * as blackouts from "../services/blackouts";

export async function listBlackouts(_req: Request, res: Response): Promise<void> {
  res.json({ data: await blackouts.listBlackouts() });
}

export async function createBlackout(req: Request, res: Response): Promise<void> {
  const input = createBlackoutSchema.parse(req.body);
  res.status(201).json({ data: await blackouts.createBlackout(input) });
}

export async function deleteBlackout(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  await blackouts.deleteBlackout(id);
  res.status(204).send();
}
