/**
 * Date-windowed pagination for the "Recent consultations" dashboard card
 * (Task 5 of the doctor-dashboard rebuild).
 *
 * This replaces a blind cursor walk (`fetchCompletedConsultations`,
 * `MAX_PAGES_SCANNED`) that had no date filter at all: `GET /v1/bookings`
 * paginates over *every* status, so a doctor whose newest bookings were all
 * `confirmed`/`pending_payment` had completed consultations sitting behind
 * pages the walk might never reach, capped at five requests purely to bound
 * the damage. A doctor navigating explicit week-sized windows is a better fit
 * than a fixed page count that either over- or under-reads depending on how
 * busy that doctor happens to be.
 *
 * Windows are platform-local calendar days (Asia/Manila, ADR-20260807-01),
 * the same interpretation `metrics.ts`'s `platformTodayRangeUtc` and
 * `calendarEntries.ts`'s `placeInstant` already use. The constant is
 * deliberately re-declared here rather than imported across those modules —
 * the same choice Task 2's `metrics.ts` already made and documented: a single
 * numeric constant duplicated in a few well-isolated, single-purpose modules
 * is a smaller cost than a cross-feature import for one value.
 */

import { format, isValid, parseISO } from "date-fns";

const PLATFORM_UTC_OFFSET_MINUTES = 8 * 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How many platform-local days one window spans. */
export const WINDOW_DAYS = 7;

export interface DateWindow {
  /** Inclusive lower bound, UTC ISO instant. */
  fromIso: string;
  /** Inclusive upper bound, UTC ISO instant. */
  toIso: string;
  /** Platform-local `YYYY-MM-DD` of the window's first day. */
  startDate: string;
  /** Platform-local `YYYY-MM-DD` of the window's last day. */
  endDate: string;
}

/** Platform-local `YYYY-MM-DD` for an instant. */
export function platformTodayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() + PLATFORM_UTC_OFFSET_MINUTES * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * A {@link WINDOW_DAYS}-day window ending on `endDateIso`, inclusive at both
 * ends.
 *
 * "Inclusive" means the window covers every instant of the platform-local
 * calendar day named by `endDateIso` — from its first millisecond to its
 * last — and every instant of the `WINDOW_DAYS - 1` platform-local days
 * before it. A booking scheduled at exactly platform-local midnight on either
 * boundary day belongs to the window; nothing about the arithmetic can push
 * it one millisecond outside.
 */
export function windowEndingOn(endDateIso: string): DateWindow {
  const endDayStartUtcMs =
    Date.parse(`${endDateIso}T00:00:00.000Z`) - PLATFORM_UTC_OFFSET_MINUTES * 60_000;
  const startDayStartUtcMs = endDayStartUtcMs - (WINDOW_DAYS - 1) * MS_PER_DAY;
  // One millisecond before the *next* platform-local day begins — the last
  // instant that still belongs to `endDateIso`.
  const windowEndUtcMs = endDayStartUtcMs + MS_PER_DAY - 1;
  const startDate = new Date(startDayStartUtcMs + PLATFORM_UTC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);

  return {
    fromIso: new Date(startDayStartUtcMs).toISOString(),
    toIso: new Date(windowEndUtcMs).toISOString(),
    startDate,
    endDate: endDateIso,
  };
}

/** The default window: the {@link WINDOW_DAYS} days ending today. */
export function defaultWindow(now: Date = new Date()): DateWindow {
  return windowEndingOn(platformTodayIso(now));
}

/** Step to the previous (`-1`) or next (`+1`) {@link WINDOW_DAYS}-day window. */
export function stepWindow(window: DateWindow, direction: 1 | -1): DateWindow {
  const endDayStartUtcMs =
    Date.parse(`${window.endDate}T00:00:00.000Z`) - PLATFORM_UTC_OFFSET_MINUTES * 60_000;
  const nextEndDayStartUtcMs = endDayStartUtcMs + direction * WINDOW_DAYS * MS_PER_DAY;
  const nextEndDate = new Date(nextEndDayStartUtcMs + PLATFORM_UTC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);
  return windowEndingOn(nextEndDate);
}

/**
 * True once the window already reaches today — stepping forward from here
 * would describe a window that has not finished happening yet, which makes
 * no sense for a list of *completed* consultations. Callers use this to
 * disable the "next" control rather than let a doctor page into the future
 * and see an empty window that will never fill in.
 */
export function isLatestWindow(window: DateWindow, now: Date = new Date()): boolean {
  return window.endDate >= platformTodayIso(now);
}

/**
 * `Aug 21 – Aug 27, 2026`, in the same economical style
 * `calendarView.ts`'s `rangeLabel` uses for week view: the year and month are
 * stated once and only repeated when the window actually crosses one.
 */
export function formatWindowLabel(window: DateWindow): string {
  const start = parseISO(window.startDate);
  const end = parseISO(window.endDate);
  if (!isValid(start) || !isValid(end)) return `${window.startDate} – ${window.endDate}`;

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}
