/**
 * Pure layout math for the weekly schedule grid (D2 design).
 *
 * A day's slots are independent rows from the backend — there is no "shift"
 * object linking them — so the grid has to reconstruct visual blocks itself.
 * {@link groupContiguousSlots} merges slots that sit back-to-back in time (the
 * common case: a shift is created as one run of same-length slots) into a
 * single block, and classifies it from what the slots themselves say:
 * `blocked` only when every slot in the run is blocked, `mixed` when any slot
 * has been booked (the block shows a real booked/available count, not a
 * guess), and `open` otherwise.
 */

import { parseTimeToMinutes } from "./slotPlan";
import type { Slot } from "../../lib/api/schedule";

export type ShiftBlockStatus = "open" | "mixed" | "blocked";

export interface ShiftBlock {
  startMinutes: number;
  endMinutes: number;
  slots: Slot[];
  status: ShiftBlockStatus;
  bookedCount: number;
  availableCount: number;
  /** Notes shared by every slot in the block, when they all carry the same one. */
  notes: string | null;
}

function slotBounds(slot: Slot): { start: number; end: number } | null {
  const start = parseTimeToMinutes(slot.startTime);
  if (start === null) return null;
  return { start, end: start + slot.durationMinutes };
}

function finalizeBlock(group: { start: number; end: number; slots: Slot[] }): ShiftBlock {
  const bookedCount = group.slots.filter((s) => s.status === "booked").length;
  const blockedCount = group.slots.filter((s) => s.status === "blocked").length;
  const availableCount = group.slots.filter((s) => s.status === "available").length;
  const status: ShiftBlockStatus =
    blockedCount === group.slots.length ? "blocked" : bookedCount > 0 ? "mixed" : "open";
  const firstNotes = group.slots[0]?.notes?.trim() || null;
  const notes =
    firstNotes && group.slots.every((s) => (s.notes?.trim() || null) === firstNotes)
      ? firstNotes
      : null;
  return {
    startMinutes: group.start,
    endMinutes: group.end,
    slots: group.slots,
    status,
    bookedCount,
    availableCount,
    notes,
  };
}

/** Merge a day's slots (any order) into contiguous visual blocks, ascending by start time. */
export function groupContiguousSlots(daySlots: readonly Slot[]): ShiftBlock[] {
  const withBounds = daySlots
    .map((slot) => {
      const bounds = slotBounds(slot);
      return bounds ? { slot, ...bounds } : null;
    })
    .filter((x): x is { slot: Slot; start: number; end: number } => x !== null)
    .sort((a, b) => a.start - b.start);

  const blocks: ShiftBlock[] = [];
  let current: { start: number; end: number; slots: Slot[] } | null = null;

  for (const { slot, start, end } of withBounds) {
    if (current && start === current.end) {
      current.end = end;
      current.slots.push(slot);
    } else {
      if (current) blocks.push(finalizeBlock(current));
      current = { start, end, slots: [slot] };
    }
  }
  if (current) blocks.push(finalizeBlock(current));
  return blocks;
}

/** Default grid window (the D2 design's 8 AM – 6 PM), widened to fit real data outside it. */
export const DEFAULT_GRID_START_MINUTES = 8 * 60;
export const DEFAULT_GRID_END_MINUTES = 18 * 60;

/** The minimum a thing must expose to be placed on the grid. */
export interface TimeSpan {
  startMinutes: number;
  endMinutes: number;
}

/**
 * The grid's visible time window: the default window, widened to hour
 * boundaries that fit everything drawn on it.
 *
 * Typed on {@link TimeSpan} rather than `ShiftBlock` because the grid now draws
 * calendar entries — appointments included — and the window has to widen for an
 * early on-demand consultation exactly as it does for a published shift.
 */
export function computeGridBounds(
  blocksByDay: ReadonlyArray<readonly TimeSpan[]>,
): { startMinutes: number; endMinutes: number } {
  let start = DEFAULT_GRID_START_MINUTES;
  let end = DEFAULT_GRID_END_MINUTES;
  for (const blocks of blocksByDay) {
    for (const block of blocks) {
      start = Math.min(start, Math.floor(block.startMinutes / 60) * 60);
      end = Math.max(end, Math.ceil(block.endMinutes / 60) * 60);
    }
  }
  return { startMinutes: start, endMinutes: end };
}

/** Hour marks across the grid window, every one hour, providing clinical schedule density. */
export function hourMarks(startMinutes: number, endMinutes: number): number[] {
  const marks: number[] = [];
  for (let m = startMinutes; m < endMinutes; m += 60) marks.push(m);
  return marks;
}

/** "8 AM" / "12 PM" / "2 PM" from minutes-since-midnight. */
export function formatHourLabel(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12} ${period}`;
}

/** "8" / "12" — compact hour, for a block's own time-range label. */
function compactHour(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return String(hour12);
}

/** "8–12" from a block's start/end minutes, for the D2 design's block label. */
export function formatBlockRange(startMinutes: number, endMinutes: number): string {
  return `${compactHour(startMinutes)}–${compactHour(endMinutes)}`;
}

/** A block's vertical position within the grid, as CSS percentages. */
export function blockPosition(
  block: TimeSpan,
  gridStart: number,
  gridEnd: number,
): { topPct: number; heightPct: number } {
  const span = gridEnd - gridStart || 1;
  const top = ((block.startMinutes - gridStart) / span) * 100;
  const height = ((block.endMinutes - block.startMinutes) / span) * 100;
  return { topPct: Math.max(0, top), heightPct: Math.max(0, height) };
}
