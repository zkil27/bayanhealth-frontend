import { api, ApiError } from "@/lib/api";

/**
 * Download URL for a finalized consultation document.
 *
 * Backed by `GET /v1/consultations/{consultationId}/documents/{documentId}/export-url`
 * (contracts/openapi.yaml#getConsultationDocumentExportUrl), which the contract
 * opens to "`doctor` (assigned doctor) or `patient` (consultation owner)" — so a
 * patient may export their own records, which is what makes the download action
 * on the Home documents panel real rather than decorative.
 *
 * Two properties of this endpoint shape the UI around it:
 *
 * - **The artifact is JSON, not a PDF.** `format` is the single-value enum
 *   `[json]`; the endpoint writes a JSON export to private storage. Any control
 *   offering this must not promise a PDF certificate.
 * - **`finalized` only.** A draft or voided document answers `409`, so the
 *   caller has to treat "not available yet" as an expected outcome rather than
 *   a failure.
 *
 * The URL is presigned and short-lived (`expiresIn`, 300 seconds), so it is
 * fetched at the moment of the click and never stored.
 */
export interface DocumentExport {
  /** Presigned S3 GET URL. Expires in `expiresIn` seconds. */
  downloadUrl: string;
  expiresIn: number;
  exportKey: string;
  documentId: string;
  /** Always `"json"` — the contract's enum has one member. */
  format: "json";
  exportedAt: string;
  finalizedAt: string;
}

/**
 * Request a presigned download for one finalized consultation document.
 *
 * @param idToken        - The caller's Cognito IdToken.
 * @param consultationId - Consultation the document belongs to.
 * @param documentId     - The `doc_*` id, as carried by a chart entry.
 * @returns The presigned export, or `null` when the document is not finalized
 *   (`409`) — an expected state for a document a physician has not released,
 *   distinguished from a real failure so the caller can say "not ready yet".
 * @throws {ApiError} on any other non-2xx response, including `404` for a
 *   document that is not the caller's.
 */
export async function fetchDocumentExport(
  idToken: string,
  consultationId: string,
  documentId: string,
): Promise<DocumentExport | null> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to download your records.",
      401,
    );
  }

  try {
    const res = await api.get<DocumentExport>(
      `/v1/consultations/${encodeURIComponent(consultationId)}/documents/${encodeURIComponent(documentId)}/export-url`,
      idToken,
    );
    return res.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null;
    throw error;
  }
}
