/**
 * Slot wall-clock time -> instant, on the client.
 *
 * A slot carries `date` (YYYY-MM-DD) and `startTime` (HH:MM) as the doctor's
 * local wall-clock time with no timezone attached. The backend resolves those
 * against a single stated offset — `PLATFORM_UTC_OFFSET_MINUTES` in
 * `backend/src/lib/schedule.ts`, Asia/Manila / UTC+08:00, fixed because the
 * Philippines has observed no DST since 1978 (ADR-20260807-01). This module is
 * the client half of that same rule, so both sides place a slot on the timeline
 * identically instead of each using the browser's timezone.
 *
 * Why it exists at all: the doctor detail page listed every `available` slot
 * including ones whose start time had already passed, and the patient could
 * select and submit one. `POST /v1/bookings` now correctly refuses a slot that
 * has already started with `409 SLOT_UNAVAILABLE`, so offering it produces a
 * confusing failure at the last step of the booking flow. Filtering here means a
 * past slot is never offered in the first place.
 *
 * The list is deliberately still filtered client-side rather than by asking the
 * backend for "future slots only": the server remains the authority that refuses
 * a stale slot, and this only avoids presenting a choice that is certain to be
 * rejected.
 */

/** Fixed offset, in minutes east of UTC, that slot wall-clock times mean. */
export const PLATFORM_UTC_OFFSET_MINUTES = 8 * 60;

/** Minimal slot shape this module needs. */
export interface SlotWallClock {
  date: string;
  startTime: string;
}

/**
 * The instant a slot begins, in epoch milliseconds, or `null` when its stored
 * `date`/`startTime` cannot be placed on a calendar.
 *
 * Rejects a date the `Date` constructor would roll over (2026-02-30 becoming
 * March 2) rather than silently treating it as a different day.
 */
export function slotStartMs(slot: SlotWallClock): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(slot.date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(slot.startTime.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours > 23 || minutes > 59) return null;

  const midnightUtc = Date.UTC(year, month - 1, day);
  const probe = new Date(midnightUtc);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return midnightUtc + (hours * 60 + minutes - PLATFORM_UTC_OFFSET_MINUTES) * 60_000;
}

/**
 * Is this slot still bookable on the clock?
 *
 * A slot whose `date`/`startTime` cannot be parsed returns `false`: an
 * unplaceable slot cannot be booked either, since the backend derives the
 * booking time from those same fields and refuses what it cannot resolve.
 *
 * @param now - Injectable for deterministic tests.
 */
export function isSlotInFuture(slot: SlotWallClock, now: number = Date.now()): boolean {
  const start = slotStartMs(slot);
  return start !== null && start > now;
}

/**
 * The slots a patient may still choose: published, unclaimed, and not yet begun.
 *
 * `status === "available"` alone was the previous rule, which is necessary but
 * not sufficient — a 09:00 slot is still `available` at 15:00 on the same day.
 */
export function selectableSlots<T extends SlotWallClock & { status: string }>(
  slots: readonly T[],
  now: number = Date.now(),
): T[] {
  return slots.filter((slot) => slot.status === "available" && isSlotInFuture(slot, now));
}
