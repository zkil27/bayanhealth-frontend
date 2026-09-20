"use client";

import { useCallback, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useIdToken } from "@/stores/useAuthStore";
import {
  buildCreateBookingRequest,
  type BookingFormInput,
} from "../lib/createBookingRequest";

/** Minimal shape of the created booking returned by `POST /v1/bookings`. */
export interface CreatedBooking {
  bookingId: string;
  status: string;
  serviceType?: string;
  scheduledAt?: string;
  channel?: string;
  createdAt?: string;
}

/** Discrete states of a booking-create submission. */
export type CreateBookingStatus = "idle" | "submitting" | "success" | "error";

export interface UseCreateBooking {
  /** Submit (or retry) the booking. Retries reuse the same Idempotency-Key. */
  submit: (input: BookingFormInput) => Promise<CreatedBooking>;
  /** Reset back to the idle state (e.g. to start a brand-new booking). */
  reset: () => void;
  status: CreateBookingStatus;
  booking: CreatedBooking | null;
  error: { code: string; message: string } | null;
}

/**
 * Wire the patient booking-create flow to `POST /v1/bookings`.
 *
 * - A single UUID v4 `Idempotency-Key` is minted per logical booking and reused
 *   on every retry until the booking succeeds (Requirements 8.1, 8.5).
 * - On success the created booking id and `pending_payment` status are exposed
 *   for display (Requirement 8.2).
 * - On an error envelope the typed `code`/`message` are surfaced; the caller's
 *   input is retained and the view stays operable (Requirement 8.7).
 */
export function useCreateBooking(): UseCreateBooking {
  const idToken = useIdToken();
  const keyManager = useRef(createIdempotencyKeyManager());

  const [status, setStatus] = useState<CreateBookingStatus>("idle");
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  const submit = useCallback(
    async (input: BookingFormInput): Promise<CreatedBooking> => {
      if (!idToken) {
        setStatus("error");
        setError({
          code: "AUTH_REQUIRED",
          message: "You must be signed in to create a booking.",
        });
        throw new Error("AUTH_REQUIRED"); 
      }

      setStatus("submitting");
      setError(null);

      // Reuse the same key across retries of this logical booking.
      const idempotencyKey = keyManager.current.current();
      const body = buildCreateBookingRequest(input);

      try {
        const res = await api.post<CreatedBooking>(
          "/v1/bookings",
          idToken,
          body,
          idempotencyKey,
        );
        // Success: this logical request is done — the next booking mints a new key.
        keyManager.current.reset();
        setBooking(res.data);
        setStatus("success");

        return res.data;
      } catch (err) {
        // Keep the key so an immediate retry is treated as the same request.
        if (err instanceof ApiError) {
          setError({ code: err.code, message: err.message });
        } else {
          setError({
            code: "NETWORK_ERROR",
            message: "Could not reach the server. Please try again.",
          });
        }
        setStatus("error");
        throw err;
      }
    },
    [idToken],
  );

  const reset = useCallback(() => {
    keyManager.current.reset();
    setStatus("idle");
    setBooking(null);
    setError(null);
  }, []);

  return { submit, reset, status, booking, error };
}
