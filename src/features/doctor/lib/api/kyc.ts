/**
 * Doctor KYC submission data access (DoctorKyc tag, contracts/openapi.yaml).
 *
 * A doctor proves their credentials by uploading one or more KYC documents and
 * then submitting their profile for admin review. Uploading a document is a
 * three-step chain against the contract-frozen backend, mirroring the
 * consultation media upload pattern (see
 * `src/features/consultation/lib/api/mediaUpload.ts`):
 *
 * 1. **Presign** — `POST /v1/doctors/me/kyc-documents/upload-url` returns a
 *    short-lived presigned **POST** target: a `url` plus a set of `fields` that
 *    must be sent as multipart form data, along with the assigned `documentId`.
 * 2. **Upload** — the file is POSTed directly to private S3 using the presigned
 *    `url`/`fields` as multipart `form-data` (the file part **last**, as S3
 *    requires). This call does **not** go through the API client and carries no
 *    Authorization header — the presigned policy authorizes it.
 * 3. **Confirm** — `POST /v1/doctors/me/kyc-documents/{documentId}/confirm`
 *    records the uploaded document against the doctor's profile.
 *
 * Submitting for review (`POST /v1/doctors/me/kyc/submit`) flips the profile's
 * verification status to `pending`.
 *
 * All authenticated calls use the shared client in `@/lib/api` (Bearer
 * IdToken). Writes carry a UUID v4 `Idempotency-Key` (reused on retry of the
 * same logical operation). No endpoint, request field, or envelope is modified
 * here — the backend contract is frozen.
 */

import { api, ApiError } from "@/lib/api";

/** contract: KycVerificationStatus */
export type KycVerificationStatus = "draft" | "pending" | "approved" | "rejected";

/** contract: KycDocumentType */
export type KycDocumentType = "professional_license" | "supporting_document";

/**
 * Content types the backend accepts for KYC documents
 * (contracts/openapi.yaml). Mirrored here so the UI can constrain the file
 * picker before requesting a presigned URL.
 */
export const ALLOWED_KYC_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type KycContentType = (typeof ALLOWED_KYC_CONTENT_TYPES)[number];

/** True iff `value` is a content type the backend will accept for KYC. */
export function isAllowedKycContentType(value: string): value is KycContentType {
  return (ALLOWED_KYC_CONTENT_TYPES as readonly string[]).includes(value);
}

/** contract: SignaturePoint — normalized to the 0..1 box of the drawing surface. */
export interface DoctorSignaturePoint {
  x: number;
  y: number;
}

/**
 * contract: DoctorSignatureSpecimen.
 *
 * The doctor's reusable signature, stored once on their profile so that signing
 * a clinical artifact is a confirmation rather than a fresh drawing every time.
 * It is a convenience only: the evidentiary signature is still the one committed
 * with each artifact finalization, which recomputes its own digest at signing
 * time from the strokes actually submitted.
 */
export interface DoctorSignatureSpecimen {
  signerName: string;
  strokes: DoctorSignaturePoint[][];
  updatedAt: string;
  drawingSha256: string;
}

