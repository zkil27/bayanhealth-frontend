"use client";

import { useState } from "react";
import { Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const OVERRIDE_REASON_MIN = 10;
export const OVERRIDE_REASON_MAX = 500;

/**
 * "Proceed on my clinical judgment" for an active red flag (ADR-20261005-01).
 *
 * 10-02 demo: a red flag must not lock the doctor out. The finding stays on
 * screen; the doctor records why they are proceeding, and drafting reopens for
 * this exact clinical situation. A new red flag pauses it again. The reason is
 * kept for clinical review.
 */
export function RedFlagOverrideControl({
  assessmentConfirmed,
  busy,
  onProceed,
}: {
  assessmentConfirmed: boolean;
  busy: boolean;
  onProceed: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const valid = trimmed.length >= OVERRIDE_REASON_MIN && trimmed.length <= OVERRIDE_REASON_MAX;

  if (!open) {
    return (
      <div data-slot="red-flag-override" className="mt-3 flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          shape="pill"
          className="w-fit border-(--danger-border)/70 bg-(--surface-card) max-lg:h-11"
          disabled={busy || !assessmentConfirmed}
          onClick={() => setOpen(true)}
        >
          <Stethoscope className="size-4" aria-hidden />
          Proceed on my clinical judgment
        </Button>
        {!assessmentConfirmed ? (
          <p className="text-xs text-(--text-muted)">Confirm your Assessment first, then you can proceed.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div data-slot="red-flag-override" className="mt-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
      <label htmlFor="red-flag-override-reason" className="text-sm font-semibold text-(--text-heading)">
        Why are you proceeding?
      </label>
      <p className="text-xs text-(--text-muted)">
        Kept with this consultation for clinical review. AI drafting reopens for this finding only; a new
        red flag pauses it again.
      </p>
      <Textarea
        id="red-flag-override-reason"
        value={reason}
        maxLength={OVERRIDE_REASON_MAX}
        placeholder="e.g. Chest pain reproducible on palpation, no exertional component; ER precautions given."
        className="mt-2 min-h-20 rounded-xl text-base sm:text-sm"
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          shape="pill"
          className="max-lg:h-11"
          disabled={busy || !valid}
          onClick={() => onProceed(trimmed)}
        >
          Proceed
        </Button>
        <Button type="button" variant="ghost" shape="pill" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        {!valid && trimmed.length > 0 ? (
          <span className="text-xs text-(--text-muted)">At least {OVERRIDE_REASON_MIN} characters.</span>
        ) : null}
      </div>
    </div>
  );
}
