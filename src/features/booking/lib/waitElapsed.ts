/**
 * Elapsed-wait formatting for the on-demand request pool.
 *
 * A patient who has paid for an on-demand consultation is waiting on a human
 * decision with no deadline attached to it, so the one honest thing the UI can
 * show is how long they have actually been waiting. This deliberately does not
 * estimate a remaining time: the platform has no queue depth, no acceptance-rate
 * history, and no way to know whether a doctor is about to look at the pool, so
 * any "about 2 minutes left" would be invented.
 *
 * Kept pure and separate from the component so the clock arithmetic is testable
 * without mounting React or faking timers.
 */

/** Milliseconds in a minute / an hour, named to keep the arithmetic readable. */
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Format the gap between two instants as a stopwatch reading.
 *
 * @param sinceMs - When the wait started, in epoch milliseconds.
 * @param nowMs   - The current instant, in epoch milliseconds.
 * @returns `M:SS` under an hour, `H:MM:SS` at or beyond one hour.
 *
 * Both a non-finite input and a `sinceMs` in the future clamp to `0:00` rather
 * than rendering `NaN:NaN` or a negative countdown. A future `sinceMs` is not
 * hypothetical: `updatedAt` comes from the server while `nowMs` comes from the
 * patient's device, and a device clock that runs slow makes the wait look
 * negative.
 */
export function formatWaitElapsed(sinceMs: number, nowMs: number): string {
  const elapsedMs =
    Number.isFinite(sinceMs) && Number.isFinite(nowMs)
      ? Math.max(0, nowMs - sinceMs)
      : 0;

  const totalSeconds = Math.floor(elapsedMs / MS_PER_SECOND);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);

  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

/**
 * Whether a timestamp is usable as the start of a wait.
 *
 * The Unix epoch is treated as unusable on purpose. `toWizardBooking` falls back
 * to `new Date(0)` when a booking record carries no timestamps at all, and a
 * reading of `486000:00:00` is worse than no reading — so the caller can omit the
 * display instead of asserting a wait that never happened. "We do not know when
 * this started" and "this just started" are different claims.
 */
export function isUsableWaitStart(sinceMs: number): boolean {
  return Number.isFinite(sinceMs) && sinceMs > 0;
}

/**
 * Post-acceptance cancellation grace window (ADR-20260808-03).
 *
 * Mirrors `LATE_CANCELLATION_GRACE_MS` in `backend/src/handlers/bookings.ts`
 * exactly — a patient who cancels within two minutes of a doctor accepting
 * their on-demand request still gets a full refund; past this window,
 * cancelling settles as a 50% partial capture instead.
 */
export const LATE_CANCELLATION_GRACE_MS = 2 * 60 * 1000;

/**
 * Seconds remaining in the full-refund grace window, or `null` once it has
 * elapsed.
 *
 * Kept pure and separate from the component for the same reason
 * {@link formatWaitElapsed} is: clock arithmetic that is testable without
 * mounting React or faking timers. `null` is the signal to switch the caller's
 * copy from "cancel free for the next…" to the partial-charge warning — this
 * function does not itself decide which message to show.
 */
export function graceSecondsRemaining(
  acceptedAtMs: number,
  nowMs: number,
  graceMs: number = LATE_CANCELLATION_GRACE_MS,
): number | null {
  if (!Number.isFinite(acceptedAtMs) || !Number.isFinite(nowMs)) return null;
  const remainingMs = graceMs - Math.max(0, nowMs - acceptedAtMs);
  if (remainingMs <= 0) return null;
  return Math.ceil(remainingMs / MS_PER_SECOND);
}
