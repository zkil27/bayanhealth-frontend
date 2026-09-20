"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";

import { styleFor, type CalendarPalette } from "./calendarColors";
import type { CalendarEntry } from "./calendarEntries";
import { aggregateMonthEvents, type MonthPill } from "./monthAggregation";
import { rectFromElement, rectFromMouseEvent, type AnchorRect } from "./SchedulePopover";

/**
 * One day in the month grid.
 *
 * Four targets live in this square and they mean four different things, which is
 * why each is a real control with its own hover state rather than one handler on
 * the container guessing from the event target:
 *
 * | Target        | Meaning                          | Feedback                |
 * |---------------|----------------------------------|-------------------------|
 * | cell body     | add availability on this date    | tinted background       |
 * | date number   | open this date in Day view       | filled circle + tooltip |
 * | a pill        | inspect that entry               | lift + brighten         |
 * | `+N more`     | expand the day in place          | chip fill + press       |
 *
 * The body sits *behind* the others (`z-0` against their `z-10`) and last in the
 * DOM, so it never swallows their clicks and the date number — the more useful
 * keyboard destination — comes first in the tab order.
 *
 * Split out of `MonthGrid` so React can skip the other forty-one cells when one
 * day's entries change: the aggregation is memoised per cell against its own
 * entries, so paging a month does not re-derive every square.
 */
