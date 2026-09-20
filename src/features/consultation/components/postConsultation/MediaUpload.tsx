"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Paperclip, UploadCloud } from "lucide-react";

import AppButton from "@/components/primitives/AppButton";
import { Spinner } from "@/components/ui/spinner";
import { useMediaUpload } from "@/features/consultation/hooks/useMediaUpload";
import {
  ALLOWED_MEDIA_CONTENT_TYPES,
  isAllowedMediaContentType,
} from "@/features/consultation/lib/api/mediaUpload";

/** File picker `accept` attribute derived from the contract's allowed types. */
const ACCEPT_ATTR = ALLOWED_MEDIA_CONTENT_TYPES.join(",");

export interface MediaUploadProps {
  /** The consultation the uploaded media is scoped to. */
  consultationId: string;
}

/**
 * Consultation media upload control (Slice 7, task 13.2, Requirements 12.5, 12.6).
 *
 * Picks a file, then runs the presign -> upload -> confirm chain via
 * {@link useMediaUpload}. On success it shows a confirmed-upload state
 * (Requirement 12.5); if any step fails it shows an error and never presents the
 * media as uploaded (Requirement 12.6), keeping a retry available.
 */
export function MediaUpload({ consultationId }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const { upload, reset, status, confirmed, error, isUploading } =
    useMediaUpload(consultationId);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setTypeError(null);
    reset();
    if (file && !isAllowedMediaContentType(file.type)) {
      setSelected(null);
      setTypeError(
        "Unsupported file type. Allowed: JPEG, PNG, WebP, or PDF.",
      );
      return;
    }
    setSelected(file);
  }

  async function onUpload() {
    if (!selected) return;
    await upload(selected);
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2">
        <Paperclip className="size-5 text-primary" />
        <span className="text-lg font-bold">Attachments</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="text-sm"
        onChange={onPick}
        aria-label="Choose consultation media file"
      />

      {typeError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {typeError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <AppButton
          type="button"
          onClick={onUpload}
          disabled={!selected || isUploading}
        >
          {isUploading ? (
            <>
              <Spinner /> Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="size-4" /> Upload
            </>
          )}
        </AppButton>
        {selected && !isUploading && status !== "confirmed" && (
          <span className="truncate text-sm text-muted-foreground">
            {selected.name}
          </span>
        )}
      </div>

      {status === "confirmed" && confirmed && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-green-600"
        >
          <CheckCircle2 className="size-4" />
          Upload confirmed ({confirmed.contentType}).
        </p>
      )}

      {status === "error" && error && (
        <div role="alert" className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4" />
            Upload failed: {error.message}
          </p>
          <AppButton
            type="button"
            variant="outline"
            className="self-start"
            onClick={onUpload}
            disabled={!selected}
          >
            Retry
          </AppButton>
        </div>
      )}
    </div>
  );
}

export default MediaUpload;
