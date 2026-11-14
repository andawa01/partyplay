import type { Request, Response } from "express";

import { unauthorized } from "../lib/api-error";
import { updateSettingsSchema } from "../schemas/settings";
import * as site from "../services/site";

export async function getSite(_req: Request, res: Response): Promise<void> {
  res.json({ data: await site.getPublicSite() });
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json({ data: await site.getAdminSettings() });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const admin = req.admin;
  if (!admin) {
    throw unauthorized("Authentication required");
  }

  const input = updateSettingsSchema.parse(req.body);
  res.json({ data: await site.updateSettings(admin.id, input) });
}