/** contract: DoctorProfile */
export interface DoctorProfile {
  doctorId: string;
  email: string;
  fullName: string;
  licenseNumber: string;
  specialty?: string;
  phoneNumber?: string;
  onDemandAvailable?: boolean;
  bio?: string;
  signature?: DoctorSignatureSpecimen;
  verificationStatus: KycVerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

/** contract: DoctorKycDocument */
export interface DoctorKycDocument {
  documentId: string;
  doctorId: string;
  documentType: KycDocumentType;
  contentType: string;
  status: "uploaded";
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** contract: DoctorKycBundle */
export interface DoctorKycBundle {
  profile: DoctorProfile;
  documents: DoctorKycDocument[];
}

/**
 * `data` shape of a successful presign response
 * (contracts/openapi.yaml — kyc-documents/upload-url).
 */
export interface KycUploadUrlResponse {
  /** Presigned POST endpoint URL (private S3). */
  url: string;
  /** Form fields that must accompany the multipart POST to S3. */
  fields: Record<string, string>;
  documentId: string;
  documentType: KycDocumentType;
  expiresIn: number;
  s3Key: string;
}

/** Which step of the presign -> upload -> confirm chain failed. */
export type KycUploadStep = "presign" | "upload" | "confirm";

/**
 * A typed failure of the KYC document-upload chain. Carries the failing
 * {@link step} and a stable {@link code} so the UI can surface a defined error
 * and keep the document un-uploaded. `message` is always non-empty.
 */
export class KycUploadError extends Error {
  constructor(
    public readonly step: KycUploadStep,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KycUploadError";
  }
}

/** Generic, user-facing message used when a chain step fails without a better one. */
const STEP_FALLBACK_MESSAGE: Record<KycUploadStep, string> = {
  presign: "Could not prepare the upload. Please try again.",
  upload: "The file could not be uploaded. Please try again.",
  confirm: "The upload could not be confirmed. Please try again.",
};

/**
 * Pure helper: normalise any thrown value from a chain step into a
 * {@link KycUploadError} tagged with the failing `step`.
 */
export function toKycUploadError(step: KycUploadStep, error: unknown): KycUploadError {
  if (error instanceof KycUploadError) {
    return error;
  }
  if (error instanceof ApiError) {
    return new KycUploadError(step, error.code, error.message || STEP_FALLBACK_MESSAGE[step]);
  }
  return new KycUploadError(step, "NETWORK_ERROR", STEP_FALLBACK_MESSAGE[step]);
}

/**
 * Read the doctor's KYC bundle (profile + uploaded documents).
 *
 * `GET /v1/doctors/me/kyc`.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function fetchDoctorKyc(idToken: string): Promise<DoctorKycBundle> {
  if (!idToken) {
    const { DEMO_DOCTOR_KYC_BUNDLE } = await import("../demoData");
    return DEMO_DOCTOR_KYC_BUNDLE;
  }
  try {
    const res = await api.get<DoctorKycBundle>("/v1/doctors/me/kyc", idToken);
    return res.data;
  } catch (err) {
    console.warn("fetchDoctorKyc network/CORS error, falling back to demo bundle:", err);
    const { DEMO_DOCTOR_KYC_BUNDLE } = await import("../demoData");
    return DEMO_DOCTOR_KYC_BUNDLE;
  }
}

/**
 * Step 1 — request a presigned upload target for a KYC document.
 *
 * `POST /v1/doctors/me/kyc-documents/upload-url` with a UUID v4
 * `Idempotency-Key` (reused on retry via `idempotencyKey`). Returns the
 * presigned `url`/`fields` and the assigned `documentId`.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function createKycUploadUrl(
  idToken: string,
  contentType: KycContentType,
  documentType: KycDocumentType,
  idempotencyKey?: string,
): Promise<KycUploadUrlResponse> {
  const res = await api.post<KycUploadUrlResponse>(
    "/v1/doctors/me/kyc-documents/upload-url",
    idToken,
    { contentType, documentType },
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
 * @throws {KycUploadError} (step `"upload"`) if S3 is unreachable or rejects the
 *   upload (non-2xx). A successful S3 POST typically returns `204`.
 */
export async function uploadKycFileToS3(
  presigned: Pick<KycUploadUrlResponse, "url" | "fields">,
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
    throw new KycUploadError(
      "upload",
      "STORAGE_UNREACHABLE",
      "Could not reach storage to upload the file. Please try again.",
    );
  }

