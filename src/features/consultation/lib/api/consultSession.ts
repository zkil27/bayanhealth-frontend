import { api, ApiError } from "@/lib/api";

/**
 * Consultation lifecycle data access (ADR-20260806-01, ADR-20260808-04).
 *
 * These operations existed on the backend with no frontend caller at all, which
 * is what left the scheduled flow unable to reach a consultation:
 *
 *   `POST /v1/bookings/{bookingId}/start`     — start it (assigned doctor)
 *   `GET  /v1/bookings/{bookingId}/state`     — join an already-active session
 *   `POST /v1/bookings/{bookingId}/complete`  — end it
 *
 * The one-time link is gone (ADR-20260808-04). `issueConsultationOtl` lived here
 * and had no production caller by the time it was removed — `useStartConsultation`
 * already called `startConsultation` alone.
 */

/**
 * Minimal shape of the consultation session as returned inside booking state.
 * Mirrors `PublicSession` in the contract.
 */
export interface ConsultationSessionSummary {
  sessionId: string;
  consultationId: string;
  bookingId: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
}

/** Response of `GET /v1/bookings/{bookingId}/state`. */
export interface BookingConsultationState {
  booking: { bookingId: string; status?: string; doctorId?: string; consultationId?: string };
  /**
   * Absent before the consultation starts (ADR-20260809-05).
   *
   * The route now answers for a `confirmed` booking with an assigned doctor so the
   * two participants can load their pre-consult conversation, so a successful
   * response no longer means "the consultation is live". Read `booking.status` for
   * that; a present `session` is the stronger signal and implies it.
   */
  session?: ConsultationSessionSummary;
}

/**
 * Read the active consultation session for a booking.
 *
 * This is how either participant loads the room. Only the assigned doctor can call
 * `/start`, so the patient never creates the session and must join by booking id.
 *
 * Returns null on the backend's `409`, which now means "chat is not open for this
 * booking" — before payment, before a doctor is assigned, or after completion —
 * rather than "the consultation has not started". A `confirmed` booking with an
 * assigned doctor resolves successfully with **no** `session`, which is the
 * pre-consult phase.
 */
export async function fetchBookingConsultationState(
  idToken: string,
  bookingId: string,
): Promise<BookingConsultationState | null> {
  if (!idToken || !bookingId) return null;
  try {
    const res = await api.get<BookingConsultationState>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/state`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

/**
 * Start the consultation as the assigned doctor.
 *
 * Replaces minting a one-time link and immediately consuming it. That dance existed
 * only because the OTL was the sole way to move a booking to `in_progress` and
 * create the CDS session; there is no token here, and both participants reach the
 * room by `bookingId`.
 *
 * Resolves for both `201` (session created) and `200` (a session was already
 * active), so a second click joins instead of failing.
 */
export async function startConsultation(
  idToken: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<BookingConsultationState> {
  const res = await api.post<BookingConsultationState>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/start`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}

/** Response of `POST /v1/bookings/{bookingId}/complete`. */
export interface CompletedConsult {
  bookingStatus: string;
}

/**
 * Complete the consultation: captures the held payment and, server-side, ends
 * the canonical CDS session, initializes the Assessment aggregates, and ingests
 * the patient's intake as the consultation's first clinical source.
 *
 * Assigned doctor only. Nothing else in the system performs that transition, so
 * a consultation that is never completed can never reach the post-consult
 * assessment workflow.
 */
export async function completeConsultation(
  idToken: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<CompletedConsult> {
  const res = await api.post<CompletedConsult>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/complete`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}

/**
 * Response of `POST /v1/bookings/{bookingId}/no-show` — the settled booking
 * (contract: `Booking`). Only the fields this feature actually reads are
 * declared; the backend returns the full booking record.
 */
export interface NoShowSettledBooking {
  bookingId: string;
  status: string;
  settlementReason?: string;
  settledAt?: string;
}

/**
 * Assert that the patient never joined an accepted on-demand consultation
 * (ADR-20260808-03, ADR-20260909-01).
 *
 * Assigned doctor only, and only once ten minutes have passed since
 * `Booking.acceptedAt` — the backend enforces both server-side and answers
 * `409` with `retryAfterMs` in `error.details` when called early. This module
 * does not pre-check the wait itself; the caller (`useAssertNoShow`) is
 * expected to have already gated the control on the same window so this call
 * is only ever made once it has genuinely elapsed.
 *
 * Settles as a 50% partial capture of the held payment, with the doctor's
 * normal 80% share of that half, and cancels the booking with
 * `settlementReason: "no_show"` — the identical money shape a late patient
 * cancellation reaches through `PUT /v1/bookings/{bookingId}` instead.
 */
export async function assertBookingNoShow(
  idToken: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<NoShowSettledBooking> {
  const res = await api.post<NoShowSettledBooking>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/no-show`,
    idToken,
    {},
    idempotencyKey,
  );
  return res.data;
}
