/**
 * "Play once" memory for the authored success moments (booking confirmed,
 * doctor accepted, consult complete, document signed or released).
 *
 * Booking screens poll and remount, so without this a confirmation mark
 * would redraw every 30 seconds. A moment is remembered in the tab's
 * `sessionStorage`; keys hold only an event name and an id, never health
 * details. Where storage is missing or blocked, the moment counts as seen and
 * the mark renders static: a skipped animation is safe, a looping one is not.
 *
 * UI-only. No API, schema, or payload change.
 */

import type { StorageLike } from "./intakeDraft";

export const MOTION_MOMENT_PREFIX = "bh:moment:v1:";

/** True once this moment has played in this tab (or when storage is unusable). */
export function hasSeenMoment(storage: StorageLike | null, key: string): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(MOTION_MOMENT_PREFIX + key) !== null;
  } catch {
    return true;
  }
}

export function markMomentSeen(storage: StorageLike | null, key: string): void {
  if (!storage) return;
  try {
    storage.setItem(MOTION_MOMENT_PREFIX + key, "1");
  } catch {
    // Blocked storage: the moment simply may play again on a later mount.
  }
}

/** Returns true only the first time `key` is claimed in this tab. */
export function claimMoment(storage: StorageLike | null, key: string): boolean {
  if (hasSeenMoment(storage, key)) return false;
  markMomentSeen(storage, key);
  return hasSeenMoment(storage, key);
}
