import { ApiError } from "@/lib/api";
import {
  fetchBookingPage,
  type BookingListItem,
} from "@/features/booking/lib/api/bookingList";

/**
 * Patient home data access (Slice 9, task 15.1, Requirement 14.1, 14.3–14.5).
 *
 * Requirement 15 forbids new backend routes, so the patient home is *composed*
 * from existing contract-frozen endpoints rather than a dedicated home endpoint.
 * The primary home content is the patient's own consultations, sourced from
 * `GET /v1/bookings` (reusing {@link fetchBookingPage} so the cursor/limit
 * contract is honoured and not duplicated).
 *
 * This module is intentionally thin and pure aside from the network call: it
 * fetches the first page of bookings and orders them for display. It throws an
 * {@link ApiError} when no auth token is available or the underlying request
 * fails, so the calling `AsyncView` surfaces the defined error state with a
 * retry control (Requirement 14.5).
 */

/**
 * Composed patient home content.
 *
 * `consultations` is the ordered list of the patient's bookings used to replace
 * the former static carousel placeholders. Zero consultations drives the
 * `AsyncView` empty state (Requirement 14.4).
 */
export interface PatientHomeContent {
  consultations: BookingListItem[];
}

/**
 * Relative display priority for a booking's lifecycle status: lower sorts first.
 * Active/actionable consultations surface above terminal ones on the home view.
 */
const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  confirmed: 1,
  payment_submitted: 2,
  pending_payment: 3,
  completed: 4,
  cancelled: 5,
};

/** Resolve a sortable timestamp (ms) for a booking, preferring its schedule. */
function bookingTime(booking: BookingListItem): number {
  const raw = booking.scheduledAt ?? booking.createdAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/**
 * Order consultations for the home view: by status priority first (active and
 * actionable consultations on top), then by soonest scheduled time. Pure and
 * stable so the same input always yields the same order.
 */
export function orderHomeConsultations(
  bookings: BookingListItem[],
): BookingListItem[] {
  return [...bookings].sort((a, b) => {
    const sa = STATUS_ORDER[a.status ?? ""] ?? Number.MAX_SAFE_INTEGER;
    const sb = STATUS_ORDER[b.status ?? ""] ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return bookingTime(a) - bookingTime(b);
  });
}

/**
 * Fetch and compose the authenticated patient's home content.
 *
 * @param token - Cognito IdToken used to authenticate the request.
 * @returns The composed home content; the consultations list may be empty.
 * @throws {ApiError} When no token is available or the bookings request fails.
 */
export async function fetchPatientHome(
  token: string,
): Promise<PatientHomeContent> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your home.",
      401,
    );
  }

  const page = await fetchBookingPage(token, undefined, 3);
  return { consultations: orderHomeConsultations(page.bookings) };
}
