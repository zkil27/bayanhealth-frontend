"use client";

import { useCallback, useRef, useState } from "react";

import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  MediaUploadError,
  toMediaUploadError,
  uploadConsultationMedia,
  type MediaConfirmResponse,
  type MediaContentType,
} from "../lib/api/mediaUpload";

/**
 * Discrete states of a consultation media upload driven by the
 * presign -> upload -> confirm chain (Requirements 12.5, 12.6).
 *
 * - `idle`       — nothing uploaded yet, or a prior attempt failed; the media is
 *   NOT shown as uploaded.
 * - `uploading`  — the chain is in flight (any of presign / upload / confirm).
 * - `confirmed`  — every step succeeded and the backend reported `confirmed`;
 *   the confirmed-upload state is shown (Requirement 12.5).
 * - `error`      — a step failed; the media is NOT shown as uploaded and a
 *   defined error is available for display (Requirement 12.6).
 */
export type MediaUploadStatus = "idle" | "uploading" | "confirmed" | "error";

export interface UseMediaUpload {
  /** Run (or retry) the upload chain for `file`. Retries reuse idempotency keys. */
  upload: (file: File) => Promise<void>;
  /** Reset back to `idle`, discarding any confirmed/error result and minting fresh keys. */
  reset: () => void;
  /** Current upload status. */
  status: MediaUploadStatus;
  /** The confirmed media record, present only when `status === "confirmed"`. */
  confirmed: MediaConfirmResponse | null;
  /** The failure, present only when `status === "error"`. */
  error: MediaUploadError | null;
  /** Convenience flag: `true` only in the `confirmed` state. */
  isConfirmed: boolean;
  /** Convenience flag: `true` only while the chain is in flight. */
  isUploading: boolean;
}

/**
 * Wire consultation media upload to the presign -> upload -> confirm chain for a
 * given consultation.
 *
 * On success the media transitions to `confirmed` and the confirmed record is
 * exposed (Requirement 12.5). If any step fails, the status becomes `error`,
 * the media is kept un-uploaded (`confirmed` stays `null`), and a non-empty
 * {@link MediaUploadError} is exposed for display (Requirement 12.6).
 *
 * One UUID v4 `Idempotency-Key` is minted per write step (presign, confirm) and
 * reused across retries of the same logical upload, matching the write-retry
 * convention used across the app; both are reset after a confirmed upload or an
 * explicit {@link UseMediaUpload.reset}.
 *
 * @param consultationId - The consultation the media is scoped to.
 */
export function useMediaUpload(consultationId: string): UseMediaUpload {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const presignKey = useRef(createIdempotencyKeyManager());
  const confirmKey = useRef(createIdempotencyKeyManager());

  const [status, setStatus] = useState<MediaUploadStatus>("idle");
  const [confirmed, setConfirmed] = useState<MediaConfirmResponse | null>(null);
  const [error, setError] = useState<MediaUploadError | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setError(null);
      // A new attempt must never surface a stale "uploaded" result.
      setConfirmed(null);

      const contentType = file.type as MediaContentType;

      try {
        const result = await uploadConsultationMedia({
          consultationId,
          idToken: idToken ?? "",
          file,
          contentType,
          // Reuse the same keys across retries of this logical upload.
          presignIdempotencyKey: presignKey.current.current(),
          confirmIdempotencyKey: confirmKey.current.current(),
        });

        // Success: this logical upload is done — a fresh upload mints new keys.
        presignKey.current.reset();
        confirmKey.current.reset();
        setConfirmed(result);
        setStatus("confirmed");
      } catch (err) {
        // Keep the keys so an immediate retry is treated as the same operation.
        // Keep the media un-uploaded and surface the failure (Requirement 12.6).
        setConfirmed(null);
        setError(toMediaUploadError("upload", err));
        setStatus("error");
      }
    },
    [consultationId, idToken],
  );

  const reset = useCallback(() => {
    presignKey.current.reset();
    confirmKey.current.reset();
    setConfirmed(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    upload,
    reset,
    status,
    confirmed,
    error,
    isConfirmed: status === "confirmed",
    isUploading: status === "uploading",
  };
}
