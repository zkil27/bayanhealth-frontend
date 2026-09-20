/**
 * Real backend client for the PUBLIC prescription verification endpoint.
 *
 * This endpoint is declared `security: []` in contracts/openapi.yaml (tag
 * PublicPrescriptions) — it is PHI-safe and unauthenticated, verified solely by
 * the opaque verification code in the path. We deliberately call it WITHOUT an
 * Authorization header. This mirrors the public intake client in
 * `src/features/booking/lib/api/intake.ts` (its `publicRequest` helper, envelope
 * parsing, and `ApiError` reuse from `@/lib/api`).
 *
 * NOTE: There is no mock here. All requests hit the deployed backend at
 * `NEXT_PUBLIC_API_BASE_URL`.
 */

import { ApiError } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

/** contract: PrescriptionVerificationResult */
export interface PrescriptionVerificationResult {
  verified: boolean;
  issuedAt?: string;
  validUntil?: string;
  issuerName?: string;
}

/** Backend success envelope: { data, meta }. */
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
  };
}

/**
 * Unauthenticated fetch against a public prescription endpoint.
 * Parses the `{ data, meta }` success envelope and throws an {@link ApiError}
 * mirroring the `{ error: { code, message } }` failure envelope.
 */
async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? "API_ERROR",
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }

  return (body as ApiResponse<T>).data;
}

/**
 * GET /v1/public/prescriptions/{verificationCode}/verify — verify a
 * prescription by its opaque verification code (PHI-safe, public).
 */
export function verifyPrescription(
  verificationCode: string,
): Promise<PrescriptionVerificationResult> {
  return publicRequest<PrescriptionVerificationResult>(
    `/v1/public/prescriptions/${encodeURIComponent(verificationCode)}/verify`,
    { method: "GET" },
  );
}
