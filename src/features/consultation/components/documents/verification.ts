import type { DocumentVerificationInfo } from "./types";

/** Printed in place of an issue date or validity a document does not have yet. */
export const NOT_YET_ISSUED = "Not yet issued";

const PRODUCTION_ORIGIN = "https://www.bayanhealth.co";

/** The origin serving this page, or production when there is none (server render). */
function currentOrigin(): string {
  return typeof window === "undefined" ? PRODUCTION_ORIGIN : window.location.origin;
}

/**
 * The public page a document's QR resolves to (ADR-20260927-01).
 *
 * Built on the origin that served the document, because the code only
 * verifies against the environment that issued it: in prod that is
 * www.bayanhealth.co, and a dev document's QR must reach dev's own verify page
 * rather than prod's landing page.
 */
export function verificationUrl(code: string, origin: string = currentOrigin()): string {
  return `${origin.replace(/\/+$/, "")}/verify/${encodeURIComponent(code)}`;
}

/**
 * The verification panel for a document.
 *
 * Only a real code from the server produces a QR and an "ACTIVE" badge. The
 * code arrives on the release response, the assigned doctor's current-outputs
 * read, and the patient's released-document read (ADR-20260928-01); without
 * one the panel shows the document reference alone, never a claim that
 * something verified it.
 */
export function documentVerification(input: {
  documentId: string;
  verificationCode?: string;
  verificationValidUntil?: string;
}): DocumentVerificationInfo {
  if (!input.verificationCode) return { qrValue: "", documentId: input.documentId };
  return {
    qrValue: verificationUrl(input.verificationCode),
    documentId: input.documentId,
    status: "ACTIVE",
    ...(input.verificationValidUntil
      ? {
          validUntil: new Date(input.verificationValidUntil).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        }
      : {}),
  };
}