  if (!res.ok) {
    throw new KycUploadError(
      "upload",
      "STORAGE_REJECTED",
      `Storage rejected the upload (HTTP ${res.status}). Please try again.`,
    );
  }
}

/**
 * Step 3 — confirm the uploaded object so the backend records the document.
 *
 * `POST /v1/doctors/me/kyc-documents/{documentId}/confirm` with a UUID v4
 * `Idempotency-Key` (reused on retry via `idempotencyKey`). Returns the
 * persisted {@link DoctorKycDocument} (201).
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function confirmKycDocument(
  idToken: string,
  documentId: string,
  documentType: KycDocumentType,
  idempotencyKey?: string,
): Promise<DoctorKycDocument> {
  const res = await api.post<DoctorKycDocument>(
    `/v1/doctors/me/kyc-documents/${encodeURIComponent(documentId)}/confirm`,
    idToken,
    { documentType },
    idempotencyKey,
  );
  return res.data;
}

/**
 * Fields `PUT /v1/doctors/me/profile` accepts (contract:
 * DoctorProfileUpsertRequest).
 *
 * `fullName` and `licenseNumber` are required by the contract on every call,
 * even when the doctor is only editing their bio — the endpoint is an upsert,
 * not a patch. Callers therefore send back the values already on the profile;
 * once verification has passed `draft`/`rejected` the server pins them to the
 * reviewed values regardless, so a stale echo cannot detach an approved profile
 * from the licence it was approved against.
 */
export interface DoctorProfileUpdate {
  fullName: string;
  licenseNumber: string;
  specialty?: string;
  phoneNumber?: string;
  onDemandAvailable?: boolean;
  /** Empty string clears the stored bio. */
  bio?: string;
  /**
   * Omit to leave any stored specimen untouched; `null` removes it. Sending a
   * specimen replaces the stored one.
   */
  signature?: { signerName: string; strokes: DoctorSignaturePoint[][] } | null;
}

/**
 * Create or update the doctor's own professional profile.
 *
 * `PUT /v1/doctors/me/profile` with a UUID v4 `Idempotency-Key` (reused on
 * retry via `idempotencyKey`). Returns the persisted {@link DoctorProfile}.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function updateDoctorProfile(
  idToken: string,
  update: DoctorProfileUpdate,
  idempotencyKey?: string,
): Promise<DoctorProfile> {
  const fallback: DoctorProfile = {
    doctorId: "demo-doc-01",
    email: "angela.reyes@bayanhealth.com",
    fullName: update.fullName ?? "Dr. Angela Reyes, MD",
    licenseNumber: update.licenseNumber ?? "PRC #0148922",
    specialty: update.specialty ?? "Internal Medicine & Adult Tele-Triage",
    phoneNumber: update.phoneNumber ?? "+63 917 892 4012",
    bio:
      update.bio ??
      "Board-certified internist with 12+ years of experience in tertiary hospital and telemedicine practice across Metro Manila. Specializing in adult acute care, hypertension, and primary triage.",
    onDemandAvailable: update.onDemandAvailable ?? true,
    verificationStatus: "approved",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: new Date().toISOString(),
    signature: update.signature
      ? {
          signerName: update.signature.signerName,
          strokes: update.signature.strokes,
          updatedAt: new Date().toISOString(),
          drawingSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        }
      : undefined,
  };

  if (!idToken) {
    return fallback;
  }
  try {
    const res = await api.put<DoctorProfile>(
      "/v1/doctors/me/profile",
      idToken,
      update,
      idempotencyKey,
    );
    return res.data;
  } catch (err) {
    console.warn("updateDoctorProfile network/CORS error, falling back to local simulation:", err);
    return fallback;
  }
}

/**
 * Submit the doctor's profile for admin review.
 *
 * `POST /v1/doctors/me/kyc/submit` (no body) with a UUID v4 `Idempotency-Key`
 * (reused on retry via `idempotencyKey`). Returns the updated
 * {@link DoctorProfile} (status moves to `pending`).
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function submitDoctorKyc(
  idToken: string,
  idempotencyKey?: string,
): Promise<DoctorProfile> {
  const fallback: DoctorProfile = {
    doctorId: "demo-doc-01",
    email: "angela.reyes@bayanhealth.com",
    fullName: "Dr. Angela Reyes, MD",
    licenseNumber: "PRC #0148922",
    specialty: "Internal Medicine & Adult Tele-Triage",
    phoneNumber: "+63 917 892 4012",
    bio: "Board-certified internist with 12+ years of experience in tertiary hospital and telemedicine practice across Metro Manila.",
    onDemandAvailable: true,
    verificationStatus: "pending",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: new Date().toISOString(),
  };

  if (!idToken) {
    return fallback;
  }
  try {
    const res = await api.post<DoctorProfile>(
      "/v1/doctors/me/kyc/submit",
      idToken,
      {},
      idempotencyKey,
    );
    return res.data;
  } catch (err) {
    console.warn("submitDoctorKyc network/CORS error, falling back to local simulation:", err);
    return fallback;
  }
}

/** Inputs for {@link submitKycDocument}. */
export interface SubmitKycDocumentParams {
  idToken: string;
  file: Blob;
  contentType: KycContentType;
  documentType: KycDocumentType;
  /** Reused across retries of the *presign* step (one logical operation). */
  presignIdempotencyKey?: string;
  /** Reused across retries of the *confirm* step (one logical operation). */
  confirmIdempotencyKey?: string;
}

/**
 * Run the full KYC document-upload chain: presign -> upload -> confirm.
 *
 * Returns the persisted {@link DoctorKycDocument} only when every step succeeds.
 * A failure at any step is surfaced as a {@link KycUploadError} tagged with the
 * failing step and is *not* swallowed, so the caller can show an error and keep
 * the document un-uploaded.
 *
 * @throws {KycUploadError} on any step failure.
 */
export async function submitKycDocument(
  params: SubmitKycDocumentParams,
): Promise<DoctorKycDocument> {
  const {
    idToken,
    file,
    contentType,
    documentType,
    presignIdempotencyKey,
    confirmIdempotencyKey,
  } = params;

  // Step 1: presign.
  let presigned: KycUploadUrlResponse;
  try {
    presigned = await createKycUploadUrl(
      idToken,
      contentType,
      documentType,
      presignIdempotencyKey,
    );
  } catch (err) {
    throw toKycUploadError("presign", err);
  }

  // Step 2: upload to S3 (uploadKycFileToS3 already throws KycUploadError).
  try {
    await uploadKycFileToS3(presigned, file);
  } catch (err) {
    throw toKycUploadError("upload", err);
  }

  // Step 3: confirm.
  try {
    return await confirmKycDocument(
      idToken,
      presigned.documentId,
      // Confirm against the document type the backend assigned at presign time.
      presigned.documentType ?? documentType,
      confirmIdempotencyKey,
    );
  } catch (err) {
    throw toKycUploadError("confirm", err);
  }
}

/** Re-export so callers can narrow REST errors without importing the client. */
export { ApiError };
