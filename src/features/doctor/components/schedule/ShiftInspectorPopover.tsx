"use client";

import { useCallback, useMemo, useState } from "react";
import { Lock, LockOpen, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  deleteSlot,
  removeShift,
  updateSlot,
  type RetainedShiftSlot,
  type Slot,
  type SlotStatus,
} from "../../lib/api/schedule";
import { formatShiftSummary, formatTimeOfDay } from "./calendarView";
import { styleFor, type CalendarPalette } from "./calendarColors";
import type { CalendarEntry } from "./calendarEntries";
import { SchedulePopover, type AnchorRect } from "./SchedulePopover";
import { formatMinutesToTime } from "./slotPlan";

const STATUS_LABEL: Record<SlotStatus, string> = {
  available: "Open",
  booked: "Booked",
  blocked: "Blocked",
};

const STATUS_STYLE: Record<SlotStatus, string> = {
  available: "bg-(--status-available-bg) text-(--status-available-fg)",
  booked: "bg-(--action-primary) text-white",
  blocked: "bg-(--surface-warm-soft) text-(--text-muted)",
};

/** What the last write on this block did, kept separate from the slot data itself. */
type Outcome =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string }
  | { kind: "partial"; removed: number; retained: RetainedShiftSlot[] };

/**
 * The popover a click on an existing block opens.
 *
 * Clicking a published shift used to open the *create* form pre-filled with that
 * shift's hours — an invitation to try to publish the same window twice, which
 * the backend then refused with an overlap conflict. What the doctor actually
 * wants when they click a block they already made is to see what is in it and,
 * usually, to take some of it back down. So this popover inspects rather than
 * creates: every slot in the block with its real status, a per-slot block/delete,
 * and one action for the whole shift.
 *
 * The rule the surface has to make legible is that **a booked slot is not
 * removable**. It carries no controls at all — the backend answers `409` for
 * both writes on a booked slot, so offering a button would only produce an error
 * the doctor cannot act on — and a shift delete that leaves bookings behind says
 * so with the reason for each, rather than reporting a bare failure.
 */
