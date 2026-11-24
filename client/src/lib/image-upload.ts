import { apiFetch } from "./api";

export type ImageUploadKind = "equipment" | "packages";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

export interface ImageUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
  allowedFormats: string[];
  maxFileSize: number;
}

export interface UploadedImage {
  imageUrl: string;
  imagePublicId: string;
  width: number | null;
  height: number | null;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  error?: { message?: string };
}

export function validateImageFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeAllowed = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const extensionAllowed = (IMAGE_FORMATS as readonly string[]).includes(extension);
  if (!mimeAllowed && !extensionAllowed) {
    return "Choose a JPG, PNG or WebP image.";
  }
  if (file.size > 8 * 1024 * 1024) {
    return "Choose an image smaller than 8 MB.";
  }
  return null;
}

export async function uploadCatalogueImage(
  file: File,
  kind: ImageUploadKind,
): Promise<UploadedImage> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const { data: signature } = await apiFetch<ImageUploadSignature>("/api/admin/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ kind }),
  });

  if (file.size > signature.maxFileSize) {
    throw new Error(
      `Choose an image smaller than ${Math.round(signature.maxFileSize / 1024 / 1024)} MB.`,
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("folder", signature.folder);
  form.append("allowed_formats", signature.allowedFormats.join(","));
  form.append("signature", signature.signature);

  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Cloudinary could not accept this image.");
  }
  if (!body.secure_url || !body.public_id) {
    throw new Error("Cloudinary returned an incomplete image response.");
  }

  return {
    imageUrl: body.secure_url,
    imagePublicId: body.public_id,
    width: body.width ?? null,
    height: body.height ?? null,
  };
}
