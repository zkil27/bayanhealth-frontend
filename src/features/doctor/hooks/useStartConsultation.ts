"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, newIdempotencyKey } from "@/lib/api";
import {
  fetchBookingConsultationState,
  startConsultation,
} from "@/features/consultation/lib/api/consultSession";
import { useIdToken } from "@/stores/useAuthStore";

export type StartConsultationStatus = "idle" | "starting" | "error";

/**
 * Start a consultation as the assigned doctor (ADR-20260806-01, ADR-20260808-01).
 *
 * One backend call: `POST /v1/bookings/{bookingId}/start`, which creates the
 * consultation session and moves the booking to `in_progress` — the transition
 * that unlocks chat and creates the canonical CDS session.
 *
 * This hook used to mint a one-time link and immediately consume it, because the
 * OTL was the only thing that could make that transition. The link is gone
 * (ADR-20260808-04). Both participants now reach the same conversation at
 * `/consultation/room/{bookingId}`.
 *
 * If a session already exists — a resumed consultation, or a second click — the
 * hook navigates into the room instead of failing.
 *
 * That check reads `existing.session`, not merely whether the read succeeded.
 * `GET /v1/bookings/{bookingId}/state` now answers successfully for the
 * pre-consult phase too (ADR-20260809-05) — a `confirmed` booking with an
 * assigned doctor resolves with `session` absent, so chat can load before the
 * consultation starts. This hook originally treated *any* successful response as
 * "already running" and short-circuited straight to `enterRoom()` without ever
 * calling `/start`. The button pressed, nothing happened on the server, and the
 * doctor was silently re-navigated to the same pre-consult screen — which is
 * exactly what "Start consultation doesn't do anything" looked like from outside
 * (ADR-20260809-09).
 */
export function useStartConsultation() {
  const idToken = useIdToken();
  const router = useRouter();
  const [status, setStatus] = useState<StartConsultationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Reuse one idempotency key across retries of the same logical start.
  const keyRef = useRef<string | null>(null);

  const start = useCallback(
    async (bookingId: string): Promise<boolean> => {
      if (!idToken) {
        setStatus("error");
        setError("Your session has expired. Please sign in again.");
        return false;
      }

      setStatus("starting");
      setError(null);
      keyRef.current ??= newIdempotencyKey();

      const enterRoom = () => {
        keyRef.current = null;
        setStatus("idle");
        router.push(`/consultation/room/${encodeURIComponent(bookingId)}`);
        return true;
      };

      // Already running (or already ended and restarted): join rather than start.
      // Gated on `session`, not on the read merely succeeding — a pre-consult
      // `confirmed` booking also resolves successfully here, with no session, and
      // must fall through to the actual `/start` call below.
      const existing = await fetchBookingConsultationState(idToken, bookingId).catch(
        () => null,
      );
      if (existing?.session) return enterRoom();

      try {
        // One authenticated call. This used to issue a one-time link and then
        // immediately consume it, purely because the OTL was the only thing that
        // could move the booking to `in_progress` and create the CDS session — so a
        // transient failure between the two steps left a live token nobody could
        // read and the doctor locked out until it expired. That is why the OTL was
        // replaced rather than kept alongside this (ADR-20260808-04).
        await startConsultation(idToken, bookingId, keyRef.current);
        return enterRoom();
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            setStatus("error");
            setError(
              "This booking is not ready to start. It must be confirmed, and it may have been cancelled or already started elsewhere.",
            );
            return false;
          }
          if (err.code === "KYC_VERIFICATION_REQUIRED") {
            setStatus("error");
            setError(
              "Your KYC verification must be approved before you can start consultations.",
            );
            return false;
          }
          setStatus("error");
          setError(err.message);
          return false;
        }
        setStatus("error");
        setError("Could not start the consultation. Please try again.");
        return false;
      }
    },
    [idToken, router],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { start, status, error, reset };
}
