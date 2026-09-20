import { api, ApiError } from "@/lib/api";

/**
 * Consultation media upload data access (Slice 7, task 13.2,
 * Requirements 12.5, 12.6).
 *
 * Uploading consultation media is a three-step chain against the
 * contract-frozen backend (Requirement 15):
 *
 * 1. **Presign** — `POST /v1/consultations/{consultationId}/media/upload-url`
 *    (contracts/openapi.yaml#createConsultationMediaUploadUrl) returns a
 *    short-lived presigned **POST** target: a `url` plus a set of `fields` that
 *    must be sent as multipart form data, along with the assigned `mediaId`.
 * 2. **Upload** — the file is POSTed directly to private S3 using the presigned
 *    `url`/`fields` as multipart `form-data` (the file part **last**, as S3
 *    requires). This call does **not** go through the API client and carries no
 *    Authorization header — the presigned policy authorizes it.
 * 3. **Confirm** — `POST /v1/consultations/{consultationId}/media/{mediaId}/confirm`
 *    (contracts/openapi.yaml#confirmConsultationMediaUpload) verifies the object
 *    in S3 and flips the media record to `confirmed`.
 *
 * The whole operation is atomic from the user's perspective: a failure at *any*
 * step is a failure of the whole upload — an error is surfaced and the media is
 * **not** shown as uploaded (Requirement 12.6). Only a confirm response with
 * `status === "confirmed"` counts as a successful upload (Requirement 12.5).
 *
 * No endpoint, request field, or envelope is modified here — the backend
 * contract is frozen.
 */

/**
 * Content types the backend accepts for consultation media
 * (contracts/openapi.yaml#MediaUploadUrlRequest). Mirrored here so the UI can
 * constrain the file picker before requesting a presigned URL.
 */
export const ALLOWED_MEDIA_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type MediaContentType = (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number];

/** The single supported upload purpose (contract default). */
export const MEDIA_PURPOSE = "consultation_attachment" as const;

