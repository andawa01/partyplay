import type { Request, Response } from "express";

import * as site from "../services/site";

export async function getSite(_req: Request, res: Response): Promise<void> {
  res.json({ data: await site.getPublicSite() });
}
