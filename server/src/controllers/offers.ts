import type { Request, Response } from "express";

import * as offers from "../services/offers";

export async function listOffers(_req: Request, res: Response): Promise<void> {
  res.json({ data: await offers.listOffers() });
}
