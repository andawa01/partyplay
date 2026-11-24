import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createImageUploadSignature,
  isCloudinaryConfigured,
  isManagedImagePublicId,
} from "./cloudinary";

function configured() {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "partyplay-demo");
  vi.stubEnv("CLOUDINARY_API_KEY", "123456789");
  vi.stubEnv("CLOUDINARY_API_SECRET", "test-secret");
  vi.stubEnv("CLOUDINARY_UPLOAD_FOLDER", "partyplay");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Cloudinary image uploads", () => {
  it("reports missing configuration instead of exposing a half-configured upload", () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    expect(isCloudinaryConfigured()).toBe(false);
    expect(() => createImageUploadSignature("equipment")).toThrow(
      "Image uploads are not configured yet.",
    );
  });

  it("signs the folder, timestamp and allowed formats for the requested kind", () => {
    configured();
    const signature = createImageUploadSignature("packages");

    expect(signature.cloudName).toBe("partyplay-demo");
    expect(signature.apiKey).toBe("123456789");
    expect(signature.folder).toBe("partyplay/packages");
    expect(signature.uploadUrl).toBe(
      "https://api.cloudinary.com/v1_1/partyplay-demo/image/upload",
    );
    expect(signature.allowedFormats).toEqual(["jpg", "jpeg", "png", "webp"]);
    expect(signature.maxFileSize).toBe(8 * 1024 * 1024);
    expect(signature.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(signature).not.toHaveProperty("apiSecret");
  });

  it("only treats assets inside the configured folder as managed", () => {
    vi.stubEnv("CLOUDINARY_UPLOAD_FOLDER", "partyplay");
    expect(isManagedImagePublicId("partyplay/equipment/chairs")).toBe(true);
    expect(isManagedImagePublicId("other-folder/chairs")).toBe(false);
    expect(isManagedImagePublicId("partyplay")).toBe(false);
  });
});
