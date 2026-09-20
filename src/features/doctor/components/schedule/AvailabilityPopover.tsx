"use client";

import { useMemo, useRef } from "react";
import { CalendarPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { Slot, SlotDuration } from "../../lib/api/schedule";
import { formatShiftSummary } from "./calendarView";
import { SchedulePopover, type AnchorRect } from "./SchedulePopover";
import { planSlots, type SlotPlan } from "./slotPlan";

/** Durations the contract accepts, in minutes (`CreateSlotRequest.durationMinutes`). */
export const DURATIONS: SlotDuration[] = [15, 30, 45, 60];

/** The shift being described. Owned by the parent so a refresh cannot reset it. */
export interface ShiftDraft {
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
  durationMinutes: SlotDuration;
  notes: string;
}

/** What a completed generation run produced, as the doctor needs to hear it. */
export interface GenerationReport {
  created: number;
  /** Times skipped before any request, because they overlap existing slots. */
  skipped: string[];
  failures: Array<{ startTime: string; message: string }>;
}

/**
 * "Add availability" as a Google Calendar-style popover.
 *
 * This replaces a full-width form in a drawer. The form asked the doctor to
 * re-read the date out of a heading, type two times they had usually just
 * dragged, and then scroll to find out what would happen. The popover states
 * the date and hours it is about to write in one line at the top, keeps the
 * only two real decisions (how long each slot is, and any note) within a
 * glance of that line, and previews the exact number of slots continuously.
 *
 * **Error and success are mutually exclusive by construction.** The parent
 * clears `report` on every draft change, so a run's outcome can never sit
 * beside a preview describing a different shift — the specific defect this
 * layout is designed to make impossible, not merely to style differently. A
 * clean run closes the popover; only a run with failures keeps it open, showing
 * exactly which times did not land and why.
 */
export function AvailabilityPopover({
  open,
  anchor,
  date,
  draft,
  onDraftChange,
  existing,
  busy,
  report,
  onGenerate,
  onClose,
  onOpenDay,
}: {
  open: boolean;
  anchor: AnchorRect | null;
  /** YYYY-MM-DD the slots will be written to. */
  date: string;
  draft: ShiftDraft;
  onDraftChange: (draft: ShiftDraft) => void;
  /** Slots already on `date`, used to preview which times are skipped. */
  existing: Slot[];
  busy: boolean;
  report: GenerationReport | null;
  onGenerate: (plan: SlotPlan) => void;
  onClose: () => void;
  /** Opens the full day manager, for everything a popover is too small to hold. */
  onOpenDay: (date: string) => void;
}) {
  const startTimeRef = useRef<HTMLInputElement | null>(null);

  const plan = useMemo(
    () =>
      planSlots({
        startTime: draft.startTime,
        endTime: draft.endTime,
        durationMinutes: draft.durationMinutes,
        existing,
      }),
    [draft.startTime, draft.endTime, draft.durationMinutes, existing],
  );

  const canSubmit = !busy && plan.startTimes.length > 0;
  const failed = report !== null && report.failures.length > 0;

  return (
    <SchedulePopover
      open={open}
      anchor={anchor}
      label={`Add availability on ${date}`}
      onClose={onClose}
      testId="availability-popover"
    >
      <form
        data-slot="schedule-shift-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          onGenerate(plan);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-start gap-2">
          <CalendarPlus className="mt-0.5 size-4 shrink-0 text-(--text-muted)" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-sm font-bold text-(--text-heading)">Add availability</h2>
            {/*
              The one line that has to be right: a shift written to the wrong
              day is the mistake a popover opened from a month cell invites, and
              this is the only place the day is named.
            */}
            <p
              data-slot="schedule-shift-summary"
              className="text-sm text-(--text-muted)"
            >
              {formatShiftSummary(date, draft.startTime, draft.endTime)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor="shift-start-time" className="text-xs">
              Start
            </Label>
            <Input
              id="shift-start-time"
              ref={startTimeRef}
              data-autofocus
              type="time"
              step={900}
              value={draft.startTime}
              onChange={(event) =>
                onDraftChange({ ...draft, startTime: event.target.value })
              }
              required
              className="h-9"
            />
          </div>
          <span className="pb-2 text-(--text-subtle)" aria-hidden>
            –
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor="shift-end-time" className="text-xs">
              End
            </Label>
            <Input
              id="shift-end-time"
              type="time"
              step={900}
              value={draft.endTime}
              onChange={(event) =>
                onDraftChange({ ...draft, endTime: event.target.value })
              }
              required
              className="h-9"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-medium text-(--text-muted)">
            Appointment length
          </legend>
          {/*
            Segmented buttons rather than a select: there are exactly four legal
            values, the choice changes the slot count the doctor is reading one
            line below, and a press shows that immediately instead of after a
            dropdown closes.
          */}
          <div
            data-slot="schedule-duration-picker"
            role="radiogroup"
            aria-label="Appointment length"
            className="flex items-center gap-1 rounded-full border border-(--border-subtle) bg-(--surface-warm-soft) p-1"
          >
            {DURATIONS.map((duration) => {
              const selected = duration === draft.durationMinutes;
              return (
                <button
                  key={duration}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${duration} minute appointments`}
                  onClick={() => onDraftChange({ ...draft, durationMinutes: duration })}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 text-xs font-bold transition-colors",
                    selected
                      ? "bg-(--surface-card) text-(--text-heading) shadow-[0_1px_2px_rgba(219,210,168,0.4)]"
                      : "text-(--text-muted) hover:text-(--text-heading)",
                  )}
                >
                  {duration} min
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <Label htmlFor="shift-notes" className="text-xs">
            Note (optional)
          </Label>
          <Textarea
            id="shift-notes"
            value={draft.notes}
            onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
            placeholder="Applied to every slot in this shift"
            rows={2}
            className="min-h-0 resize-none text-sm"
          />
        </div>

        {/*
          The preview and the outcome are one region, never two. `report` is
          non-null only for a run whose draft has not been touched since, so a
          success line and a live validation error cannot both be true here.
        */}
        <div
          data-slot="schedule-shift-preview"
          role={failed ? "alert" : "status"}
          aria-live={failed ? "assertive" : "polite"}
          className={cn(
            "flex flex-col gap-1 rounded-lg px-2.5 py-2 text-xs",
            plan.error && !report
              ? "bg-(--surface-warm-soft) text-(--danger-fg)"
              : failed
                ? "bg-(--surface-warm-soft) text-(--text-heading)"
                : "bg-(--status-available-bg) text-(--status-available-fg)",
          )}
        >
          {report ? (
            <GenerationSummary report={report} date={date} />
          ) : plan.error ? (
            <span data-slot="schedule-shift-error">{plan.error}</span>
          ) : (
            <>
              <span>
                Creates{" "}
                <strong>
                  {plan.startTimes.length}{" "}
                  {plan.startTimes.length === 1 ? "slot" : "slots"}
                </strong>{" "}
                of {draft.durationMinutes} min
              </span>
              {plan.overlapping.length > 0 ? (
                <span
                  data-slot="schedule-shift-overlaps"
                  className="text-(--text-muted)"
                >
                  Skipping {plan.overlapping.length}{" "}
                  {plan.overlapping.length === 1 ? "time" : "times"} already on
                  this day: {plan.overlapping.join(", ")}.
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit}
            className="rounded-full bg-(--action-primary) text-white hover:bg-(--action-primary-hover)"
          >
            {busy ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={() => onOpenDay(date)}
            className="ml-auto text-xs font-medium text-(--text-muted) underline-offset-2 hover:text-(--text-heading) hover:underline"
          >
            Manage this day
          </button>
        </div>
      </form>
    </SchedulePopover>
  );
}

/**
 * The outcome of the last run, per slot.
 *
 * Only ever rendered for a run that half-succeeded: a clean run closes the
 * popover, so "created 6 slots" is never left on screen to be mistaken for a
 * description of what the form currently says.
 */
function GenerationSummary({
  report,
  date,
}: {
  report: GenerationReport;
  date: string;
}) {
  return (
    <div data-slot="schedule-shift-report" className="flex flex-col gap-1">
      <span>
        Created <strong>{report.created}</strong>{" "}
        {report.created === 1 ? "slot" : "slots"} on {date}.
      </span>
      {report.skipped.length > 0 ? (
        <span className="text-(--text-muted)">
          Skipped {report.skipped.length} overlapping{" "}
          {report.skipped.length === 1 ? "time" : "times"}:{" "}
          {report.skipped.join(", ")}.
        </span>
      ) : null}
      {report.failures.length > 0 ? (
        <div className="flex flex-col gap-0.5 text-(--danger-fg)">
          <span>
            {report.failures.length}{" "}
            {report.failures.length === 1 ? "slot" : "slots"} could not be created:
          </span>
          <ul className="flex flex-col gap-0.5 pl-4">
            {report.failures.map((failure) => (
              <li
                key={failure.startTime}
                data-slot="schedule-shift-failure"
                className="list-disc"
              >
                {failure.startTime} — {failure.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
