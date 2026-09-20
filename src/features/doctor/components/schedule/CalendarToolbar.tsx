"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { CALENDAR_VIEWS, type CalendarView } from "./calendarView";

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** The shortcut key shown in each view button's tooltip, matching Google Calendar. */
const VIEW_KEYS: Record<CalendarView, string> = { day: "D", week: "W", month: "M" };

/**
 * The calendar's control bar: step, range label, view switcher.
 *
 * "Today" and "+ Add availability" used to sit here too. Today is gone as a
 * button — the `T` shortcut still jumps there (`DoctorScheduleView`'s own
 * keydown handler owns that, independent of this toolbar) — and creating
 * availability is now exclusively a calendar-surface gesture: point at, or
 * drag across, the time you want to publish. A toolbar button that opened the
 * same popover from nowhere in particular was a second, redundant path to the
 * same form.
 */
export function CalendarToolbar({
  view,
  rangeLabel,
  onStep,
  onViewChange,
}: {
  view: CalendarView;
  rangeLabel: string;
  onStep: (direction: 1 | -1) => void;
  onViewChange: (view: CalendarView) => void;
}) {
  const stepLabel = view === "day" ? "day" : view === "week" ? "week" : "month";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="font-display text-2xl font-bold text-(--text-heading)">
        Your Calendar
      </h1>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label={`Previous ${stepLabel}`}
          title={`Previous ${stepLabel} (←)`}
          className="flex size-9 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface)"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label={`Next ${stepLabel}`}
          title={`Next ${stepLabel} (→)`}
          className="flex size-9 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface)"
        >
          <ChevronRight className="size-4.5" />
        </button>
      </div>

      <span
        data-slot="schedule-week-label"
        className="text-lg font-bold text-(--text-heading)"
      >
        {rangeLabel}
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div
          role="group"
          aria-label="Calendar view"
          className="flex items-center gap-0.5 rounded-full border border-(--border-subtle) bg-(--surface-warm-soft) p-1"
        >
          {CALENDAR_VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              aria-pressed={view === option}
              title={`${VIEW_LABELS[option]} view (${VIEW_KEYS[option]})`}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                view === option
                  ? "bg-(--surface-card) text-(--text-heading) shadow-[0_1px_2px_rgba(219,210,168,0.35)]"
                  : "text-(--text-muted) hover:text-(--text-heading)",
              )}
            >
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
