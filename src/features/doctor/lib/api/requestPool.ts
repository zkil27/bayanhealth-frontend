import { api, ApiError } from "@/lib/api";
import type { IntakeSafetyScreen, IntakeVitals } from "@/features/booking/lib/api/intake";

/**
 * On-demand consultation request pool data access (ADR-20260805-04).
 *
 * Backed by `GET /v1/doctors/me/request-pool` and
 * `POST /v1/doctors/me/request-pool/{bookingId}/accept`. Both are gated behind
 * the `ON_DEMAND_POOL_ENABLED` flag server-side and answer `404` when the pool is
 * disabled, so the UI treats 404 as "feature not available here" rather than as
 * an error.
 */

/** One pooled request, mirroring `OnDemandRequest` in the contract. */
export interface OnDemandRequest {
  bookingId: string;
  serviceType: "general" | "specialist" | "follow_up" | "emergency";
  channel: "video" | "audio" | "chat";
  scheduledAt: string;
  requestedAt: string;
  amountCents?: number;
  currency?: string;
  intakeSubmitted: boolean;
  /**
   * The patient's saved display name, disclosed before acceptance
   * (ADR-20260808-02). Absent when they have not saved a profile — the UI then
   * shows the booking reference, which is what the platform actually knows.
   */
  patientName?: string;
  /** Bounded chief-complaint excerpt; absent until the patient submits intake. */
  reasonExcerpt?: string;
  /**
   * Vitals, allergies, and red-flag screening from intake, disclosed
   * pre-acceptance (ADR-20260914-02). Each is present only once the patient has
   * submitted intake; the rest of the intake body stays gated to the assigned
   * doctor after acceptance.
   */
  vitals?: IntakeVitals;
  allergies?: string;
  safetyScreen?: IntakeSafetyScreen;
}

/** Distinguishes "pool disabled" from "pool empty" for the caller. */
export type RequestPoolResult =
  | { kind: "unavailable" }
  | { kind: "ok"; requests: OnDemandRequest[] };

export async function fetchRequestPool(
  token: string,
): Promise<RequestPoolResult> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view consultation requests.",
      401,
    );
  }
  try {
    const res = await api.get<OnDemandRequest[]>(
      "/v1/doctors/me/request-pool",
      token,
    );
    return { kind: "ok", requests: res.data ?? [] };
  } catch (err) {
    // The route is absent when the flag is off, which is a configuration state,
    // not a failure. Anything else propagates to the error UI.
    if (err instanceof ApiError && err.status === 404) {
      return { kind: "unavailable" };
    }
    throw err;
  }
}

/** Outcome of an accept attempt. `claimed` means another doctor won the race. */
export type AcceptOutcome =
  | { kind: "accepted"; bookingId: string }
  | { kind: "claimed" };

/**
 * Accept a pooled request.
 *
 * `REQUEST_ALREADY_CLAIMED` is returned as a distinct outcome rather than thrown:
 * the pool is broadcast, so losing an acceptance race is an ordinary result and
 * should read as "another doctor took this one", not as an error.
 */
export async function acceptRequest(
  token: string,
  bookingId: string,
): Promise<AcceptOutcome> {
  try {
    await api.post(
      `/v1/doctors/me/request-pool/${encodeURIComponent(bookingId)}/accept`,
      token,
      {},
    );
    return { kind: "accepted", bookingId };
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 409 &&
      err.code === "REQUEST_ALREADY_CLAIMED"
    ) {
      return { kind: "claimed" };
    }
    throw err;
  }
}
