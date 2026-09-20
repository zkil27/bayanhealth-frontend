"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarPlus, Lock, LockOpen, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

import {
  deleteSlot,
  updateSlot,
  type Slot,
  type SlotStatus,
} from "../../lib/api/schedule";

/** Tone mapping for the per-slot status badge. */
function statusBadgeVariant(
  status: SlotStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "booked":
      return "default";
    case "blocked":
      return "destructive";
    case "available":
    default:
      return "secondary";
  }
}

/**
 * The active day's slots, with per-row Block and Delete.
 *
 * Only one date is listed, so the doctor reads a day rather than scanning a flat
 * month. Booked slots render without controls at all: the backend rejects both
 * writes on a booked slot (409), so offering the buttons would only produce an
 * error the doctor cannot act on.
 */
export function ActiveDaySlotList({
  slots,
  idToken,
  doctorId,
  onMutated,
  onAddShift,
}: {
  /** Slots for the active date only, unsorted. */
  slots: Slot[];
  idToken: string;
  doctorId: string;
  onMutated: () => void;
  /**
   * Opens the availability popover for this day; used by the empty state.
   * Carries the click so the popover can anchor to the button that opened it.
   */
  onAddShift: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const ordered = useMemo(
    () => [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots],
  );

  if (ordered.length === 0) {
    return (
      <div
        data-slot="schedule-day-empty"
        className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-6"
      >
        <h3 className="font-medium">No slots on this day</h3>
        <p className="text-sm text-muted-foreground">
          Nothing is published for this date yet, so patients cannot book it. Add
          a shift above to open it up.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onAddShift}>
          <CalendarPlus className="size-4" aria-hidden="true" /> Add a shift
        </Button>
      </div>
    );
  }

  return (
    <ul data-slot="schedule-day-list" className="flex flex-col gap-2">
      {ordered.map((slot) => (
        <SlotRow
          key={slot.slotId}
          slot={slot}
          idToken={idToken}
          doctorId={doctorId}
          onMutated={onMutated}
        />
      ))}
    </ul>
  );
}

function SlotRow({
  slot,
  idToken,
  doctorId,
  onMutated,
}: {
  slot: Slot;
  idToken: string;
  doctorId: string;
  onMutated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runWrite = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        onMutated();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Action failed. Please try again.",
        );
        setBusy(false);
      }
    },
    [onMutated],
  );

  const handleToggleBlock = useCallback(() => {
    const nextStatus: SlotStatus =
      slot.status === "blocked" ? "available" : "blocked";
    return runWrite(() =>
      updateSlot(idToken, doctorId, slot.slotId, slot.date, {
        status: nextStatus,
      }),
    );
  }, [runWrite, slot.status, slot.slotId, slot.date, idToken, doctorId]);

  const handleDelete = useCallback(
    () => runWrite(() => deleteSlot(idToken, doctorId, slot.slotId, slot.date)),
    [runWrite, idToken, doctorId, slot.slotId, slot.date],
  );

  const isBooked = slot.status === "booked";
  const isBlocked = slot.status === "blocked";

  return (
    <li
      data-slot="schedule-slot"
      data-status={slot.status}
      className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{slot.startTime}</span>
          <span className="text-sm text-muted-foreground">
            {slot.durationMinutes} min
          </span>
          <Badge variant={statusBadgeVariant(slot.status)}>{slot.status}</Badge>
        </div>
        {slot.notes ? (
          <span className="truncate text-xs text-muted-foreground">
            {slot.notes}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        ) : null}
      </div>

      {isBooked ? (
        <span className="text-sm text-muted-foreground">
          Booked — read-only
        </span>
      ) : (
        <div
          // Revealed on hover, and equally on keyboard focus. Only opacity is
          // animated: `hidden` would drop the buttons out of the tab order and
          // out of the accessibility tree, so a keyboard user could never reach
          // a control they cannot hover to find. Below `lg` the controls stay
          // visible, because a touch pointer has no hover state to reveal them.
          className="flex items-center gap-2 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleToggleBlock}
            aria-label={`${isBlocked ? "Unblock" : "Block"} the ${
              slot.startTime
            } slot`}
          >
            {isBlocked ? (
              <>
                <LockOpen className="size-4" aria-hidden="true" /> Unblock
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" /> Block
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={handleDelete}
            aria-label={`Delete the ${slot.startTime} slot`}
          >
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </Button>
        </div>
      )}
    </li>
  );
}
