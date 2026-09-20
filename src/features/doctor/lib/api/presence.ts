import { api, ApiError } from "@/lib/api";

/**
 * Booking presence — read access only, for the doctor dashboard's "patient
 * waiting" signal on the Ready-to-start card (Task 3 of the doctor-dashboard
 * rebuild).
 *
 * `GET /v1/bookings/{bookingId}/presence` is the documented HTTP fallback for
 * realtime presence (contracts/openapi.yaml#getBookingPresence) and was, before
 * this, called from nowhere in the frontend — the WebSocket-driven presence
 * inside an active consultation room is a separate, session-scoped concern.
 * This module exists only to answer one narrow question from outside the
 * room: is the patient on this booking online right now.
 *
 * The backend requires a **live** session to answer (`requireLiveChatBookingContext`
 * — booking `in_progress` with an active session), and returns `409` otherwise.
 * That is not a failure from this module's point of view: a "ready" booking
 * that has not been started yet simply has no presence to report, so `409`
 * degrades to `null` here exactly like `404` does, and the caller renders no
 * badge rather than a false "offline".
 */

export type PresenceStatus = "online" | "offline";

export interface BookingPresenceParticipant {
  userId: string;
  role: "patient" | "doctor";
  status: PresenceStatus;
  lastSeenAt: string;
  isTyping: boolean;
}

export interface BookingPresenceResponse {
  bookingId: string;
  sessionId: string;
  participants: BookingPresenceParticipant[];
}

/**
 * Read presence for one booking, or `null` when presence cannot be reported —
 * absent auth, no live session yet (`409`), or the booking is not visible to
 * this caller (`404`). Any other failure propagates so a real outage is not
 * mistaken for "nothing to show".
 */
export async function fetchBookingPresence(
  idToken: string,
  bookingId: string,
): Promise<BookingPresenceResponse | null> {
  if (!idToken || !bookingId) return null;
  try {
    const res = await api.get<BookingPresenceResponse>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/presence`,
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
 * Whether the patient on this booking is online, per a presence read.
 *
 * `null` — never `false` — when the answer is unknown: no read yet, the read
 * failed, or no patient participant is present in the snapshot. Collapsing
 * "unknown" into "offline" is exactly the two-state mistake the intake safety
 * screen (`ReadyIntakeContent.tsx`) already avoids for red-flag answers — an
 * absent signal is not a negative one, and a UI that renders it as one hides
 * the gap instead of naming it.
 */
export function isPatientOnline(
  presence: BookingPresenceResponse | null | undefined,
): boolean | null {
  if (!presence) return null;
  const patient = presence.participants.find((p) => p.role === "patient");
  if (!patient) return null;
  return patient.status === "online";
}
