"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { ApiError, newIdempotencyKey } from "@/lib/api";
import { useIdToken } from "@/stores/useAuthStore";

import {
  assertBookingNoShow,
  type NoShowSettledBooking,
} from "@/features/consultation/lib/api/consultSession";

import { DOCTOR_INTAKE_QUEUE_QUERY_KEY } from "./usePatientBoard";

/** Fallback copy when a failure carries no usable message. */
export const NO_SHOW_ERROR_MESSAGE =
  "We couldn't record this as a no-show just now. Please try again.";

/** Copy for the one failure the doctor can act on differently: too early. */
export const NO_SHOW_TOO_EARLY_MESSAGE =
  "The ten-minute wait since acceptance hasn't elapsed yet.";

/** Copy for a booking that moved out from under this action entirely. */
export const NO_SHOW_CONFLICT_MESSAGE =
  "This booking is no longer eligible — it may have started, been cancelled, or already been settled.";

export interface AssertNoShowState {
  assertNoShow: () => void;
  isAsserting: boolean;
  /** Set once the no-show has been recorded. */
  isSettled: boolean;
  /** Present only after a failed attempt. */
  errorMessage: string | null;
}

/**
 * Assert that the patient never joined an accepted on-demand consultation
 * (ADR-20260808-03, ADR-20260909-01).
 *
 * Mirrors `useCancelBooking`'s idempotency shape exactly, for the identical
 * reason: **one idempotency key per mounted action, not per attempt**, held in
 * a ref rather than generated inside `mutationFn`. A retry after an ambiguous
 * network failure has to replay the *same* write — with a fresh key each
 * attempt, the second write would find the booking already `cancelled`, fail
 * the backend's own condition, and report `409` for a no-show that had in fact
 * already been recorded.
 *
 * On success, invalidates the doctor's intake-queue query
 * (`DOCTOR_INTAKE_QUEUE_QUERY_KEY`) rather than patching the row locally: the
 * settlement has server-side effects beyond the booking's own status (partial
 * capture, payout, the booking dropping off `listDoctorIntakeQueue`'s own
 * `#status = :confirmed` filter), so the row is left to the next real read
 * rather than guessed at — the same reasoning `useCancelBooking` gives for not
 * patching its own booking query.
 */
export function useAssertNoShow(bookingId: string): AssertNoShowState {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);

  const mutation = useMutation<NoShowSettledBooking>({
    mutationFn: () => {
      idempotencyKeyRef.current ??= newIdempotencyKey();
      return assertBookingNoShow(idToken ?? "", bookingId, idempotencyKeyRef.current);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
    },
    retry: false,
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError && mutation.error.status === 409
      ? typeof mutation.error.details?.retryAfterMs === "number"
        ? NO_SHOW_TOO_EARLY_MESSAGE
        : NO_SHOW_CONFLICT_MESSAGE
      : mutation.error instanceof Error && mutation.error.message
        ? mutation.error.message
        : NO_SHOW_ERROR_MESSAGE
    : null;

  return {
    assertNoShow: () => mutation.mutate(),
    isAsserting: mutation.isPending,
    isSettled: mutation.isSuccess,
    errorMessage,
  };
}
