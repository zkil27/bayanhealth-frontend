import { api, ApiError, newCorrelationId } from "@/lib/api";

/**
 * Consultation document data access (Slice 7, task 13.1,
 * Requirements 12.1–12.4).
 *
 * Documents (notes, prescriptions, certificates, summaries, lab requests, and
 * recommendations) are backed by the contract-frozen endpoints
 * (contracts/openapi.yaml):
 *
 * - `POST /v1/consultations/{consultationId}/documents`              create draft
 * - `GET  /v1/consultations/{consultationId}/documents`              list
 * - `GET  /v1/consultations/{consultationId}/documents/{documentId}` read one
 * - `PUT  /v1/consultations/{consultationId}/documents/{documentId}` update /
 *   finalize / void
 *
 * Writes (`POST`/`PUT`) carry a UUID v4 `Idempotency-Key` supplied by the API
 * client (auto-generated when not provided, reused across retries of one
 * logical write) so a retried save or finalize is never duplicated
 * (Requirement 12.1). The backend contract is **not** modified here — it is
 * frozen (Requirement 15).
 *
 * Finalization is immutable on the backend: finalizing a document that is
 * already finalized fails the conditional write and surfaces as
 * `STATE_CONFLICT` (409). The caller resolves this by re-reading the existing
 * document and showing its finalized state, never producing a duplicate
 * (Requirement 12.4).
 */

/** Document categories the backend accepts (contracts/openapi.yaml#ConsultationDocumentType). */
export type ConsultationDocumentType =
  | "soap_note"
  | "prescription"
  | "medical_certificate"
  | "visit_summary"
  | "lab_request"
  | "lab_result"
  | "recommendation";

/** Lifecycle status of a document (contracts/openapi.yaml#ConsultationDocumentStatus). */
export type ConsultationDocumentStatus = "draft" | "finalized" | "voided";

export interface SignaturePoint {
  x: number;
  y: number;
}

export interface ElectronicSignatureRequest {
  signerName: string;
  acknowledged: true;
  strokes: SignaturePoint[][];
}

export interface ElectronicSignature extends ElectronicSignatureRequest {
  doctorId: string;
  signedAt: string;
  drawingSha256: string;
  method: "drawn_vector";
}

/**
 * Public consultation document shape
 * (contracts/openapi.yaml#ConsultationDocument). `verificationCode` is only
 * present on the response that finalizes a prescription and is never stored on
 * subsequent reads.
 */
export interface ConsultationDocument {
  documentId: string;
  consultationId: string;
  bookingId: string;
  patientId: string;
  doctorId: string;
  documentType: ConsultationDocumentType;
  status: ConsultationDocumentStatus;
  title: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  voidedAt?: string;
  signature?: ElectronicSignature;
  verificationCode?: string;
}

/** `data` shape of `GET /v1/consultations/{consultationId}/documents`. */
export interface ConsultationDocumentList {
  consultationId: string;
  documents: ConsultationDocument[];
}

/** Body for creating a draft (contracts/openapi.yaml#ConsultationDocumentCreateRequest). */
export interface ConsultationDocumentCreateRequest {
  documentType: ConsultationDocumentType;
  title: string;
  content: Record<string, unknown>;
}

/** Body for updating / finalizing / voiding (contracts/openapi.yaml#ConsultationDocumentUpdateRequest). */
export interface ConsultationDocumentUpdateRequest {
  title?: string;
  content?: Record<string, unknown>;
  status?: Extract<ConsultationDocumentStatus, "finalized" | "voided">;
  signature?: ElectronicSignatureRequest;
}

/** A user-facing document error derived from an {@link ApiError} or network failure. */
export interface DocumentError {
  /** Backend (or synthetic) error code, retained for diagnostics. */
  code: string;
  /** Non-empty, user-facing message describing the failure (Requirement 12.2). */
  message: string;
}

/**
 * Backend error code raised when a write targets a document that can no longer
 * be modified — most importantly, finalizing an already-finalized document
 * (the conditional write fails). Callers treat this as "already in the target
 * state" and re-read the existing document rather than retrying the write
 * (Requirement 12.4).
 */
export const DOCUMENT_STATE_CONFLICT_CODE = "STATE_CONFLICT";
export const LEGACY_DOCUMENT_WRITE_RETIRED_CODE = "LEGACY_CDS_ROUTE_RETIRED";

const PROTECTED_DOCUMENT_TYPES = new Set<ConsultationDocumentType>([
  "soap_note",
  "prescription",
  "medical_certificate",
  "visit_summary",
  "lab_request",
  "recommendation",
]);
const PROTECTED_CONTENT_FIELDS = new Set([
  "assessment",
  "plan",
  "prescription",
  "finalIcd",
  "final_icd",
  "icdCode",
  "medicalCertificate",
  "labRequest",
  "imagingRequest",
  "patientEducation",
  "treatment",
  "medication",
  "dosage",
  "release",
  "patientVisible",
]);

function containsProtectedContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProtectedContent);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>)
    .some(([key, child]) => PROTECTED_CONTENT_FIELDS.has(key) || containsProtectedContent(child));
}

function retiredDocumentWrite(): ApiError {
  return new ApiError(
    LEGACY_DOCUMENT_WRITE_RETIRED_CODE,
    "Protected legacy document writes are permanently retired.",
    410,
  );
}

/** Generic fallback message used when a save cannot be completed (Requirement 12.2). */
export const DOCUMENT_SAVE_FAILED_MESSAGE =
  "Could not save the document. Your changes have been kept — please try again.";

/**
 * Pure helper: map an unknown thrown value from a document write/read to a
 * defined {@link DocumentError} with a non-empty, user-facing message so the
 * UI can show an error indication while retaining the entered content
 * (Requirement 12.2).
 */
export function mapDocumentError(error: unknown): DocumentError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message || DOCUMENT_SAVE_FAILED_MESSAGE,
    };
  }
  return {
    code: "NETWORK_ERROR",
    message:
      "Could not reach the server to save the document. Your changes have been kept — please try again.",
  };
}

/** True iff `error` is the backend's "cannot be modified in its current state" conflict. */
export function isDocumentStateConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === DOCUMENT_STATE_CONFLICT_CODE;
}

/**
 * List documents for a consultation
 * (`GET /v1/consultations/{consultationId}/documents`). Assigned doctors see
 * drafts and finalized documents; patients see finalized documents only.
 *
 * @param consultationId - The `con_*` consultation id.
 * @param idToken        - Cognito IdToken (Bearer auth).
 * @returns The consultation's document list.
 * @throws {ApiError} on any non-2xx response.
 */
export async function listConsultationDocuments(
  consultationId: string,
  idToken: string,
): Promise<ConsultationDocumentList> {
  const res = await api.get<ConsultationDocumentList>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/documents`,
    idToken,
  );
  return res.data;
}

/**
 * Read a single document
 * (`GET /v1/consultations/{consultationId}/documents/{documentId}`). Used to
 * re-read the existing finalized state after an already-finalized conflict so
 * the UI shows it without producing a duplicate (Requirement 12.4).
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function getConsultationDocument(
  consultationId: string,
  documentId: string,
  idToken: string,
): Promise<ConsultationDocument> {
  const res = await api.get<ConsultationDocument>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/documents/${encodeURIComponent(documentId)}`,
    idToken,
  );
  return res.data;
}

/**
 * Create a draft document
 * (`POST /v1/consultations/{consultationId}/documents`). A UUID v4
 * `Idempotency-Key` is supplied by the client and reused across retries of one
 * logical create via `idempotencyKey` (Requirement 12.1).
 *
 * `contracts/openapi.yaml` declares `X-Correlation-ID`
 * (`RequiredCorrelationId`) as a **required** header on this operation, so the
 * request is issued through `api.request` — `api.post` cannot carry a
 * correlation id. A PHI-free id is generated when the caller does not supply
 * one; pass `correlationId` explicitly to correlate the retries of a single
 * logical create.
 *
 * @throws {ApiError} on any non-2xx response.
 */
export async function createConsultationDocument(
  consultationId: string,
  idToken: string,
  body: ConsultationDocumentCreateRequest,
  idempotencyKey?: string,
  correlationId?: string,
): Promise<ConsultationDocument> {
  if (PROTECTED_DOCUMENT_TYPES.has(body.documentType) || containsProtectedContent(body.content)) {
    throw retiredDocumentWrite();
  }
  const res = await api.request<ConsultationDocument>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/documents`,
    idToken,
    {
      method: "POST",
      body: JSON.stringify(body),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      correlationId: correlationId ?? newCorrelationId(),
    },
  );
  return res.data;
}

/**
 * Update, finalize, or void a document
 * (`PUT /v1/consultations/{consultationId}/documents/{documentId}`). Passing
 * `{ status: "finalized" }` finalizes the document; a UUID v4 `Idempotency-Key`
 * is supplied by the client and reused across retries of one logical write so a
 * retried finalize is not duplicated (Requirements 12.1, 12.4).
 *
 * @throws {ApiError} on any non-2xx response (a `STATE_CONFLICT` indicates the
 *   document is already finalized/voided — see {@link isDocumentStateConflict}).
 */
export async function updateConsultationDocument(
  consultationId: string,
  documentId: string,
  idToken: string,
  body: ConsultationDocumentUpdateRequest,
  idempotencyKey?: string,
): Promise<ConsultationDocument> {
  void consultationId;
  void documentId;
  void idToken;
  void body;
  void idempotencyKey;
  throw retiredDocumentWrite();
}

/** Re-export so callers can narrow document errors without importing the client. */
export { ApiError };
