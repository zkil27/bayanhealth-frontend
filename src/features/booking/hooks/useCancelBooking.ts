import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { ApiError, newIdempotencyKey } from "@/lib/api";
import { useIdToken } from "@/stores/useAuthStore";

import { cancelBooking } from "../lib/api/cancelBooking";

/** Fallback copy when a failure carries no usable message. */
export const CANCEL_ERROR_MESSAGE =
  "We couldn't cancel this booking just now. Please try again.";

/** Copy for the one failure the patient can act on differently. */
export const CANCEL_CONFLICT_MESSAGE =
  "This booking has already moved on, so it can no longer be cancelled here.";

export interface CancelBookingState {
  cancel: () => void;
  isCancelling: boolean;
  /** Set once a cancellation has committed. */
  isCancelled: boolean;
  /** Present only after a failed attempt. */
  errorMessage: string | null;
  /**
   * Present on the committed response only when this `on_demand` cancellation
   * settled as a partial capture rather than a full refund — a late
   * cancellation past the two-minute post-acceptance grace window
   * (ADR-20260808-03, ADR-20260909-01, contract: `Booking.settlementReason`).
   * `undefined` before `isCancelled` and on every ordinary, fully-refunded
   * cancellation.
   */
  settlementReason?: string;
}

/**
 * Cancel one booking and re-read the state that depends on it.
 *
 * **One idempotency key per mounted action, not per attempt.** The key is held in
 * a ref rather than generated inside `mutationFn`, so pressing Cancel again after
 * a timeout replays the *same* write. The backend stores the response against the
 * key, so the replay returns the original outcome. With a fresh key each attempt,
 * the second write would find the booking already `cancelled`, fail the status
 * condition, and report `409` for something that had in fact succeeded — the
 * patient would be told their cancellation failed while their money was already
 * being released.
 *
 * Nothing is patched locally on success. Cancellation has server-side effects
 * beyond the status field (slot release, refund of a held payment), so the
 * booking is re-read rather than guessed at.
 */
export function useCancelBooking(bookingId: string): CancelBookingState {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      idempotencyKeyRef.current ??= newIdempotencyKey();
      return cancelBooking(idToken ?? "", bookingId, idempotencyKeyRef.current);
    },
    onSuccess: () => {
      // Prefix matches: both keys carry the id token as a trailing element.
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({
        queryKey: ["booking-finding", bookingId],
      });
    },
    retry: false,
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError && mutation.error.status === 409
      ? CANCEL_CONFLICT_MESSAGE
      : mutation.error instanceof Error && mutation.error.message
        ? mutation.error.message
        : CANCEL_ERROR_MESSAGE
    : null;

  return {
    cancel: () => mutation.mutate(),
    isCancelling: mutation.isPending,
    isCancelled: mutation.isSuccess,
    errorMessage,
    settlementReason: mutation.data?.settlementReason,
  };
}
