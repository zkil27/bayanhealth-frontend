import { useQuery } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";

import { fetchBookingDetail, type BookingDetail } from "../lib/api/bookingDetail";
import type { FindingUpdate } from "../types/booking.types";

/**
 * Doctor-matching progress for the booking wizard, backed by real state.
 *
 * Matching happens server-side (the on-demand matcher assigns a KYC-verified
 * doctor), and there is no client push channel for it, so this polls
 * `GET /v1/bookings/{bookingId}` and derives the display state from the booking
 * itself: still searching while `doctorId` is absent, resolved once it is set.
 * Polling stops as soon as a doctor is assigned so a matched booking does not
 * keep hitting the API.
 *
 * The return value is a discriminated union rather than `FindingUpdate | null`
 * because those two cases were indistinguishable to the caller: `null` meant
 * both "no successful read yet" and "the poll failed", so `FindingStep` rendered
 * a 0% progress bar under an animated "Live" badge forever on a failed poll. A
 * caller now has to handle {@link FindingFailed} to render anything at all.
 */

/** Poll cadence while matching is still in progress. */
const POLL_INTERVAL_MS = 3000;

/** Fallback copy when the failed poll carries no usable message. */
export const FINDING_ERROR_MESSAGE =
  "We couldn't check on your booking just now.";

/** The poll is running; `update` is null until the first successful read. */
export interface FindingPolling {
  status: "polling";
  update: FindingUpdate | null;
  /** Force an immediate re-read (resumes polling once it succeeds). */
  retry: () => void;
}

/** The poll failed. Nothing about matching progress is known. */
export interface FindingFailed {
  status: "failed";
  message: string;
  /** Re-read the booking; success resumes normal polling. */
  retry: () => void;
}

export type FindingState = FindingPolling | FindingFailed;

/**
 * Map real booking state onto the three matching stages the wizard shows.
 *
 * The progress numbers are presentation for the progress bar, not a simulated
 * ramp — each one corresponds to a distinct backend state.
 */
function toFindingUpdate(detail: BookingDetail): FindingUpdate {
  if (detail.doctorId) {
    return { progress: 100, message: "Doctor assigned", resolved: true };
  }
  if (detail.status === "confirmed" || detail.status === "payment_submitted") {
    // The two modes are waiting on different things and must not share copy. A
    // scheduled booking is waiting on the server-side matcher; an on-demand
    // booking is waiting on a human to accept a broadcast request, which no
    // amount of waiting is guaranteed to produce.
    return {
      progress: 66,
      message:
        detail.bookingMode === "on_demand"
          ? "Waiting for a doctor to accept your request…"
          : "Matching you with an available doctor…",
      resolved: false,
    };
  }
  return {
    progress: 33,
    message: "Waiting for your payment to clear…",
    resolved: false,
  };
}

/**
 * Poll the booking until a doctor is assigned.
 *
 * @param bookingId - Booking being matched.
 * @param isActive  - Whether the wizard is on the finding step; no polling
 *                    happens while false.
 * @returns A {@link FindingState}: `polling` (with the derived
 *   {@link FindingUpdate} once one is available) or `failed` when the read
 *   errored.
 */
export function useFinding(bookingId: string, isActive: boolean): FindingState {
  const idToken = useIdToken();

  const { data, error, refetch } = useQuery({
    queryKey: ["booking-finding", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: isActive && !!idToken,
    // Stop once matched; an assigned doctor is terminal for this hook. Also stop
    // after a failure: the patient is shown an explicit error with a retry, and
    // a poll that silently re-fired every 3s behind that error is what made the
    // failure invisible in the first place.
    refetchInterval: (query) => {
      if (query.state.data?.doctorId) return false;
      if (query.state.error) return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    retry: false,
  });

  const retry = () => {
    void refetch();
  };

  if (error) {
    return {
      status: "failed",
      message: error instanceof Error && error.message
        ? error.message
        : FINDING_ERROR_MESSAGE,
      retry,
    };
  }

  return {
    status: "polling",
    update: data ? toFindingUpdate(data) : null,
    retry,
  };
}
