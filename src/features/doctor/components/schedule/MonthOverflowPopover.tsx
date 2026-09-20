"use client";

import { format, isValid, parseISO } from "date-fns";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { CATEGORY_LABEL, styleFor, type CalendarPalette } from "./calendarColors";
import { isAppointment, type CalendarEntry } from "./calendarEntries";
import { formatTimeOfDay } from "./calendarView";
import { describeEntry } from "./monthAggregation";
import { formatMinutesToTime } from "./slotPlan";
import { SchedulePopover, rectFromElement, type AnchorRect } from "./SchedulePopover";

/**
 * The day, expanded in place.
 *
 * `+10 more` used to navigate into Day view, which answered a question the
 * doctor had not asked: they wanted to *see* the rest of that Thursday, not
 * leave the month they were scanning. This shows the whole day anchored to its
 * own cell, and leaves the month exactly where it was.
 *
 * Nothing here truncates. That is the entire point — the cell truncates because
 * it is 110px tall, and this is where the text it dropped comes back.
 *
 * Dismissal, focus handling and z-order come from {@link SchedulePopover}, so
 * this behaves identically to every other popover on the calendar: Escape
 * closes it, a press outside closes it, and it renders above the grid's borders
 * rather than being clipped by the cell it belongs to.
 */
export function MonthOverflowPopover({
  open,
  anchor,
  date,
  entries,
  palette,
  onClose,
  onSelectEntry,
  onOpenDayView,
}: {
  open: boolean;
  anchor: AnchorRect | null;
  /** YYYY-MM-DD the expanded cell belongs to. */
  date: string | null;
  entries: readonly CalendarEntry[];
  palette: CalendarPalette;
  onClose: () => void;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
  onOpenDayView: (date: string) => void;
}) {
  if (!date) return null;

  const parsed = parseISO(date);
  const heading = isValid(parsed) ? format(parsed, "EEEE, MMM d, yyyy") : date;

  return (
    <SchedulePopover
      open={open}
      anchor={anchor}
      label={`All entries on ${heading}`}
      onClose={onClose}
      testId="month-overflow-popover"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            data-slot="month-overflow-heading"
            className="text-sm font-bold text-(--text-heading)"
          >
            {heading}
          </h2>
          <span className="text-xs text-(--text-muted)">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors duration-150 hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
        >
          <X className="size-4" />
        </button>
      </div>

      <ul
        data-slot="month-overflow-list"
        className="-mx-1 flex max-h-72 flex-col gap-0.5 overflow-y-auto px-1"
      >
        {entries.map((entry) => {
          const { detail } = describeEntry(entry);
          const from = formatTimeOfDay(formatMinutesToTime(entry.startMinutes));
          const to = formatTimeOfDay(formatMinutesToTime(entry.endMinutes));

          return (
            <li key={entry.id}>
              <button
                type="button"
                data-slot="month-overflow-row"
                data-category={entry.category}
                onClick={(event) =>
                  onSelectEntry(entry, rectFromElement(event.currentTarget))
                }
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150",
                  "hover:bg-(--surface-warm-soft) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)",
                )}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-[4px]"
                  style={styleFor(palette[entry.category])}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  {/* No truncation anywhere in this list — that is why it exists. */}
                  <span className="text-xs font-bold text-(--text-heading)">
                    {isAppointment(entry) ? `${from} – ${to}` : `${from} – ${to}`}
                  </span>
                  <span className="text-xs text-(--text-muted)">
                    {CATEGORY_LABEL[entry.category]}
                    {detail && detail !== CATEGORY_LABEL[entry.category]
                      ? ` · ${detail}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onOpenDayView(date)}
          className="ml-auto text-xs font-medium text-(--text-muted) underline-offset-2 transition-colors duration-150 hover:text-(--text-heading) hover:underline"
        >
          Open in day view
        </button>
      </div>
    </SchedulePopover>
  );
}
