import { api, ApiError } from "@/lib/api";
import type { BookingDetail } from "./bookingDetail";

/**
 * Payment-proof data access (patient submission + staff review).
 *
 * This is the manual "upload proof of payment" flow against the contract-frozen
 * backend (contracts/openapi.yaml, tag `PaymentProof`). It is independent of the
 * PayRex card gateway and is the path that advances a booking out of
 * `pending_payment`:
 *
 *   pending_payment --(patient submits proof)--> payment_submitted
 *   payment_submitted --(staff confirms)-------> confirmed
 *   payment_submitted --(staff rejects)--------> pending_payment
 *
 * Patient submission is a three-step chain:
 * 1. **Presign** — `POST /v1/bookings/{bookingId}/payment-proof/upload-url`
 *    `{ contentType }` -> `{ uploadUrl (presigned PUT), uploadId, expiresIn, proofKey }`.
 * 2. **Upload** — `PUT` the file bytes directly to the presigned S3 `uploadUrl`
 *    (no Authorization header; the presigned policy authorizes it).
 * 3. **Confirm** — `POST /v1/bookings/{bookingId}/payment-proof/confirm`
 *    `{ uploadId }` -> updated `Booking` (now `payment_submitted`).
 *
 * A failure at any step is a failure of the whole submission — the proof is not
 * shown as submitted. No endpoint, request field, or envelope is changed here.
 */

/** Content types the backend accepts for a payment proof image. */
export const ALLOWED_PROOF_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProofContentType = (typeof ALLOWED_PROOF_CONTENT_TYPES)[number];

/** True iff `value` is a content type the backend will accept for a proof. */
export function isAllowedProofContentType(value: string): value is ProofContentType {
  return (ALLOWED_PROOF_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Staff review decision (contract: PaymentProofReviewRequest). */
export type PaymentProofDecision = "confirmed" | "rejected";

/** `data` of a successful presign (contract: PaymentProofUploadUrlResponse). */
export interface PaymentProofUploadUrlResponse {
  /** Presigned S3 PUT URL (expires in ~300s). */
  uploadUrl: string;
  /** Server-generated upload identifier echoed back on confirm. */
  uploadId: string;
  expiresIn: number;
  proofKey: string;
}

/** Which step of the presign -> upload -> confirm chain failed. */
export type PaymentProofStep = "presign" | "upload" | "confirm";

/**
 * A typed failure of the payment-proof submission chain, tagged with the failing
 * {@link step} and a stable {@link code}. `message` is always non-empty.
 */
export class PaymentProofError extends Error {
  constructor(
    public readonly step: PaymentProofStep,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentProofError";
  }
}

const STEP_FALLBACK_MESSAGE: Record<PaymentProofStep, string> = {
  presign: "Could not prepare the upload. Please try again.",
  upload: "The payment proof could not be uploaded. Please try again.",
  confirm: "The payment proof could not be submitted. Please try again.",
};

/** Normalise any thrown value from a chain step into a {@link PaymentProofError}. */
export function toPaymentProofError(
  step: PaymentProofStep,
  error: unknown,
): PaymentProofError {
  if (error instanceof PaymentProofError) return error;
  if (error instanceof ApiError) {
    return new PaymentProofError(
      step,
      error.code,
      error.message || STEP_FALLBACK_MESSAGE[step],
    );
  }
  return new PaymentProofError(step, "NETWORK_ERROR", STEP_FALLBACK_MESSAGE[step]);
}

/** Step 1 — request a presigned PUT URL for the payment proof image. */
export async function requestPaymentProofUploadUrl(
  bookingId: string,
  idToken: string,
  contentType: ProofContentType,
  idempotencyKey?: string,
): Promise<PaymentProofUploadUrlResponse> {
  const res = await api.post<PaymentProofUploadUrlResponse>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/payment-proof/upload-url`,
    idToken,
    { contentType },
    idempotencyKey,
  );
  return res.data;
}

/**
 * Step 2 — upload the file bytes directly to S3 via the presigned PUT URL.
 *
 * This bypasses the API client (no Authorization header); the presigned URL
 * authorizes the write. The `Content-Type` must match what was presigned.
 *
 * @throws {PaymentProofError} (step `"upload"`) if S3 is unreachable or rejects.
 */
export async function uploadProofToPresignedPut(
  uploadUrl: string,
  file: Blob,
  contentType: ProofContentType,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch {
    throw new PaymentProofError(
      "upload",
      "STORAGE_UNREACHABLE",
      "Could not reach storage to upload the payment proof. Please try again.",
    );
  }
  if (!res.ok) {
    throw new PaymentProofError(
      "upload",
      "STORAGE_REJECTED",
      `Storage rejected the upload (HTTP ${res.status}). Please try again.`,
    );
  }
}

/** Step 3 — confirm the upload; returns the updated booking (`payment_submitted`). */
export async function confirmPaymentProof(
  bookingId: string,
  idToken: string,
  uploadId: string,
  idempotencyKey?: string,
): Promise<BookingDetail> {
  const res = await api.post<BookingDetail>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/payment-proof/confirm`,
    idToken,
    { uploadId },
    idempotencyKey,
  );
  return res.data;
}

/** Inputs for {@link submitPaymentProof}. */
export interface SubmitPaymentProofParams {
  bookingId: string;
  idToken: string;
  file: Blob;
  contentType: ProofContentType;
  /** Reused across retries of the *presign* step (one logical submission). */
  presignIdempotencyKey?: string;
  /** Reused across retries of the *confirm* step (one logical submission). */
  confirmIdempotencyKey?: string;
}

/**
 * Run the full payment-proof submission: presign -> PUT upload -> confirm.
 *
 * Returns the updated booking (now `payment_submitted`) only when every step
 * succeeds. A failure at any step is surfaced as a {@link PaymentProofError}
 * tagged with the failing step and is not swallowed.
 *
 * @throws {PaymentProofError} on any step failure.
 */
export async function submitPaymentProof(
  params: SubmitPaymentProofParams,
): Promise<BookingDetail> {
  const {
    bookingId,
    idToken,
    file,
    contentType,
    presignIdempotencyKey,
    confirmIdempotencyKey,
  } = params;

  let presigned: PaymentProofUploadUrlResponse;
  try {
    presigned = await requestPaymentProofUploadUrl(
      bookingId,
      idToken,
      contentType,
      presignIdempotencyKey,
    );
  } catch (err) {
    throw toPaymentProofError("presign", err);
  }

  try {
    await uploadProofToPresignedPut(presigned.uploadUrl, file, contentType);
  } catch (err) {
    throw toPaymentProofError("upload", err);
  }

  try {
    return await confirmPaymentProof(
      bookingId,
      idToken,
      presigned.uploadId,
      confirmIdempotencyKey,
    );
  } catch (err) {
    throw toPaymentProofError("confirm", err);
  }
}

/**
 * Staff review action: confirm or reject a submitted payment proof.
 *
 * `confirmed` advances the booking to `confirmed`; `rejected` returns it to
 * `pending_payment`. Requires `doctor` (assigned) or `admin` role.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function reviewPaymentProof(
  bookingId: string,
  idToken: string,
  decision: PaymentProofDecision,
  idempotencyKey?: string,
): Promise<BookingDetail> {
  const res = await api.post<BookingDetail>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/payment-proof/review`,
    idToken,
    { decision },
    idempotencyKey,
  );
  return res.data;
}

export { ApiError };
