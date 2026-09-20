import { api, ApiError } from "@/lib/api";

/**
 * Scheduled-request accept/decline data access (ADR-20260828-01, Task 11 of the
 * doctor-dashboard rebuild).
 *
 * Backed by `GET /v1/doctors/me/scheduled-requests` and
 * `POST /v1/doctors/me/scheduled-requests/{bookingId}/respond`. Both are gated
 * server-side behind `SCHEDULED_REQUEST_RESPONSE_ENABLED` and answer `404` when
 * the feature is disabled, the same convention `requestPool.ts` already
 * documents for `ON_DEMAND_POOL_ENABLED` — the UI treats a `404` here as
 * "feature not available in this environment", not as an error.
 */

/** Longest doctor-authored decline note the backend accepts (contract: `note`). */
export const DECLINE_NOTE_MAX = 500;

/** contract: Booking, the subset this card reads. */
export interface ScheduledRequestBooking {
  bookingId: string;
  patientId: string;
  doctorId?: string;
  status: string;
  bookingMode: "scheduled" | "on_demand";
  serviceType: string;
  scheduledAt: string;
  channel: string;
  amountCents?: number;
  currency?: string;
}

/** One scheduled request awaiting the doctor's accept/decline decision. */
export interface ScheduledRequestEntry {
  booking: ScheduledRequestBooking;
  intakeFormStatus?: "draft" | "submitted" | "acknowledged";
  /**
   * The patient's saved display name. Absent, never a placeholder — the doctor
   * is already the assigned clinician for this booking (the patient chose
   * their published slot), so this is disclosed on the same terms
   * `IncomingRequestsCard` already uses for the intake queue.
   */
  patientName?: string;
  /** Bounded chief-complaint excerpt, on the same terms as the intake queue. */
  reasonExcerpt?: string;
}

/** Distinguishes "feature disabled" from "no scheduled requests" for the caller. */
export type ScheduledRequestsResult =
  | { kind: "unavailable" }
  | { kind: "ok"; requests: ScheduledRequestEntry[] };

export async function fetchScheduledRequests(
  token: string,
): Promise<ScheduledRequestsResult> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view scheduled requests.",
      401,
    );
  }
  try {
    const res = await api.get<ScheduledRequestEntry[]>(
      "/v1/doctors/me/scheduled-requests",
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

/**
 * Accept a scheduled request: the doctor confirms they will hold this
 * appointment. Lands the booking on the intake queue (`ready` or `pending`,
 * decided server-side by whether the patient has already submitted intake).
 */
export async function acceptScheduledRequest(
  token: string,
  bookingId: string,
): Promise<void> {
  await api.post(
    `/v1/doctors/me/scheduled-requests/${encodeURIComponent(bookingId)}/respond`,
    token,
    { action: "accept" },
  );
}

/**
 * Decline a scheduled request: cancels the booking and refunds the patient's
 * held payment before releasing the doctor's slot, in that order
 * (fail-closed — see `backend/src/lib/scheduled-requests.ts`).
 *
 * `note` is optional and, when supplied, shown to the patient **in-app only**
 * — never in the email/SMS decline notification. The backend truncates it to
 * `DECLINE_NOTE_MAX`; this trims client-side too so the doctor sees the same
 * bound before submitting rather than discovering it was silently cut.
 *
 * A `409 PAYMENT_NOT_REFUNDABLE` is a distinct, retryable outcome — the
 * booking is left completely untouched (still `confirmed`, still assigned)
 * rather than cancelled without a refund — and is surfaced as a typed result
 * rather than thrown, so the dialog can offer "try again" instead of reading
 * as a generic failure. `409 STATE_CONFLICT` (the booking stopped being
 * respondable, e.g. it was accepted or started elsewhere) is thrown normally:
 * there is nothing to retry, the list should simply refresh.
 */
export type DeclineOutcome =
  | { kind: "declined" }
  | { kind: "refund_failed" };

export async function declineScheduledRequest(
  token: string,
  bookingId: string,
  note?: string,
): Promise<DeclineOutcome> {
  const trimmed = note?.trim();
  const body: { action: "decline"; note?: string } = { action: "decline" };
  if (trimmed) body.note = trimmed.slice(0, DECLINE_NOTE_MAX);
  try {
    await api.post(
      `/v1/doctors/me/scheduled-requests/${encodeURIComponent(bookingId)}/respond`,
      token,
      body,
    );
    return { kind: "declined" };
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 409 &&
      err.code === "PAYMENT_NOT_REFUNDABLE"
    ) {
      return { kind: "refund_failed" };
    }
    throw err;
  }
}