export function ShiftInspectorPopover({
  open,
  anchor,
  entry,
  palette,
  idToken,
  doctorId,
  onClose,
  onMutated,
  onOpenDay,
}: {
  open: boolean;
  anchor: AnchorRect | null;
  /** The availability run being inspected. Appointments use their own popover. */
  entry: CalendarEntry | null;
  palette: CalendarPalette;
  idToken: string;
  doctorId: string;
  onClose: () => void;
  /** Re-read the calendar after a successful write. */
  onMutated: () => void;
  onOpenDay: (date: string) => void;
}) {
  /*
    A different block is a different subject, and whatever the last one reported
    must not carry over onto it. That reset is the caller's job: it renders this
    popover under a `key` derived from the block, so switching blocks remounts
    the component and this state starts clean — no effect that has to notice the
    change one render late.
  */
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  const slots = useMemo(
    () => [...(entry?.slots ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [entry],
  );

  const date = entry?.date ?? "";
  const startTime = entry ? formatMinutesToTime(entry.startMinutes) : "";
  const endTime = entry ? formatMinutesToTime(entry.endMinutes) : "";

  const runWrite = useCallback(
    async (action: () => Promise<unknown>) => {
      setOutcome({ kind: "busy" });
      try {
        await action();
        setOutcome({ kind: "idle" });
        onMutated();
      } catch (err) {
        setOutcome({
          kind: "error",
          message:
            err instanceof ApiError ? err.message : "Action failed. Please try again.",
        });
      }
    },
    [onMutated],
  );

  const handleDeleteShift = useCallback(async () => {
    if (!entry) return;
    setOutcome({ kind: "busy" });
    try {
      const result = await removeShift(idToken, doctorId, {
        date,
        startTime,
        endTime,
        slots: entry.slots,
      });
      // Whatever was removed is really gone, so the calendar is re-read either
      // way; the popover only stays open when something was held back.
      onMutated();
      if (result.retained.length === 0) {
        onClose();
        return;
      }
      setOutcome({
        kind: "partial",
        removed: result.deleted.length,
        retained: result.retained,
      });
    } catch (err) {
      setOutcome({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "The shift could not be removed. Please try again.",
      });
    }
  }, [entry, idToken, doctorId, date, startTime, endTime, onMutated, onClose]);

  if (!entry) return null;

  const busy = outcome.kind === "busy";
  const removableCount = slots.filter((slot) => slot.status !== "booked").length;
  const openCount = slots.filter((slot) => slot.status === "available").length;
  const blockedCount = slots.filter((slot) => slot.status === "blocked").length;

  return (
    <SchedulePopover
      open={open}
      anchor={anchor}
      label={`Availability on ${date}, ${startTime} to ${endTime}`}
      onClose={onClose}
      testId="shift-inspector-popover"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1 size-3 shrink-0 rounded-[4px]"
          style={styleFor(palette[entry.category])}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            data-slot="shift-inspector-summary"
            className="text-sm font-bold text-(--text-heading)"
          >
            {formatShiftSummary(date, startTime, endTime)}
          </h2>
          <p className="text-xs text-(--text-muted)">
            {slots.length} {slots.length === 1 ? "slot" : "slots"}
            {openCount > 0 ? ` · ${openCount} open` : ""}
            {blockedCount > 0 ? ` · ${blockedCount} blocked` : ""}
          </p>
          {entry.notes ? (
            <p className="mt-0.5 truncate text-xs text-(--text-subtle)">{entry.notes}</p>
          ) : null}
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

      <ul
        data-slot="shift-inspector-slots"
        className="flex max-h-56 flex-col gap-1 overflow-y-auto"
      >
        {slots.map((slot) => (
          <InspectorSlotRow
            key={slot.slotId}
            slot={slot}
            busy={busy}
            onToggleBlock={() =>
              runWrite(() =>
                updateSlot(idToken, doctorId, slot.slotId, slot.date, {
                  status: slot.status === "blocked" ? "available" : "blocked",
                }),
              )
            }
            onDelete={() =>
              runWrite(() => deleteSlot(idToken, doctorId, slot.slotId, slot.date))
            }
          />
        ))}
      </ul>

      {outcome.kind === "error" ? (
        <p
          data-slot="shift-inspector-error"
          role="alert"
          className="rounded-lg bg-(--danger-bg) px-2.5 py-2 text-xs text-(--danger-fg)"
        >
          {outcome.message}
        </p>
      ) : null}

      {outcome.kind === "partial" ? (
        <div
          data-slot="shift-inspector-retained"
          role="alert"
          className="flex flex-col gap-1 rounded-lg bg-(--surface-warm-soft) px-2.5 py-2 text-xs"
        >
          <span className="text-(--text-heading)">
            Removed {outcome.removed} {outcome.removed === 1 ? "slot" : "slots"}.{" "}
            {outcome.retained.length}{" "}
            {outcome.retained.length === 1 ? "slot" : "slots"} stayed:
          </span>
          <ul className="flex flex-col gap-0.5 pl-4">
            {outcome.retained.map((entry) => (
              <li
                key={entry.slotId}
                data-slot="shift-inspector-retained-slot"
                className="list-disc text-(--danger-fg)"
              >
                {formatTimeOfDay(entry.startTime)} — {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy || removableCount === 0}
          onClick={handleDeleteShift}
          className="rounded-full"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {busy ? "Removing…" : "Delete shift"}
        </Button>
        <button
          type="button"
          onClick={() => onOpenDay(date)}
          className="ml-auto text-xs font-medium text-(--text-muted) underline-offset-2 hover:text-(--text-heading) hover:underline"
        >
          Manage this day
        </button>
      </div>

      {removableCount === 0 ? (
        <p className="text-xs text-(--text-muted)">
          Every slot here is booked. Cancel the appointments before removing the
          time.
        </p>
      ) : null}
    </SchedulePopover>
  );
}

/** One slot inside the inspected block: its time, its status, and what may be done to it. */
function InspectorSlotRow({
  slot,
  busy,
  onToggleBlock,
  onDelete,
}: {
  slot: Slot;
  busy: boolean;
  onToggleBlock: () => void;
  onDelete: () => void;
}) {
  const isBooked = slot.status === "booked";
  const isBlocked = slot.status === "blocked";

  return (
    <li
      data-slot="schedule-slot"
      data-status={slot.status}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--surface-warm-soft)"
    >
      <span className="font-medium text-(--text-heading)">{slot.startTime}</span>
      <span className="text-xs text-(--text-subtle)">{slot.durationMinutes}m</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold",
          STATUS_STYLE[slot.status],
        )}
      >
        {STATUS_LABEL[slot.status]}
      </span>

      {isBooked ? (
        // No controls at all: the backend refuses both writes on a booked slot,
        // so a button here could only ever produce an error.
        <span className="ml-auto text-xs text-(--text-muted)">Read-only</span>
      ) : (
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={onToggleBlock}
            aria-label={`${isBlocked ? "Unblock" : "Block"} the ${slot.startTime} slot`}
            className="flex size-7 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--surface-card) hover:text-(--text-heading) disabled:opacity-50"
          >
            {isBlocked ? (
              <LockOpen className="size-3.5" aria-hidden="true" />
            ) : (
              <Lock className="size-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            aria-label={`Delete the ${slot.startTime} slot`}
            className="flex size-7 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--danger-bg) hover:text-(--danger-fg) disabled:opacity-50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      )}
    </li>
  );
}
