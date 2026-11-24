import { z } from "zod";

import { IMAGE_UPLOAD_KINDS } from "../services/cloudinary";

export const imageUploadKindSchema = z.enum(IMAGE_UPLOAD_KINDS);

export const signImageUploadSchema = z.object({
  kind: imageUploadKindSchema,
});

export type SignImageUploadInput = z.infer<typeof signImageUploadSchema>;
