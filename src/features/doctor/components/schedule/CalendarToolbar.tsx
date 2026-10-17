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
    <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
      {/* Tier 1 on mobile: Title + View Switcher | Left cluster on desktop */}
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <h1 className="font-display text-xl font-bold tracking-tight text-(--text-heading) sm:text-2xl shrink-0">
          Your Calendar
        </h1>

        {/* View Switcher: on mobile anchored to top-right; hidden here on desktop to sit at far right */}
        <div className="flex md:hidden items-center">
          <div
            role="group"
            aria-label="Calendar view"
            className="flex items-center gap-0.5 rounded-full border border-(--border-subtle) bg-(--surface-warm-soft)/60 p-0.5"
          >
            {CALENDAR_VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                aria-pressed={view === option}
                title={`${VIEW_LABELS[option]} view (${VIEW_KEYS[option]})`}
                className={cn(
                  "h-8 rounded-full px-2.5 text-xs font-bold transition-all",
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

      {/* Tier 2 on mobile: Stepper + Date Range Label | Middle section on desktop */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToday ? (
            <button
              type="button"
              onClick={onToday}
              title="Jump to today (T)"
              className="h-8 rounded-full border border-(--border-subtle) bg-(--surface-card) px-3 text-xs font-bold text-(--text-heading) shadow-xs transition-colors hover:bg-(--surface-warm-soft) active:scale-95 sm:h-8.5 sm:px-3.5"
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
              className="flex size-7 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--surface-warm-soft) sm:size-7.5"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label={`Next ${stepLabel}`}
              title={`Next ${stepLabel} (→)`}
              className="flex size-7 items-center justify-center rounded-full text-(--text-heading) transition-colors hover:bg-(--surface-warm-soft) sm:size-7.5"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <span
          data-slot="schedule-week-label"
          className="text-sm font-bold text-(--text-heading) sm:text-base md:text-lg truncate"
        >
          {rangeLabel}
        </span>
      </div>

      {/* Desktop view switcher (far right on md+) */}
      <div className="hidden md:flex items-center gap-3">
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
                "h-8.5 rounded-full px-3.5 text-xs font-bold transition-all sm:text-sm",
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
