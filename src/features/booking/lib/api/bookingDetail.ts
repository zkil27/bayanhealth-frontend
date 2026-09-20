import { api, ApiError } from "@/lib/api";
import type { BookingStatus } from "@/lib/bookings";

/**
 * Patient booking-detail data access (Slice 5, task 10.5, Requirements 10.4–10.8).
 *
 * The detail view is backed by the contract-frozen `GET /v1/bookings/{bookingId}`
 * endpoint, which returns a single booking in the `{ data, meta }` envelope.
 *
 * Per the API design (contracts/openapi.yaml#getBooking) a booking that is not
 * owned by the patient — or simply does not exist — is returned as a **404** so
 * the API does not leak whether the booking exists. This module surfaces that
 * 404 as an {@link ApiError} with `status === 404` so the calling component can
 * branch to a dedicated, non-revealing not-found state that is distinct from the
 * generic error state (Requirement 10.5). All other failures flow through as the
 * generic error path (Requirement 10.6).
 *
 * This module is intentionally scoped to the booking DETAIL only; booking LIST
 * wiring lives in `bookingList.ts`.
 */

/**
 * Subset of the backend `Booking` schema (contracts/openapi.yaml#Booking) that
 * the patient booking detail renders. Kept permissive on `status` so an unknown
 * or missing value flows through to `displayBookingStatus`'s fallback
 * (Requirement 10.8).
 */
export interface BookingDetail {
  bookingId: string;
  patientId?: string;
  doctorId?: string;
  /**
   * Canonical consultation id, present only once the one-time link was activated
   * (contracts/openapi.yaml#Booking). It is the patient's only route to
   * consultation-scoped reads such as released patient education — the OTL is
   * single-use, so after activation the booking is the sole carrier of this id.
   */
  consultationId?: string;
  status?: BookingStatus | string;
  /**
   * How the booking was created (contracts/openapi.yaml#Booking.bookingMode).
   *
   * `on_demand` bookings are broadcast to the whole consult-approved doctor pool
   * and wait for one to accept; `scheduled` bookings already name the time and
   * are matched server-side. The UI must read this rather than infer the mode
   * from the absence of a `doctorId` — an unassigned booking can be either, and
   * guessing produced on-demand copy on scheduled bookings.
   *
   * Kept optional and widened to `string` so a record written before the field
   * existed, or a value this client does not know, does not break the read; the
   * caller treats anything that is not `on_demand` as scheduled.
   */
  bookingMode?: "scheduled" | "on_demand" | string;
  serviceType?: string;
  scheduledAt?: string;
  channel?: string;
  notes?: string;
  amountCents?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * The doctor user ID who declined this booking via
   * `POST /v1/doctors/me/scheduled-requests/{bookingId}/respond` with
   * `action: decline` (contracts/openapi.yaml#Booking.declinedBy). Absent
   * unless the booking was declined this way — an ordinary cancellation
   * never sets it. This is what lets the detail view tell "you cancelled"
   * apart from "the doctor declined" once `status` is `cancelled` either way.
   */
  declinedBy?: string;
  /** When the booking was declined. Absent unless {@link declinedBy} is set. */
  declinedAt?: string;
  /**
   * The doctor's optional note explaining the decline.
   *
   * **In-app only** (contracts/openapi.yaml#Booking.declineReason) — the
   * backend never includes this in the email/SMS decline notification and
   * never logs it, so this detail page is the intended, and only, surface
   * for it. Render as plain text, never as markup: the contract states it is
   * rendered "as plain text, never as markup" on every authenticated screen.
   */
  declineReason?: string;
  /**
   * When a doctor accepted this booking, on-demand pool claim or scheduled
   * accept alike (contracts/openapi.yaml#Booking.acceptedAt). Absent on a
   * booking not yet accepted, or auto-matched without an explicit doctor
   * decision. Anchors the two post-acceptance policy windows
   * (ADR-20260808-03): a two-minute full-refund grace period for a patient
   * cancellation, and a ten-minute mandatory wait before a doctor may assert
   * a no-show.
   */
  acceptedAt?: string;
  /**
   * Present only when this `on_demand` booking was settled by a partial
   * capture rather than a full refund — a late cancellation past the grace
   * window, or a doctor-asserted no-show (ADR-20260909-01,
   * contracts/openapi.yaml#Booking.settlementReason). Absent on every
   * ordinary cancellation, which is a full refund and carries no settlement.
   */
  settlementReason?: "late_cancellation" | "no_show" | string;
  /** When the settlement above was recorded. Absent unless {@link settlementReason} is set. */
  settledAt?: string;
}

/**
 * Fetch a single booking by id for the authenticated patient.
 *
 * Throws an {@link ApiError} when no auth token is available or the request
 * fails. The caller inspects `ApiError.status === 404` to branch to the
 * not-found state (Requirement 10.5); any other thrown error drives the generic
 * error state with a retry control (Requirement 10.6).
 *
 * @param token     - Cognito IdToken used to authenticate the request.
 * @param bookingId - Booking identifier (contract pattern `^bk_[a-z0-9]+$`).
 * @returns The booking detail record.
 */
export async function fetchBookingDetail(
  token: string,
  bookingId: string,
): Promise<BookingDetail> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view this booking.",
      401,
    );
  }

  const res = await api.get<BookingDetail>(
    `/v1/bookings/${encodeURIComponent(bookingId)}`,
    token,
  );

  return res.data;
}
