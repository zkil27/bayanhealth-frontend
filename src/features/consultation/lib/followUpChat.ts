/**
 * The post-consult follow-up window: a short, doctor-started chance to ask the
 * patient something that was missed during the consult (clinical remarks
 * Nov 16, slide 12; window fixed at 3 minutes on 2026-11-23).
 *
 * BACKEND DEPENDENCY (CHANGELOG_UI_V4, "Backend dependencies" #1). A booking
 * is `completed` by the time the doctor is documenting, and the chat write
 * route refuses messages on a completed booking. Until the backend ships:
 *
 *   1. an endpoint the doctor calls to open the window, which returns the
 *      instant the window closes (`chatWritableUntil`, ISO 8601), and
 *   2. the chat write route accepting messages from either side until then,
 *
 * {@link startFollowUpWindow} reports `unavailable` for a completed booking,
 * and the popup shows the conversation read-only. (A booking not yet
 * completed already accepts messages, so the window runs on the client clock.) Demo and preview bookings
 * run the whole flow on a client clock so the UI can be reviewed.
 *
 * Upstream wiring: replace the body of `startFollowUpWindow` with the call,
 * and let `readFollowUpWindow` pick the field off the booking detail. Nothing
 * else in the UI needs to change.
 */

/** How long the patient can reply once the doctor starts a follow-up. */
export const FOLLOW_UP_WINDOW_MS = 3 * 60 * 1000;

export type FollowUpStart =
  | { kind: "open"; writableUntil: string }
  | { kind: "unavailable" };

/** Booking ids the chat hook already serves from local demo data. */
export function isDemoChatBooking(bookingId: string): boolean {
  return bookingId === "demo" || bookingId === "preview";
}

/**
 * The window the server already reports for this booking, if any (for
 * example after a reload while one is open). Read defensively: the field is
 * not in the contract yet.
 */
export function readFollowUpWindow(booking: unknown): string | null {
  if (!booking || typeof booking !== "object") return null;
  const value = (booking as { chatWritableUntil?: unknown }).chatWritableUntil;
  if (typeof value !== "string") return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

/**
 * Open the 3-minute follow-up window. See the module note for the backend seam.
 *
 * @param chatStillOpen - the booking is not yet completed, so the server
 *   already accepts messages and the client clock alone bounds the window.
 */
export async function startFollowUpWindow(
  bookingId: string,
  { chatStillOpen }: { chatStillOpen: boolean },
): Promise<FollowUpStart> {
  if (isDemoChatBooking(bookingId) || chatStillOpen) {
    return { kind: "open", writableUntil: new Date(Date.now() + FOLLOW_UP_WINDOW_MS).toISOString() };
  }
  return { kind: "unavailable" };
}

/** `m:ss`, never negative. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
