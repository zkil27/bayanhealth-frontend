import { api, ApiError, type ApiResponse } from "@/lib/api";
import type { BookingStatus } from "@/lib/bookings";

/**
 * Patient booking-list data access (Slice 5, task 10.4, Requirement 10.1–10.3,
 * 10.9, 10.10).
 *
 * The list is backed by the contract-frozen `GET /v1/bookings` endpoint, which
 * returns the caller's bookings in the `{ data, meta }` envelope with an opaque
 * pagination cursor in `meta.pagination.cursor`. This module is intentionally
 * scoped to the booking LIST only; booking DETAIL wiring lives elsewhere.
 */

/**
 * Subset of the backend `Booking` schema (contracts/openapi.yaml#Booking) that
 * the patient booking list renders. Kept permissive on `status` so an unknown
 * or missing value flows through to {@link displayBookingStatus}'s fallback.
 */
export interface BookingListItem {
  bookingId: string;
  patientId?: string;
  doctorId?: string;
  /**
   * Canonical consultation identifier, present only once the one-time link was
   * activated and a session started (contracts/openapi.yaml#Booking).
   *
   * Carried here because consultation-scoped surfaces — notably the post-consult
   * assessment-first workspace — are keyed by `consultationId`, and this list is
   * the only route back to them after a consultation completes. Stays optional:
   * a booking that never had a session activated genuinely has no value.
   */
  consultationId?: string;
  status?: BookingStatus | string;
  serviceType?: string;
  scheduledAt?: string;
  channel?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * The doctor user ID who declined this booking (contract:
   * `Booking.declinedBy`). Absent unless `status` is `cancelled` *and* the
   * cancellation was a doctor decline rather than a patient/admin
   * cancellation — see `displayBookingStatus`, the one consumer that branches
   * on it to render a distinct "Declined by doctor" status.
   */
  declinedBy?: string;
  /**
   * Doctor-side triage state for this booking's intake, patient-readable
   * (contract: `Booking.intakeQueueStatus`, `IntakeQueueStatus`). Written by
   * `POST /v1/doctors/me/intake-queue/{bookingId}/process`. The only
   * patient-visible signal that a physician is actively working a booking
   * before the consultation itself starts — used by the Care Recovery Roadmap
   * (`src/lib/patient/careRoadmap.ts`) to show an in-progress step.
   */
  intakeQueueStatus?: "pending" | "ready" | "in_progress" | "need_review";
}

/** A single page of the patient booking list plus its pagination envelope. */
export interface BookingListPage {
  bookings: BookingListItem[];
  meta: ApiResponse<BookingListItem[]>["meta"];
}

/** Default page size requested from `GET /v1/bookings`. */
export const BOOKING_LIST_PAGE_SIZE = 20;

/**
 * Fetch a single page of the authenticated patient's bookings.
 *
 * Passes the opaque pagination cursor as the `cursor` query parameter the
 * backend expects (contracts/openapi.yaml#ListBookingsCursor); the contract is
 * not modified. Throws an {@link ApiError} when no auth token is available or
 * the request fails, so the calling `AsyncView` surfaces the defined error
 * state with a retry control (Requirement 10.3).
 *
 * @param token  - Cognito IdToken used to authenticate the request.
 * @param cursor - Opaque cursor from a previous page's `meta.pagination.cursor`.
 * @returns The page's bookings together with the response `meta`.
 */
export async function fetchBookingPage(
  token: string,
  cursor?: string,
  limit : number = BOOKING_LIST_PAGE_SIZE
): Promise<BookingListPage> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your bookings.",
      401,
    );
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  const res = await api.get<BookingListItem[]>(
    `/v1/bookings?${params.toString()}`,
    token,
  );

  return { bookings: res.data ?? [], meta: res.meta };
}
