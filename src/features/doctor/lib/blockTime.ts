/**
 * "Block time" from the doctor dashboard's Upcoming-today card (Task 4).
 *
 * There is no single backend call that publishes a slot already `blocked` —
 * `POST /v1/doctors/{doctorId}/schedules` (`CreateSlotRequest`) has no `status`
 * field at all; every created slot starts `available` and is blocked by a
 * follow-up `PUT .../schedules/{slotId}` (`UpdateSlotRequest.status`). This is
 * the same two-step the doctor already performs by hand from
 * `ActiveDaySlotList`'s "Block" button, just applied to slots that do not exist
 * yet instead of ones already published — so blocking out a fresh two-hour
 * window this way both creates the underlying availability records and marks
 * them blocked in the same user action, reusing `planSlots` for the overlap
 * arithmetic and `createSlot`/`updateSlot` for the two backend calls.
 *
 * Both steps can fail independently, and the three resulting outcomes are kept
 * distinct rather than collapsed into a single created/failed pair:
 *
 * - **blocked** — created and successfully flipped to `blocked`. The doctor's
 *   intent was fully realised.
 * - **partial** — created but the block update failed. This is *worse* than an
 *   outright failure to hide: the slot now exists and is `available`, which
 *   means it is bookable by a patient — the opposite of what "Block time" was
 *   asked to do. Silently reporting only "created" here would leave the
 *   calendar looking blocked when it is not.
 * - **failed** — never created at all, most often because the window overlaps
 *   a slot the doctor already has (`409 STATE_CONFLICT`).
 */

import { ApiError } from "@/lib/api";
import { createSlot, updateSlot, type Slot, type SlotDuration } from "./api/schedule";
import { newIdempotencyKey } from "@/lib/idempotency";

export interface BlockTimeFailure {
  /** HH:MM of the slot that was never created. */
  startTime: string;
  code?: string;
  message: string;
}

export interface BlockTimePartial {
  /** HH:MM of the slot that was created but could not be marked blocked. */
  startTime: string;
  /** The slot as it now exists on the backend — `available`, not `blocked`. */
  slot: Slot;
  message: string;
}

export interface BlockTimeResult {
  /** Slots created and confirmed blocked. */
  blocked: Slot[];
  /** Slots created but still `available` because the block update failed. */
  partial: BlockTimePartial[];
  /** Windows never created at all. */
  failures: BlockTimeFailure[];
}

/**
 * Create and block one or more time windows on one date.
 *
 * Mirrors {@link ./api/schedule.ts}'s `createSlots`: requests run sequentially,
 * each gets its own idempotency key (reusing one across distinct windows would
 * make every request after the first a replay of the first), and one window
 * failing does not abort the rest — a doctor blocking out an afternoon would
 * rather have the hours that succeeded blocked and be told which one did not.
 */
export async function createBlockedSlots(
  idToken: string,
  doctorId: string,
  date: string,
  requests: ReadonlyArray<{ startTime: string; durationMinutes: SlotDuration; notes?: string }>,
): Promise<BlockTimeResult> {
  const blocked: Slot[] = [];
  const partial: BlockTimePartial[] = [];
  const failures: BlockTimeFailure[] = [];

  for (const request of requests) {
    let created: Slot;
    try {
      created = await createSlot(
        idToken,
        doctorId,
        { date, startTime: request.startTime, durationMinutes: request.durationMinutes, ...(request.notes ? { notes: request.notes } : {}) },
        newIdempotencyKey(),
      );
    } catch (err) {
      failures.push({
        startTime: request.startTime,
        ...(err instanceof ApiError ? { code: err.code } : {}),
        message:
          err instanceof ApiError ? err.message : "The server did not accept this window.",
      });
      continue;
    }

    try {
      const blockedSlot = await updateSlot(
        idToken,
        doctorId,
        created.slotId,
        date,
        { status: "blocked" },
        newIdempotencyKey(),
      );
      blocked.push(blockedSlot);
    } catch (err) {
      partial.push({
        startTime: request.startTime,
        slot: created,
        message:
          err instanceof ApiError
            ? err.message
            : "The slot was created but could not be marked blocked.",
      });
    }
  }

  return { blocked, partial, failures };
}
