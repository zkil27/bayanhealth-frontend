/**
 * Pure view-state maths for the doctor's calendar.
 *
 * The screen previously had exactly one view — a fixed Monday–Sunday grid — and
 * one way to add availability: open a day, then type a start and an end time
 * into a form. That is the part this module exists to change. Everything a
 * calendar needs to answer before it can render (which dates am I showing, what
 * do I call this range, where does a pointer drag land on the clock) is
 * arithmetic, so it lives here and is tested directly rather than through a
 * rendered grid.
 *
 * Conventions, kept consistent with the rest of the schedule feature:
 * - Weeks start on Monday (`weekStartsOn: 1`), matching `DoctorScheduleView`.
 * - Times are minutes since local midnight, as in {@link ./weekGridLayout}.
 * - Dates crossing this boundary are `YYYY-MM-DD` strings, as the contract uses.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** The three ranges the calendar can show, mirroring Google Calendar's D/W/M. */
export type CalendarView = "day" | "week" | "month";

export const CALENDAR_VIEWS: readonly CalendarView[] = ["day", "week", "month"];

/**
 * Keyboard shortcuts, matching Google Calendar's so the muscle memory carries
 * over: `d`/`w`/`m` switch view, `t` jumps to today, and the arrow keys step the
 * visible range. `j`/`k` are Google's vim-style aliases for the same step.
 */
export const VIEW_SHORTCUTS: Readonly<Record<string, CalendarView>> = {
  d: "day",
  w: "week",
  m: "month",
};

/** How finely a pointer drag snaps to the clock. Google Calendar uses 15 minutes. */
export const DRAG_SNAP_MINUTES = 15;

/** The inclusive date span a view covers, as `Date`s at local midnight. */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * The dates a view covers for a given anchor date.
 *
 * Month deliberately returns whole weeks rather than the 1st–31st: a month grid
 * draws six Monday-started rows, and the leading and trailing days belong to the
 * neighbouring months. Fetching only the calendar month would leave those cells
 * blank even when the doctor has slots there.
 */
export function visibleRange(view: CalendarView, anchor: Date): DateRange {
  switch (view) {
    case "day":
      return { start: anchor, end: anchor };
    case "week":
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    case "month":
    default:
      return {
        start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
      };
  }
}

/** Every date in a view's range, ascending. */
export function visibleDays(view: CalendarView, anchor: Date): Date[] {
  const { start, end } = visibleRange(view, anchor);
  return eachDayOfInterval({ start, end });
}

/**
 * The month grid's rows: whole Monday-started weeks covering the anchor's month.
 *
 * Always returns complete weeks, so every row has exactly seven cells.
 */
export function monthWeeks(anchor: Date): Date[][] {
  const days = visibleDays("month", anchor);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Whether a date belongs to the anchor's own month (month view dims the rest). */
export function isInAnchorMonth(date: Date, anchor: Date): boolean {
  return isSameMonth(date, anchor);
}

/** Step the anchor one view-length forward (`+1`) or back (`-1`). */
export function stepAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case "day":
      return addDays(anchor, direction);
    case "week":
      return addWeeks(anchor, direction);
    case "month":
    default:
      return addMonths(anchor, direction);
  }
}

/**
 * The heading for the visible range.
 *
 * Day gets the full date, week gets a compact span that only repeats the month
 * when it changes mid-week, and month gets month + year — the same economy
 * Google Calendar's header uses.
 */
