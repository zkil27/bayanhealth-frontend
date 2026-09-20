/**
 * Pure planning for bulk slot generation.
 *
 * The doctor describes a shift (start, end, slot length) and the UI has to say
 * exactly what will happen *before* any write leaves the browser. Keeping the
 * arithmetic here, away from the form, is what makes "you are about to create 6
 * slots, 2 of which already exist" a checkable claim rather than a guess.
 *
 * The overlap check here is a courtesy, not the guarantee. `POST
 * /v1/doctors/{doctorId}/schedules` now rejects a window that overlaps an
 * existing slot on that date with `409 STATE_CONFLICT`, whatever the existing
 * slot's status, so a doctor who regenerates a shift cannot publish a duplicate
 * time even by bypassing this screen. Skipping known overlaps client-side keeps
 * the preview honest and avoids requests that are certain to be refused; the
 * backend remains the thing that decides.
 */

import type { Slot, SlotDuration } from "../../lib/api/schedule";

/** Minutes since midnight for an `HH:MM` string, or null when unparseable. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes since midnight back to the zero-padded `HH:MM` the contract requires. */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export interface SlotPlanInput {
  /** HH:MM the shift starts. */
  startTime: string;
  /** HH:MM the shift ends; the last slot must finish on or before it. */
  endTime: string;
  durationMinutes: SlotDuration;
  /** Slots already published on the target date, in any status. */
  existing: Slot[];
}

export interface SlotPlan {
  /** Start times that will be sent to the backend, ascending. */
  startTimes: string[];
  /** Start times skipped because they overlap a slot the doctor already has. */
  overlapping: string[];
  /** Why nothing can be generated, when that is the case. */
  error: string | null;
}

/** True when two [start, start+duration) minute windows intersect. */
function overlaps(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  return startA < startB + durationB && startB < startA + durationA;
}

/**
 * Work out which slots a shift would create against what already exists.
 *
 * An empty `startTimes` with a null `error` is not possible: either the shift
 * yields at least one slot, or `error` explains why it yields none.
 */
export function planSlots({
  startTime,
  endTime,
  durationMinutes,
  existing,
}: SlotPlanInput): SlotPlan {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) {
    return {
      startTimes: [],
      overlapping: [],
      error: "Enter a start and end time as HH:MM.",
    };
  }
  if (end <= start) {
    return {
      startTimes: [],
      overlapping: [],
      error: "The shift must end after it starts.",
    };
  }
  if (end - start < durationMinutes) {
    return {
      startTimes: [],
      overlapping: [],
      error: `This shift is shorter than one ${durationMinutes}-minute slot.`,
    };
  }

  const taken = existing
    .map((slot) => ({
      start: parseTimeToMinutes(slot.startTime),
      duration: slot.durationMinutes,
    }))
    .filter((slot): slot is { start: number; duration: number } =>
      slot.start !== null,
    );

  const startTimes: string[] = [];
  const overlapping: string[] = [];

  for (let at = start; at + durationMinutes <= end; at += durationMinutes) {
    const clashes = taken.some((slot) =>
      overlaps(at, durationMinutes, slot.start, slot.duration),
    );
    (clashes ? overlapping : startTimes).push(formatMinutesToTime(at));
  }

  return {
    startTimes,
    overlapping,
    error:
      startTimes.length === 0
        ? "Every slot in this shift overlaps one you already have."
        : null,
  };
}
