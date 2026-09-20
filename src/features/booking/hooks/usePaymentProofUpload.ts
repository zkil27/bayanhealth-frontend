"use client";

import { useCallback, useRef, useState } from "react";

import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingDetail } from "../lib/api/bookingDetail";
import {
  PaymentProofError,
  submitPaymentProof,
  toPaymentProofError,
  type ProofContentType,
} from "../lib/api/paymentProof";

/**
 * Discrete states of a payment-proof submission driven by the
 * presign -> PUT upload -> confirm chain.
 *
 * - `idle`        — nothing submitted yet, or a prior attempt failed.
 * - `submitting`  — the chain is in flight.
 * - `submitted`   — every step succeeded; the booking is now `payment_submitted`.
 * - `error`       — a step failed; the proof is NOT shown as submitted.
 */
export type PaymentProofStatus = "idle" | "submitting" | "submitted" | "error";

export interface UsePaymentProofUpload {
  /** Run (or retry) the submission for `file`. Retries reuse idempotency keys. */
  submit: (file: File) => Promise<void>;
  /** Reset back to `idle`, minting fresh idempotency keys. */
  reset: () => void;
  status: PaymentProofStatus;
  /** The updated booking, present only when `status === "submitted"`. */
  booking: BookingDetail | null;
  /** The failure, present only when `status === "error"`. */
  error: PaymentProofError | null;
  isSubmitting: boolean;
}

/**
 * Wire patient payment-proof submission to the presign -> upload -> confirm
 * chain for a booking. On success the booking transitions to `payment_submitted`
 * and is exposed; on any step failure the status becomes `error` and the proof
 * is kept un-submitted.
 *
 * One UUID v4 `Idempotency-Key` is minted per write step (presign, confirm) and
 * reused across retries of the same logical submission, matching the app-wide
 * write-retry convention.
 */
export function usePaymentProofUpload(bookingId: string): UsePaymentProofUpload {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const presignKey = useRef(createIdempotencyKeyManager());
  const confirmKey = useRef(createIdempotencyKeyManager());

  const [status, setStatus] = useState<PaymentProofStatus>("idle");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<PaymentProofError | null>(null);

  const submit = useCallback(
    async (file: File) => {
      setStatus("submitting");
      setError(null);
      setBooking(null);

      const contentType = file.type as ProofContentType;

      try {
        const updated = await submitPaymentProof({
          bookingId,
          idToken: idToken ?? "",
          file,
          contentType,
          presignIdempotencyKey: presignKey.current.current(),
          confirmIdempotencyKey: confirmKey.current.current(),
        });
        presignKey.current.reset();
        confirmKey.current.reset();
        setBooking(updated);
        setStatus("submitted");
      } catch (err) {
        // Keep keys so an immediate retry is the same logical submission.
        setBooking(null);
        setError(toPaymentProofError("confirm", err));
        setStatus("error");
      }
    },
    [bookingId, idToken],
  );

  const reset = useCallback(() => {
    presignKey.current.reset();
    confirmKey.current.reset();
    setBooking(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    submit,
    reset,
    status,
    booking,
    error,
    isSubmitting: status === "submitting",
  };
}
