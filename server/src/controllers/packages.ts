import type { Request, Response } from "express";

import { slugParamsSchema } from "../schemas/common";
import * as packages from "../services/packages";

export async function listPackages(_req: Request, res: Response): Promise<void> {
  res.json({ data: await packages.listPackages() });
}

export async function getPackage(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamsSchema.parse(req.params);
  res.json({ data: await packages.getPackageBySlug(slug) });
}
