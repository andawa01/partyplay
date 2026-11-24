import type { Request, Response } from "express";

import { signImageUploadSchema } from "../schemas/uploads";
import { createImageUploadSignature } from "../services/cloudinary";

export async function signImageUpload(req: Request, res: Response): Promise<void> {
  const { kind } = signImageUploadSchema.parse(req.body);
  res.json({ data: createImageUploadSignature(kind) });
}
