import { api, ApiError } from "@/lib/api";

/**
 * Video session data access (consultation-media-layer, task 11.1).
 *
 * Backs the three contract operations dispatched from the existing `bookings`
 * handler (contracts/openapi.yaml#createBookingVideoSession,
 * #getBookingVideoSession, #endBookingVideoSession):
 *
 *   `POST /v1/bookings/{bookingId}/video-session`      — create or reuse a room
 *                                                          and mint a Join_Credential
 *   `GET  /v1/bookings/{bookingId}/video-session`       — read room state only,
 *                                                          no credential
 *   `POST /v1/bookings/{bookingId}/video-session/end`   — end the room (doctor only)
 *
 * This module is intentionally the only frontend data-access surface for these
 * operations. `<ConsultationVideo />` is the only *component* that references
 * Video_Provider specifics (Requirement 20.1); this file stays provider-agnostic
 * and simply moves the contracted JSON shapes across the wire.
 */

/**
 * Response of `POST /v1/bookings/{bookingId}/video-session`
 * (contracts/openapi.yaml#VideoSessionCredentialResponse).
 *
 * `token` is the Join_Credential. Treat it as a secret at all times: never log
 * it, never put it in a notification, never write it to `localStorage` or
 * `sessionStorage` (Requirement 8.9) — hold it in memory only, for the lifetime
 * of the component instance that requested it.
 */
export interface VideoSessionCredential {
  provider: string;
  roomUrl: string;
  token: string;
  /** ISO-8601 instant; fixed at minting time (Requirement 8.6, 8.7). */
  expiresAt: string;
  lifecycleState: "active" | "ended";
}

/**
 * Response of `GET /v1/bookings/{bookingId}/video-session` and
 * `POST /v1/bookings/{bookingId}/video-session/end`
 * (contracts/openapi.yaml#VideoSessionStateResponse). Carries no
 * Join_Credential and no room URL.
 */
export interface VideoSessionState {
  provider: string;
  lifecycleState: "active" | "ended";
  createdAt: string;
  endedAt?: string;
}

/**
 * Create or reuse the Video_Session for a booking and mint a fresh
 * Join_Credential scoped to the caller (Requirement 3).
 *
 * Resolves on both `201` (a new provider room was created) and `200` (an
 * existing active room was reused, or an ended room was reopened) — the
 * caller does not need to distinguish them, since both return a usable
 * credential.
 *
 * Throws {@link ApiError} on every failure path, including:
 * - `409 STATE_CONFLICT`              — the booking is outside `confirmed`/`in_progress`
 * - `429 VIDEO_CREDENTIAL_MINT_LIMIT` — carries `retryAfterSeconds` from `Retry-After`
 * - `503 VIDEO_PROVIDER_UNAVAILABLE` / `503 VIDEO_DISABLED` — chat-only state
 */
export async function createVideoSession(
  idToken: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<VideoSessionCredential> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to join the video call.",
      401,
    );
  }
  const res = await api.post<VideoSessionCredential>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/video-session`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}

/**
 * Read the Video_Session room state without creating one (Requirement 4).
 *
 * Safe and side-effect free: issues a `GET` with no `Idempotency-Key`. Resolves
 * `null` only for the endpoint's contracted absent-session response. The backend
 * also conceals a missing booking or participant mismatch behind `404`, so those
 * responses must remain errors rather than being mislabeled as "no room yet".
 * Any other failure (including `409 STATE_CONFLICT` when the booking has left the
 * eligibility window) is rethrown.
 */
export async function readVideoSession(
  idToken: string,
  bookingId: string,
): Promise<VideoSessionState | null> {
  if (!idToken) return null;
  try {
    const res = await api.get<VideoSessionState>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/video-session`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 404 &&
      err.code === "RESOURCE_NOT_FOUND" &&
      err.message === "Video session not found"
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * End the Video_Session (Requirement 5). Assigned doctor only — the backend
 * responds `403 AUTH_INSUFFICIENT_ROLE` for the owning patient.
 *
 * Resolves `200` whether the room was active, already ended, or the provider
 * termination failed (best-effort on the backend); this call never surfaces a
 * "the room was already closed" error to the caller.
 */
export async function endVideoSession(
  idToken: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<VideoSessionState> {
  const res = await api.post<VideoSessionState>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/video-session/end`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}
