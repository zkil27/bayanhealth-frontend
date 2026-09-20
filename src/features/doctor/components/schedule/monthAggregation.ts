/**
 * What a month cell actually shows.
 *
 * A month cell is roughly 110px tall and holds three lines. A working day in
 * this product is eight to twenty-four entries, so the naive mapping — one pill
 * per entry — produced a column of identical `Completed` chips and a `+10 more`
 * that told the doctor nothing. Every cell looked the same, which is the same as
 * showing nothing.
 *
 * Two rules fix that, and both are about *information per line* rather than
 * decoration:
 *
 * 1. **Collapse what is uniform.** Eleven finished consultations are one fact —
 *    "eleven, done" — not eleven facts. They become a single `✓ 11 Completed`
 *    pill, which frees the remaining lines for the things a doctor can still act
 *    on. Availability is already merged into runs upstream
 *    (`calendarEntries.ts`), so a published morning is one pill, not sixteen.
 * 2. **Spend the space on the future.** When entries still exceed the budget,
 *    the ones that survive are the ones that are still coming: a reservation
 *    that needs chasing, an on-demand consultation starting soon. Past work is
 *    summarised or hidden first, because it cannot be changed.
 *
 * Everything hidden stays reachable through the overflow popover, so nothing is
 * lost — only ranked.
 */

import { CATEGORY_LABEL } from "./calendarColors";
import { isAppointment, type CalendarEntry, type EntryCategory } from "./calendarEntries";
import { formatTimeOfDay } from "./calendarView";
import { formatMinutesToTime } from "./slotPlan";

/** How many pills a cell shows before the rest collapse into `+N more`. */
export const MONTH_PILL_LIMIT = 3;

/**
 * Which categories keep their own line longest when space runs out.
 *
 * Lower sorts first. The order is "what can I still do something about": an
 * unpaid reservation may need chasing, an on-demand consultation is imminent, a
 * scheduled one is committed, open time is an opportunity, blocked time is
 * settled, and completed work is finished.
 */
const CATEGORY_PRIORITY: Record<EntryCategory, number> = {
  reservation: 0,
  onDemand: 1,
  scheduled: 2,
  open: 3,
  blocked: 4,
  completed: 5,
};

export interface MonthPill {
  /** Stable across re-reads, so React keys survive a refresh. */
  id: string;
  category: EntryCategory;
  /** Leading token: a time, an hour range, or a count. Always short. */
  lead: string;
  /** What it is: a service, a patient, or a category word. */
  detail: string;
  /** Full text for the `title` tooltip, since the pill itself truncates. */
  title: string;
  /** How many entries this pill stands for. */
  count: number;
  /**
   * The single entry behind this pill, when it stands for exactly one.
   *
   * Absent on a summary pill: clicking "11 Completed" cannot open one
   * consultation, so it opens the day's list instead.
   */
  entry?: CalendarEntry;
}

export interface MonthCellSummary {
  /** At most {@link MONTH_PILL_LIMIT}, ordered by start time. */
  pills: MonthPill[];
  /** Entries not represented by a visible pill. Zero when everything fits. */
  overflowCount: number;
  /** Every entry for the day, for the overflow popover. */
  entries: CalendarEntry[];
}

/**
 * The descriptive text for one entry.
 *
 * **On patient names:** the pill is built to lead with one — that is the single
 * most useful thing a doctor can read at month density — but the doctor's
 * booking read (`GET /v1/bookings`) does not return `patientName`; the schema
 * carries `patientId` only. Rather than render an opaque id, the pill falls back
 * to the service type. Adding `patientName` to that response is what would light
 * this up, and it is a deliberate PHI decision rather than a field anyone
 * forgot.
 */
export function describeEntry(entry: CalendarEntry): { lead: string; detail: string } {
  if (!isAppointment(entry)) {
    return {
      lead: compactRange(entry.startMinutes, entry.endMinutes),
      detail: entry.notes ?? (entry.category === "blocked" ? "Blocked" : "Open"),
    };
  }

  const lead = formatTimeOfDay(formatMinutesToTime(entry.startMinutes));

  // No booking means the doctor may not read it yet — an unpaid reservation
  // against one of their slots. Saying "Reserved" is the whole truth available.
  if (!entry.booking) return { lead, detail: "Reserved" };

  const booking = entry.booking as CalendarEntry["booking"] & { patientName?: string };
  const who = booking?.patientName?.trim();
  return { lead, detail: who || booking?.serviceType || CATEGORY_LABEL[entry.category] };
}

