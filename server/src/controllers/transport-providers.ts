import type { Request, Response } from "express";

import { idParamsSchema } from "../schemas/common";
import {
  createTransportProviderSchema,
  updateTransportProviderSchema,
} from "../schemas/transport-providers";
import * as providers from "../services/transport-providers";

export async function listTransportProviders(_req: Request, res: Response): Promise<void> {
  res.json({ data: await providers.listTransportProviders() });
}

export async function createTransportProvider(req: Request, res: Response): Promise<void> {
  const input = createTransportProviderSchema.parse(req.body);
  res.status(201).json({ data: await providers.createTransportProvider(input) });
}

export async function updateTransportProvider(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateTransportProviderSchema.parse(req.body);
  res.json({ data: await providers.updateTransportProviderById(id, input) });
}

export async function deleteTransportProvider(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  await providers.deleteTransportProviderById(id);
  res.status(204).send();
}