export function MonthDayCell({
  iso,
  date,
  palette,
  entries,
  outside,
  isToday,
  isPast,
  pillLimit,
  onSelectRange,
  onSelectEntry,
  onOpenDayView,
  onOpenOverflow,
}: {
  iso: string;
  date: Date;
  palette: CalendarPalette;
  entries: CalendarEntry[];
  /** A leading/trailing day from a neighbouring month. */
  outside: boolean;
  isToday: boolean;
  /** Before today. Rendered muted so the days that still matter stand out. */
  isPast: boolean;
  pillLimit: number;
  onSelectRange: (selection: {
    date: string;
    startMinutes: number;
    endMinutes: number;
    anchor: AnchorRect;
  }) => void;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
  onOpenDayView: (date: string) => void;
  onOpenOverflow: (date: string, entries: CalendarEntry[], anchor: AnchorRect) => void;
  /** Where a cell-proposed shift starts, passed through from the grid. */
} & { defaultStartMinutes?: number }) {
  const summary = useMemo(
    () => aggregateMonthEvents(entries, pillLimit),
    [entries, pillLimit],
  );

  const readableDate = useMemo(() => {
    const parsed = parseISO(iso);
    return Number.isNaN(parsed.getTime()) ? iso : format(parsed, "EEEE, MMM d, yyyy");
  }, [iso]);

  return (
    <div
      data-slot="month-cell"
      data-date={iso}
      data-past={isPast ? "true" : undefined}
      className={cn(
        "group/cell relative isolate flex min-h-28 flex-col border-r border-b border-(--border-subtle) p-1.5 transition-colors last:border-r-0",
        outside && "bg-(--surface-warm-soft)/40",
        // Past days recede rather than disappear: the doctor still needs to read
        // them, but the eye should land on the days they can still change.
        isPast && "opacity-60 saturate-50",
      )}
    >
      <div className="relative z-10 flex w-full justify-center">
        <button
          type="button"
          data-slot="month-day-number"
          onClick={() => onOpenDayView(iso)}
          aria-label={`Open ${readableDate} in day view`}
          title={`Go to ${readableDate}`}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-sm transition-colors duration-150",
              isToday
                ? "bg-(--action-primary) font-bold text-white hover:bg-(--action-primary-hover)"
                : outside
                  ? "text-(--text-subtle) hover:bg-(--border-subtle) hover:text-(--text-heading)"
                  : "font-medium text-(--text-heading) hover:bg-(--border-subtle)",
            )}
          >
            {format(date, "d")}
          </span>
        </button>
      </div>

      <div className="relative z-10 mt-1 flex flex-col gap-1">
        {summary.pills.map((pill) => (
          <PillButton
            key={pill.id}
            pill={pill}
            palette={palette}
            iso={iso}
            onSelectEntry={onSelectEntry}
            onOpenOverflow={() => {}}
            onExpandDay={(anchor) => onOpenOverflow(iso, summary.entries, anchor)}
          />
        ))}

        {summary.overflowCount > 0 ? (
          <button
            type="button"
            data-slot="month-overflow"
            onClick={(event) => {
              // Never let this reach the cell body behind it, which would also
              // open the "add availability" popover on top of this one.
              event.stopPropagation();
              onOpenOverflow(iso, summary.entries, rectFromElement(event.currentTarget));
            }}
            aria-label={`Show all ${summary.entries.length} entries on ${readableDate}`}
            title={`Show all ${summary.entries.length} entries`}
            className="w-full rounded-md px-1.5 py-0.5 text-left text-xs font-bold text-(--text-muted) transition-all duration-150 hover:bg-(--border-subtle) hover:text-(--text-heading) hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring) active:scale-95"
          >
            +{summary.overflowCount} more
          </button>
        ) : null}
      </div>

      {/*
        The cell's own target, filling whatever space the pills leave. Behind
        everything above and last in the DOM, so the controls in front keep their
        own meanings and their own place in the tab order.
      */}
      <button
        type="button"
        data-slot="month-cell-add"
        onClick={(event) =>
          onSelectRange({
            date: iso,
            startMinutes: MONTH_CELL_DEFAULT_START,
            endMinutes: MONTH_CELL_DEFAULT_START + MONTH_CELL_DEFAULT_LENGTH,
            anchor: rectFromMouseEvent(event),
          })
        }
        aria-label={`Add availability on ${readableDate}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-[8px] transition-colors duration-150 group-hover/cell:bg-(--surface-warm-soft)/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
      />
    </div>
  );
}

/** Where a shift proposed from a month cell starts, and how long it runs. */
export const MONTH_CELL_DEFAULT_START = 9 * 60;
export const MONTH_CELL_DEFAULT_LENGTH = 60;

/**
 * One pill.
 *
 * Two lines of information in one line of space: a lead token (a time, an hour
 * range, or a count) and a detail. The lead never truncates — losing "9:30" to
 * an ellipsis would make the pill useless — so the detail is the part that
 * shrinks, and the full text is on the `title` for when it does.
 */
function PillButton({
  pill,
  palette,
  iso,
  onSelectEntry,
  onExpandDay,
}: {
  pill: MonthPill;
  palette: CalendarPalette;
  iso: string;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
  onOpenOverflow: () => void;
  onExpandDay: (anchor: AnchorRect) => void;
}) {
  const solid = palette[pill.category].pattern === "solid";

  return (
    <button
      type="button"
      data-slot="month-chip"
      data-category={pill.category}
      data-summary={pill.entry ? undefined : "true"}
      title={pill.title}
      aria-label={`${pill.title} on ${iso}`}
      onClick={(event) => {
        event.stopPropagation();
        const anchor = rectFromElement(event.currentTarget);
        // A summary stands for several consultations, so there is no single one
        // to open — it expands the day instead, which is what the doctor wants
        // from "11 Completed" anyway.
        if (pill.entry) onSelectEntry(pill.entry, anchor);
        else onExpandDay(anchor);
      }}
      className={cn(
        "flex w-full items-baseline gap-1 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs transition-all duration-150 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring) active:scale-[0.98]",
        // Brightness moves the right way for each treatment: a solid navy pill
        // has to lighten to register a hover, a pale one has to deepen.
        solid ? "hover:brightness-110" : "hover:brightness-95",
      )}
      style={styleFor(palette[pill.category])}
    >
      <span className="shrink-0 font-bold tabular-nums">{pill.lead}</span>
      <span className="min-w-0 flex-1 truncate opacity-90">{pill.detail}</span>
    </button>
  );
}
