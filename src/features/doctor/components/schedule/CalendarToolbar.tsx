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
  onToday,
}: {
  view: CalendarView;
  rangeLabel: string;
  onStep: (direction: 1 | -1) => void;
  onViewChange: (view: CalendarView) => void;
  onToday?: () => void;
}) {
  const stepLabel = view === "day" ? "day" : view === "week" ? "week" : "month";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="font-display text-2xl font-bold tracking-tight text-(--text-heading)">
        Your Calendar
      </h1>

      <div className="flex items-center gap-2">
        {onToday ? (
          <button
            type="button"
            onClick={onToday}
            title="Jump to today (T)"
            className="rounded-full border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 text-xs font-bold text-(--text-heading) shadow-xs transition-colors hover:bg-(--surface-warm-soft) active:scale-95"
          >
            Today
          </button>
        ) : null}

        <div className="flex items-center rounded-full border border-(--border-subtle) bg-(--surface-card) p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label={`Previous ${stepLabel}`}
            title={`Previous ${stepLabel} (←)`}
            className="flex size-7.5 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--surface-warm-soft)"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label={`Next ${stepLabel}`}
            title={`Next ${stepLabel} (→)`}
            className="flex size-7.5 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--surface-warm-soft)"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <span
        data-slot="schedule-week-label"
        className="text-base font-bold text-(--text-heading) sm:text-lg"
      >
        {rangeLabel}
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div
          role="group"
          aria-label="Calendar view"
          className="flex items-center gap-0.5 rounded-full border border-(--border-subtle) bg-(--surface-warm-soft)/60 p-1"
        >
          {CALENDAR_VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              aria-pressed={view === option}
              title={`${VIEW_LABELS[option]} view (${VIEW_KEYS[option]})`}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-bold transition-all sm:text-sm",
                view === option
                  ? "bg-(--surface-card) text-(--text-heading) shadow-xs"
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
