/**
 * Mandatory-wait arithmetic for the doctor-asserted no-show control
 * (ADR-20260808-03, ADR-20260909-01).
 *
 * A doctor may not assert a no-show the instant they accept an on-demand
 * request — `POST /v1/bookings/{bookingId}/no-show` requires at least ten
 * minutes to have elapsed since `Booking.acceptedAt`
 * (`backend/src/handlers/bookings.ts#NO_SHOW_WAIT_MS`) and answers `409` with
 * `retryAfterMs` when called early. This mirrors that constant client-side so
 * "Ready to start" can disable the control and show a live countdown instead
 * of letting the doctor discover the wait by having the call rejected.
 *
 * Kept pure and separate from `ReadyToStartCard` for the same reason
 * `frontend/bayan-health-mvp/src/features/booking/lib/waitElapsed.ts` keeps
 * its own clock arithmetic separate from its component: testable without
 * mounting React or faking timers.
 */

/** Mirrors `NO_SHOW_WAIT_MS` in `backend/src/handlers/bookings.ts` exactly. */
export const NO_SHOW_WAIT_MS = 10 * 60 * 1000;

/**
 * Milliseconds remaining before a no-show may be asserted, or `null` once the
 * wait has elapsed.
 *
 * `null` is the signal the control is enabled. A non-finite input (an
 * unparseable `acceptedAt`, which should not occur — the same "bad timestamp"
 * case `waitElapsed.ts#isUsableWaitStart` guards against) fails closed to
 * "the full wait remains" rather than "elapsed": a no-show assertion moves
 * real money, so bad data must never read as permission to act, only ever as
 * a reason to keep the control disabled.
 */
export function noShowWaitRemainingMs(
  acceptedAtMs: number,
  nowMs: number,
  waitMs: number = NO_SHOW_WAIT_MS,
): number | null {
  if (!Number.isFinite(acceptedAtMs) || !Number.isFinite(nowMs)) return waitMs;
  const remaining = waitMs - Math.max(0, nowMs - acceptedAtMs);
  return remaining > 0 ? remaining : null;
}
