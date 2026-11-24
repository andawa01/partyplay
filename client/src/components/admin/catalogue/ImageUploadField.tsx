import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { useUploadImage } from "../../../hooks/use-admin-catalogue";
import { IMAGE_ACCEPT, validateImageFile, type ImageUploadKind } from "../../../lib/image-upload";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";

export function ImageUploadField({
  id,
  kind,
  imageUrl,
  onChange,
  onUploadingChange,
  error,
}: {
  id: string;
  kind: ImageUploadKind;
  imageUrl: string;
  onChange: (imageUrl: string | null, imagePublicId: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [localError, setLocalError] = useState<string | null>(null);

  const visibleError = localError ?? error;
  const busy = upload.isPending;

  function chooseFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    upload.reset();
    onUploadingChange?.(true);
    upload.mutate(
      { file, kind },
      {
        onSuccess: (uploaded) => {
          onChange(uploaded.imageUrl, uploaded.imagePublicId);
        },
        onError: (uploadError) => {
          setLocalError(
            uploadError instanceof Error
              ? uploadError.message
              : "The image could not be uploaded. Try again.",
          );
        },
        onSettled: () => {
          onUploadingChange?.(false);
        },
      },
    );
  }

  return (
    <div>
      <Label htmlFor={id}>Image</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        aria-invalid={Boolean(visibleError)}
        aria-describedby={visibleError ? `${id}-error` : `${id}-hint`}
      />

      <div className="mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
        <div className="relative aspect-[16/9] w-full">
          {imageUrl ? (
            <img src={imageUrl} alt="Catalogue image preview" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-slate-400">
              <span className="flex flex-col items-center gap-2 text-xs">
                <ImageIcon aria-hidden="true" className="size-8" />
                No image yet
              </span>
            </div>
          )}

          {busy ? (
            <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm">
              <span className="flex items-center gap-2 text-sm font-medium text-brand-800">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Uploading…
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white p-3">
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-slate-500">
            JPG, PNG or WebP up to 8 MB. Saved to Cloudinary.
          </p>
          <div className="flex gap-2">
            {imageUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-700 hover:bg-red-50"
                onClick={() => {
                  setLocalError(null);
                  upload.reset();
                  onChange(null, null);
                }}
                disabled={busy}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <Upload aria-hidden="true" className="size-3.5" />
              )}
              {imageUrl ? "Replace image" : "Upload image"}
            </Button>
          </div>
        </div>
      </div>

      {visibleError ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
