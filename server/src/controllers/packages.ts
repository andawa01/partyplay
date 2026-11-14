import type { Request, Response } from "express";

import { idParamsSchema, slugParamsSchema } from "../schemas/common";
import { createPackageSchema, packageItemsSchema, updatePackageSchema } from "../schemas/packages";
import * as packages from "../services/packages";

export async function listPackages(_req: Request, res: Response): Promise<void> {
  res.json({ data: await packages.listPackages() });
}

export async function getPackage(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamsSchema.parse(req.params);
  res.json({ data: await packages.getPackageBySlug(slug) });
}

export async function listAdminPackages(_req: Request, res: Response): Promise<void> {
  res.json({ data: await packages.listAdminPackages() });
}

export async function getAdminPackage(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  res.json({ data: await packages.getAdminPackageById(id) });
}

export async function createPackage(req: Request, res: Response): Promise<void> {
  const input = createPackageSchema.parse(req.body);
  res.status(201).json({ data: await packages.createPackage(input) });
}

export async function updatePackage(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = updatePackageSchema.parse(req.body);
  res.json({ data: await packages.updatePackageById(id, input) });
}

export async function deletePackage(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  await packages.deletePackageById(id);
  res.status(204).send();
}

export async function replacePackageItems(req: Request, res: Response): Promise<void> {
  const { id } = idParamsSchema.parse(req.params);
  const input = packageItemsSchema.parse(req.body);
  res.json({ data: await packages.replacePackageItems(id, input) });
}