/** True iff `value` is a content type the backend will accept. */
export function isAllowedMediaContentType(value: string): value is MediaContentType {
  return (ALLOWED_MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * `data` shape of a successful presign response
 * (contracts/openapi.yaml#MediaUploadUrlResponse).
 */
export interface MediaUploadUrlResponse {
  mediaId: string;
  /** Presigned POST endpoint URL (private S3). */
  url: string;
  /** Form fields that must accompany the multipart POST to S3. */
  fields: Record<string, string>;
  expiresIn: number;
  s3Key: string;
  contentType: string;
  purpose: string;
}

/**
 * `data` shape of a successful confirm response
 * (contracts/openapi.yaml#MediaConfirmResponse).
 */
export interface MediaConfirmResponse {
  mediaId: string;
  consultationId: string;
  status: "pending" | "confirmed";
  contentType: string;
  contentLength?: number;
  confirmedAt?: string;
}

/** Which step of the presign -> upload -> confirm chain failed. */
export type MediaUploadStep = "presign" | "upload" | "confirm";

/**
 * A typed failure of the media-upload chain. Carries the failing {@link step}
 * and a stable {@link code} so the UI can surface a defined error and keep the
 * media un-uploaded (Requirement 12.6). `message` is always non-empty.
 */
export class MediaUploadError extends Error {
  constructor(
    public readonly step: MediaUploadStep,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MediaUploadError";
  }
}

/** Generic, user-facing message used when a chain step fails without a better one. */
const STEP_FALLBACK_MESSAGE: Record<MediaUploadStep, string> = {
  presign: "Could not prepare the upload. Please try again.",
  upload: "The file could not be uploaded. Please try again.",
  confirm: "The upload could not be confirmed. Please try again.",
};

/**
 * Pure helper: normalise any thrown value from a chain step into a
 * {@link MediaUploadError} tagged with the failing `step`.
 *
 * - An {@link ApiError} (from the presign/confirm REST calls) keeps its `code`
 *   and `message` (falling back to a step message when the message is empty).
 * - An existing {@link MediaUploadError} is returned with its step preserved.
 * - Anything else (e.g. a network `TypeError`) maps to a generic step message.
 */
export function toMediaUploadError(step: MediaUploadStep, error: unknown): MediaUploadError {
  if (error instanceof MediaUploadError) {
    return error;
  }
  if (error instanceof ApiError) {
    return new MediaUploadError(
      step,
      error.code,
      error.message || STEP_FALLBACK_MESSAGE[step],
    );
  }
  return new MediaUploadError(step, "NETWORK_ERROR", STEP_FALLBACK_MESSAGE[step]);
}

/**
 * Step 1 — request a presigned upload target for consultation media.
 *
 * Calls `POST /v1/consultations/{consultationId}/media/upload-url` with a
 * UUID v4 `Idempotency-Key` (supplied by the API client, reused on retry via
 * `idempotencyKey`). Returns the presigned `url`/`fields` and assigned
 * `mediaId` on success.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function createMediaUploadUrl(
  consultationId: string,
  idToken: string,
  contentType: MediaContentType,
  idempotencyKey?: string,
): Promise<MediaUploadUrlResponse> {
  const res = await api.post<MediaUploadUrlResponse>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/media/upload-url`,
    idToken,
    { contentType, purpose: MEDIA_PURPOSE },
    idempotencyKey,
  );
  return res.data;
}

/**
 * Step 2 — upload the file directly to private S3 using the presigned POST.
 *
 * Builds a multipart `form-data` body from the presign `fields` (in order) with
 * the file appended **last**, as required by S3 POST policy uploads, and POSTs
 * it to the presigned `url`. This bypasses the API client: it is a direct call
 * to S3 and carries no Authorization header.
 *
 * @throws {MediaUploadError} (step `"upload"`) if S3 is unreachable or rejects
 *   the upload (non-2xx). A successful S3 POST typically returns `204`.
 */
export async function uploadFileToPresignedPost(
  presigned: Pick<MediaUploadUrlResponse, "url" | "fields">,
  file: Blob,
): Promise<void> {
  const form = new FormData();
  for (const [name, value] of Object.entries(presigned.fields)) {
    form.append(name, value);
  }
  // The file part MUST come after the policy fields for S3 POST uploads.
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(presigned.url, { method: "POST", body: form });
  } catch {
    throw new MediaUploadError(
      "upload",
      "STORAGE_UNREACHABLE",
      "Could not reach storage to upload the file. Please try again.",
    );
  }

  if (!res.ok) {
    throw new MediaUploadError(
      "upload",
      "STORAGE_REJECTED",
      `Storage rejected the upload (HTTP ${res.status}). Please try again.`,
    );
  }
}

/**
 * Step 3 — confirm the uploaded object so the backend marks it `confirmed`.
 *
 * Calls `POST /v1/consultations/{consultationId}/media/{mediaId}/confirm` with a
 * UUID v4 `Idempotency-Key` (reused on retry via `idempotencyKey`).
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function confirmMediaUpload(
  consultationId: string,
  mediaId: string,
  idToken: string,
  idempotencyKey?: string,
): Promise<MediaConfirmResponse> {
  const res = await api.post<MediaConfirmResponse>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/media/${encodeURIComponent(
      mediaId,
    )}/confirm`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}

/** Inputs for {@link uploadConsultationMedia}. */
export interface UploadConsultationMediaParams {
  consultationId: string;
  idToken: string;
  file: Blob;
  contentType: MediaContentType;
  /** Reused across retries of the *presign* step (one logical operation). */
  presignIdempotencyKey?: string;
  /** Reused across retries of the *confirm* step (one logical operation). */
  confirmIdempotencyKey?: string;
}

/**
 * Run the full media-upload chain: presign -> upload -> confirm.
 *
 * Returns the confirmed media record only when every step succeeds **and** the
 * confirm response reports `status === "confirmed"` (Requirement 12.5). A
 * failure at any step is surfaced as a {@link MediaUploadError} tagged with the
 * failing step and is *not* swallowed, so the caller can show an error and keep
 * the media un-uploaded (Requirement 12.6).
 *
 * @throws {MediaUploadError} on any step failure or an unconfirmed result.
 */
export async function uploadConsultationMedia(
  params: UploadConsultationMediaParams,
): Promise<MediaConfirmResponse> {
  const {
    consultationId,
    idToken,
    file,
    contentType,
    presignIdempotencyKey,
    confirmIdempotencyKey,
  } = params;

  // Step 1: presign.
  let presigned: MediaUploadUrlResponse;
  try {
    presigned = await createMediaUploadUrl(
      consultationId,
      idToken,
      contentType,
      presignIdempotencyKey,
    );
  } catch (err) {
    throw toMediaUploadError("presign", err);
  }

  // Step 2: upload to S3 (uploadFileToPresignedPost already throws MediaUploadError).
  try {
    await uploadFileToPresignedPost(presigned, file);
  } catch (err) {
    throw toMediaUploadError("upload", err);
  }

  // Step 3: confirm.
  let confirmed: MediaConfirmResponse;
  try {
    confirmed = await confirmMediaUpload(
      consultationId,
      presigned.mediaId,
      idToken,
      confirmIdempotencyKey,
    );
  } catch (err) {
    throw toMediaUploadError("confirm", err);
  }

  // A response that does not report `confirmed` must not be treated as uploaded.
  if (confirmed.status !== "confirmed") {
    throw new MediaUploadError(
      "confirm",
      "MEDIA_NOT_CONFIRMED",
      "The upload could not be confirmed. Please try again.",
    );
  }

  return confirmed;
}

/** Re-export so callers can narrow REST errors without importing the client. */
export { ApiError };