export function rangeLabel(view: CalendarView, anchor: Date): string {
  if (view === "day") return format(anchor, "EEEE, MMMM d, yyyy");
  if (view === "month") return format(anchor, "MMMM yyyy");

  const { start, end } = visibleRange("week", anchor);
  const sameMonth = isSameMonth(start, end);
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

/** `YYYY-MM-DD` for a date, the key the schedule contract uses. */
export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Where a pointer sits on the clock, given its offset within the grid body.
 *
 * `offsetY` and `height` are pixels; the result is minutes since midnight,
 * snapped to `snapMinutes` and clamped to the grid window. Snapping is what
 * makes a freehand drag produce a usable time instead of "09:37".
 */
export function minutesAtOffset(input: {
  offsetY: number;
  height: number;
  gridStart: number;
  gridEnd: number;
  snapMinutes?: number;
}): number {
  const snap = input.snapMinutes ?? DRAG_SNAP_MINUTES;
  const span = input.gridEnd - input.gridStart;
  if (span <= 0 || input.height <= 0) return input.gridStart;
  const ratio = Math.min(1, Math.max(0, input.offsetY / input.height));
  const raw = input.gridStart + ratio * span;
  const snapped = Math.round(raw / snap) * snap;
  return Math.min(input.gridEnd, Math.max(input.gridStart, snapped));
}

/** A time range produced by dragging on the grid. */
export interface DragRange {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Normalise the two ends of a drag into an ordered range of at least one snap
 * step.
 *
 * Dragging upward is as valid as dragging downward, and a click without movement
 * still has to mean something — Google Calendar treats it as a default-length
 * block starting there, which is what the minimum span produces here.
 */
export function normaliseDragRange(
  anchorMinutes: number,
  pointerMinutes: number,
  options?: { snapMinutes?: number; gridEnd?: number },
): DragRange {
  const snap = options?.snapMinutes ?? DRAG_SNAP_MINUTES;
  let start = Math.min(anchorMinutes, pointerMinutes);
  let end = Math.max(anchorMinutes, pointerMinutes);

  if (end - start < snap) {
    end = start + snap;
    // A click at the very bottom of the grid would otherwise run past it; move
    // the whole minimum-length range up instead of returning a zero-length one.
    if (options?.gridEnd !== undefined && end > options.gridEnd) {
      end = options.gridEnd;
      start = Math.max(0, end - snap);
    }
  }

  return { startMinutes: start, endMinutes: end };
}

/** A drag range as the `HH:MM` pair the shift form and the contract expect. */
export function dragRangeToTimes(range: DragRange): { startTime: string; endTime: string } {
  const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return { startTime: toTime(range.startMinutes), endTime: toTime(range.endMinutes) };
}

/**
 * How long a plain click on the grid proposes, when there was no drag to read a
 * length from. Google Calendar's default is an hour, and an hour is also the
 * longest slot the contract allows, so the proposal is always at least one slot.
 */
export const DEFAULT_SHIFT_MINUTES = 60;

/** The last minute of the day a shift may start on, so it still fits the clock. */
const END_OF_DAY_MINUTES = 24 * 60;

/**
 * A default-length range starting at `startMinutes`, clamped to the day.
 *
 * Used where a date was chosen but no hours were — a month cell, or the
 * toolbar's Add button — so the popover always opens describing a real,
 * writable shift rather than an empty form.
 */
export function defaultRangeFrom(startMinutes: number): DragRange {
  const start = Math.max(0, Math.min(startMinutes, END_OF_DAY_MINUTES - DEFAULT_SHIFT_MINUTES));
  return { startMinutes: start, endMinutes: start + DEFAULT_SHIFT_MINUTES };
}

/**
 * `HH:MM` (24-hour) as the 12-hour clock a Filipino doctor reads: `9:00 AM`.
 *
 * The contract speaks 24-hour and the stored data stays 24-hour; this is
 * presentation only, and it is deliberately the one place that conversion
 * happens so a summary line and a slot row can never disagree.
 */
export function formatTimeOfDay(time: string): string {
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** `9:00 AM – 1:00 PM` for a start/end pair. */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeOfDay(startTime)} – ${formatTimeOfDay(endTime)}`;
}

/**
 * The popover's one-line summary: `Aug 29, 2026 · 9:00 AM – 1:00 PM`.
 *
 * The date is spelled out because a popover can be opened from a month cell,
 * where the surrounding grid is the only thing naming the day — and a shift
 * written to the wrong date is the mistake this line exists to prevent.
 */
export function formatShiftSummary(date: string, startTime: string, endTime: string): string {
  const parsed = parseISO(date);
  const day = isValid(parsed) ? format(parsed, "MMM d, yyyy") : date;
  return `${day} · ${formatTimeRange(startTime, endTime)}`;
}
