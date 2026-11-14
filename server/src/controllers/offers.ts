import type { Request, Response } from "express";

import { idParamsSchema } from "../schemas/common";
import { createOfferSchema, updateOfferSchema } from "../schemas/offers";
import * as offers from "../services/offers";

export async function listOffers(_req: Request, res: Response): Promise<void> {
  res.json({ data: await offers.listOffers() });
}

export async function listAdminOffers(_req: Request, res: Response): Promise<void> {
  res.json({ data: await offers.listAdminOffers() });
}

export async function createOffer(req: Request, res: Response): Promise<void> {
  const input = createOfferSchema.parse(req.body);
  res.status(201).json({ data: await offers.createOffer(input) });
}

export async function updateOffer(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateOfferSchema.parse(req.body);
  res.json({ data: await offers.updateOfferById(id, input) });
}

export async function deleteOffer(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  await offers.deleteOfferById(id);
  res.status(204).send();
}
