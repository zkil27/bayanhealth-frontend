"use client";

import { isSameDay } from "date-fns";

import type { CalendarPalette } from "./calendarColors";
import type { CalendarEntry } from "./calendarEntries";
import { isInAnchorMonth, isoDate, monthWeeks } from "./calendarView";
import { MonthDayCell } from "./MonthDayCell";
import { MONTH_PILL_LIMIT } from "./monthAggregation";
import type { AnchorRect } from "./SchedulePopover";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * Where a shift proposed from a month cell starts.
 *
 * A month grid has no time axis, so a click on one carries a date and nothing
 * else. Rather than open an empty form, the popover proposes a morning shift the
 * doctor can adjust in two keystrokes — the same trade Google Calendar makes
 * when it creates an event from a month cell.
 */
export const MONTH_DEFAULT_START_MINUTES = 9 * 60;

/** What a month cell can ask the calendar to do. */
export interface MonthCellHandlers {
  /** Empty space in a cell: propose a default shift on that date. */
  onSelectRange: (selection: {
    date: string;
    startMinutes: number;
    endMinutes: number;
    anchor: AnchorRect;
  }) => void;
  /** A pill: inspect the entry it stands for. */
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
  /** The date number: open that date in Day view. */
  onOpenDayView: (date: string) => void;
  /** `+N more`: expand the whole day in place, without leaving the month. */
  onOpenOverflow: (date: string, entries: CalendarEntry[], anchor: AnchorRect) => void;
}

/**
 * The month view.
 *
 * A month cannot show a time axis at any useful density, so — like Google
 * Calendar — each day becomes a cell listing its entries as pills, and the rest
 * collapse behind `+N more`. What makes that readable rather than merely compact
 * is `monthAggregation.ts`: a day of finished work is one `✓ 11 Completed` pill
 * instead of eleven identical chips, and the lines that survive are the ones the
 * doctor can still act on.
 *
 * This component now only lays out the weeks. Each cell owns its own aggregation
 * and memoises it against its own entries, so changing one day — or paging a
 * month — does not re-derive the other forty-one squares.
 */
export function MonthGrid({
  anchor,
  entriesByDate,
  palette,
  todayIso,
  onSelectRange,
  onSelectEntry,
  onOpenDayView,
  onOpenOverflow,
}: {
  anchor: Date;
  entriesByDate: ReadonlyMap<string, CalendarEntry[]>;
  palette: CalendarPalette;
  todayIso: string;
} & MonthCellHandlers) {
  const weeks = monthWeeks(anchor);
  const today = new Date();

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="border-b border-(--border-subtle) pb-2 text-center text-sm font-bold text-(--text-muted)"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7">
        {weeks.flat().map((date) => {
          const iso = isoDate(date);
          return (
            <MonthDayCell
              key={iso}
              iso={iso}
              date={date}
              palette={palette}
              entries={entriesByDate.get(iso) ?? []}
              outside={!isInAnchorMonth(date, anchor)}
              isToday={iso === todayIso || isSameDay(date, today)}
              // Strictly before today: today itself is never dimmed, however
              // much of it has already gone.
              isPast={iso < todayIso}
              pillLimit={MONTH_PILL_LIMIT}
              onSelectRange={onSelectRange}
              onSelectEntry={onSelectEntry}
              onOpenDayView={onOpenDayView}
              onOpenOverflow={onOpenOverflow}
            />
          );
        })}
      </div>
    </div>
  );
}