/** "8–2" — the compact hour range a month cell has room for. */
function compactRange(startMinutes: number, endMinutes: number): string {
  const hour = (minutes: number) => {
    const h24 = Math.floor(minutes / 60);
    return String(h24 % 12 === 0 ? 12 : h24 % 12);
  };
  return `${hour(startMinutes)}–${hour(endMinutes)}`;
}

/** The `title` text: everything the pill had to truncate away. */
export function describeEntryFully(entry: CalendarEntry): string {
  const from = formatTimeOfDay(formatMinutesToTime(entry.startMinutes));
  const to = formatTimeOfDay(formatMinutesToTime(entry.endMinutes));
  const { detail } = describeEntry(entry);
  const parts = [`${from} – ${to}`, CATEGORY_LABEL[entry.category]];
  if (detail && detail !== CATEGORY_LABEL[entry.category]) parts.push(detail);
  if (entry.booking?.channel) parts.push(entry.booking.channel);
  return parts.join(" · ");
}

function pillFromEntry(entry: CalendarEntry): MonthPill {
  const { lead, detail } = describeEntry(entry);
  return {
    id: entry.id,
    category: entry.category,
    lead,
    detail,
    title: describeEntryFully(entry),
    count: 1,
    entry,
  };
}

function summaryPill(category: EntryCategory, entries: CalendarEntry[]): MonthPill {
  const label = CATEGORY_LABEL[category];
  const first = formatTimeOfDay(formatMinutesToTime(entries[0].startMinutes));
  const last = formatTimeOfDay(
    formatMinutesToTime(entries[entries.length - 1].endMinutes),
  );
  return {
    id: `summary:${category}:${entries[0].id}`,
    category,
    // The tick carries the meaning without relying on the colour, which the
    // doctor may have recoloured and may not be able to distinguish anyway.
    lead: category === "completed" ? `✓ ${entries.length}` : String(entries.length),
    detail: label,
    title: `${entries.length} ${label.toLowerCase()} · ${first} – ${last}`,
    count: entries.length,
  };
}

/**
 * Turn a day's entries into the pills a month cell can actually hold.
 *
 * Pure and cheap: the caller memoises it per cell, so month pagination does not
 * re-derive forty-two days of pills on every unrelated re-render.
 */
export function aggregateMonthEvents(
  entries: readonly CalendarEntry[],
  limit: number = MONTH_PILL_LIMIT,
): MonthCellSummary {
  const all = [...entries].sort((a, b) => a.startMinutes - b.startMinutes);
  if (all.length === 0) return { pills: [], overflowCount: 0, entries: all };

  // Completed work is uniform and unactionable, so it collapses first — and
  // only when collapsing actually buys a line back.
  const completed = all.filter((e) => e.category === "completed");
  const rest = all.filter((e) => e.category !== "completed");

  const candidates: MonthPill[] =
    completed.length >= 2
      ? [...rest.map(pillFromEntry), summaryPill("completed", completed)]
      : all.map(pillFromEntry);

  if (candidates.length <= limit) {
    return {
      pills: sortByTime(candidates, all),
      overflowCount: 0,
      entries: all,
    };
  }

  // Still too many. Keep the most actionable, then restore reading order so the
  // cell is not a ranking — a doctor reads a day top to bottom.
  const ranked = [...candidates].sort(
    (a, b) =>
      CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
      startOf(a, all) - startOf(b, all),
  );
  const visible = ranked.slice(0, limit);
  const shownCount = visible.reduce((sum, pill) => sum + pill.count, 0);

  return {
    pills: sortByTime(visible, all),
    overflowCount: all.length - shownCount,
    entries: all,
  };
}

function startOf(pill: MonthPill, all: readonly CalendarEntry[]): number {
  if (pill.entry) return pill.entry.startMinutes;
  const first = all.find((e) => e.category === pill.category);
  return first?.startMinutes ?? 0;
}

function sortByTime(pills: MonthPill[], all: readonly CalendarEntry[]): MonthPill[] {
  return [...pills].sort((a, b) => startOf(a, all) - startOf(b, all));
}
