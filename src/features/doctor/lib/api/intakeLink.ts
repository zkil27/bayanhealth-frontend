/**
 * Authenticated doctor action: issue a one-time intake link for a booking.
 *
 * Backend contract (contracts/openapi.yaml#issueIntakeLink):
 *   POST /v1/bookings/{bookingId}/intake-link
 *   - Required role: `doctor` (assigned doctor only)
 *   - Idempotency: required (UUID v4 `Idempotency-Key`)
 *   - 201 -> IntakeLinkIssueResponse { bookingId, token, expiresAt, linkStatus }
 *
 * This uses the authenticated client in `@/lib/api` (Bearer IdToken). The token
 * returned here is what the patient consumes at `/intake/{token}` via the public
 * intake-link endpoints. There is no mock — this hits the deployed backend.
 */

import { api, type ApiResponse } from "@/lib/api";

/** contract: IntakeLinkStatus */
export type IntakeLinkStatus = "active" | "expired" | "consumed";

/** contract: IntakeLinkIssueResponse */
export interface IntakeLinkIssueResponse {
  bookingId: string;
  /** Present only at issue time — share with the patient. */
  token: string;
  expiresAt: string;
  linkStatus: IntakeLinkStatus;
}

/**
 * Issue a single-use intake link for a confirmed booking.
 *
 * @param bookingId - The booking to issue the link for.
 * @param idToken - The doctor's Cognito IdToken.
 * @param idempotencyKey - Optional explicit key; reuse the same key on retry of
 *   the same logical issue so the backend does not mint a second link.
 */
export function issueIntakeLink(
  bookingId: string,
  idToken: string,
  idempotencyKey?: string,
): Promise<ApiResponse<IntakeLinkIssueResponse>> {
  return api.post<IntakeLinkIssueResponse>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/intake-link`,
    idToken,
    {},
    idempotencyKey,
  );
}
