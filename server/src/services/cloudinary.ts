import { v2 as cloudinary } from "cloudinary";

import { ApiError } from "../lib/api-error";

export const IMAGE_UPLOAD_KINDS = ["equipment", "packages"] as const;
export type ImageUploadKind = (typeof IMAGE_UPLOAD_KINDS)[number];

export const IMAGE_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
export const IMAGE_MAX_FILE_SIZE = 8 * 1024 * 1024;

interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  baseFolder: string;
}

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

function readSettings(): CloudinarySettings {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const baseFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "partyplay").replace(
    /^\/+|\/+$/g,
    "",
  );

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, "CLOUDINARY_NOT_CONFIGURED", "Image uploads are not configured yet.");
  }

  return { cloudName, apiKey, apiSecret, baseFolder };
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function folderFor(settings: CloudinarySettings, kind: ImageUploadKind): string {
  return `${settings.baseFolder}/${kind}`;
}

export function isManagedImagePublicId(publicId: string): boolean {
  const baseFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "partyplay").replace(
    /^\/+|\/+$/g,
    "",
  );
  return publicId.startsWith(`${baseFolder}/`);
}

/**
 * The browser sends these exact signed fields back to Cloudinary. Changing any of them
 * invalidates the signature; the API secret never leaves the server.
 */
export function createImageUploadSignature(kind: ImageUploadKind): ImageUploadSignature {
  const settings = readSettings();
  const folder = folderFor(settings, kind);
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    timestamp,
    allowed_formats: IMAGE_ALLOWED_FORMATS.join(","),
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, settings.apiSecret);

  return {
    cloudName: settings.cloudName,
    apiKey: settings.apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${settings.cloudName}/image/upload`,
    allowedFormats: [...IMAGE_ALLOWED_FORMATS],
    // Enforced in the browser before uploading; Cloudinary's signed upload API does not
    // expose a per-request file-size parameter.
    maxFileSize: IMAGE_MAX_FILE_SIZE,
  };
}

/**
 * Only assets inside our configured folder may be destroyed. Failures are logged and
 * ignored so a Cloudinary outage cannot roll back or block a catalogue write.
 */
export async function destroyManagedImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId || !isManagedImagePublicId(publicId)) {
    return;
  }

  try {
    const settings = readSettings();
    cloudinary.config({
      cloud_name: settings.cloudName,
      api_key: settings.apiKey,
      api_secret: settings.apiSecret,
    });
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error(`Could not delete Cloudinary image ${publicId}`, error);
  }
}
