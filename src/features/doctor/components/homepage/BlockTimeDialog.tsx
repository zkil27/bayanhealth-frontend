"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { Slot, SlotDuration } from "../../lib/api/schedule";
import { createBlockedSlots, type BlockTimeResult } from "../../lib/blockTime";
import { planSlots } from "../schedule/slotPlan";
import { formatShiftSummary } from "../schedule/calendarView";

const DURATIONS: SlotDuration[] = [15, 30, 45, 60];

/**
 * "Block time" from the doctor dashboard's Upcoming-today card (Task 4).
 *
 * Deliberately the same underlying arithmetic as the schedule page's own
 * `AvailabilityPopover` (`planSlots`, the same `DURATIONS`), so a doctor who
 * has already learned that flow finds the same preview behaviour here — "this
 * will create N slots, skipping M that overlap what you already have" — rather
 * than a second, slightly different mental model for the same underlying
 * operation. A `Dialog` rather than an anchored popover, because the dashboard
 * card that opens this has no fixed grid cell for a popover to point at.
 */
export function BlockTimeDialog({
  open,
  onOpenChange,
  idToken,
  doctorId,
  date,
  existing,
  onBlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idToken: string;
  doctorId: string;
  /** YYYY-MM-DD to block time on — today, per the card this opens from. */
  date: string;
  /** Today's existing slots, for the overlap preview. */
  existing: Slot[];
  /** Called once at least one window was successfully blocked. */
  onBlocked: () => void;
}) {
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [durationMinutes, setDurationMinutes] = useState<SlotDuration>(30);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BlockTimeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(
    () => planSlots({ startTime, endTime, durationMinutes, existing }),
    [startTime, endTime, durationMinutes, existing],
  );

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const canSubmit = !busy && plan.startTimes.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await createBlockedSlots(
        idToken,
        doctorId,
        date,
        plan.startTimes.map((time) => ({
          startTime: time,
          durationMinutes,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        })),
      );
      setResult(outcome);
      if (outcome.blocked.length > 0) onBlocked();
      if (outcome.blocked.length > 0 && outcome.partial.length === 0 && outcome.failures.length === 0) {
        // Clean run: nothing left to explain, close and let the calendar behind
        // this dialog — now re-read — be the confirmation.
        onOpenChange(false);
        setNotes("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block this time.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" data-slot="block-time-dialog">
        <DialogHeader>
          <DialogTitle>Block time</DialogTitle>
          <DialogDescription>
            {formatShiftSummary(date, startTime, endTime)}. Blocked time cannot
            be booked by patients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="block-start-time" className="text-xs">
                Start
              </Label>
              <Input
                id="block-start-time"
                type="time"
                step={900}
                value={startTime}
                onChange={(event) => {
                  setStartTime(event.target.value);
                  reset();
                }}
                required
                className="h-9"
              />
            </div>
            <span className="pb-2 text-muted-foreground" aria-hidden>
              –
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="block-end-time" className="text-xs">
                End
              </Label>
              <Input
                id="block-end-time"
                type="time"
                step={900}
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value);
                  reset();
                }}
                required
                className="h-9"
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-muted-foreground">Slot length</legend>
            <div
              role="radiogroup"
              aria-label="Slot length"
              className="flex items-center gap-1 rounded-full border bg-muted/40 p-1"
            >
              {DURATIONS.map((duration) => {
                const selected = duration === durationMinutes;
                return (
                  <button
                    key={duration}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${duration} minute slots`}
                    onClick={() => {
                      setDurationMinutes(duration);
                      reset();
                    }}
                    className={cn(
                      "flex-1 rounded-full px-2 py-1 text-xs font-bold transition-colors",
                      selected
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {duration} min
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <Label htmlFor="block-notes" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="block-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Applied to every blocked slot"
              rows={2}
              className="min-h-0 resize-none text-sm"
            />
          </div>

          <BlockTimeStatus plan={plan} result={result} error={error} />

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Blocking…" : "Block time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BlockTimeStatus({
  plan,
  result,
  error,
}: {
  plan: ReturnType<typeof planSlots>;
  result: BlockTimeResult | null;
  error: string | null;
}) {
  if (error) {
    return (
      <p role="alert" className="text-xs text-destructive" data-slot="block-time-error">
        {error}
      </p>
    );
  }

  if (result) {
    return (
      <div
        role={result.failures.length > 0 || result.partial.length > 0 ? "alert" : "status"}
        className="flex flex-col gap-1 rounded-lg bg-muted/40 px-2.5 py-2 text-xs"
        data-slot="block-time-result"
      >
        {result.blocked.length > 0 ? (
          <span>
            Blocked <strong>{result.blocked.length}</strong>{" "}
            {result.blocked.length === 1 ? "slot" : "slots"}.
          </span>
        ) : null}
        {result.partial.length > 0 ? (
          <span className="text-destructive">
            {result.partial.length} slot{result.partial.length === 1 ? "" : "s"} were
            created but could not be marked blocked, so{" "}
            {result.partial.length === 1 ? "it is" : "they are"} still bookable —
            open the full calendar to block{" "}
            {result.partial.length === 1 ? "it" : "them"} manually.
          </span>
        ) : null}
        {result.failures.length > 0 ? (
          <span className="text-destructive">
            {result.failures.length} window{result.failures.length === 1 ? "" : "s"}{" "}
            could not be created: {result.failures.map((f) => f.startTime).join(", ")}.
          </span>
        ) : null}
      </div>
    );
  }

  if (plan.error) {
    return (
      <p className="text-xs text-destructive" data-slot="block-time-plan-error">
        {plan.error}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground" data-slot="block-time-preview">
      Will block <strong>{plan.startTimes.length}</strong>{" "}
      {plan.startTimes.length === 1 ? "slot" : "slots"}.
      {plan.overlapping.length > 0
        ? ` Skipping ${plan.overlapping.length} time${plan.overlapping.length === 1 ? "" : "s"} already on this day.`
        : ""}
    </p>
  );
}
