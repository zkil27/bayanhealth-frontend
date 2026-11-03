"use client";

import { AlertCircle, NotebookPen, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ClinicalNoteField,
  NotesSaveState,
  type ClinicalNotes,
} from "@/features/consultation/components/postConsultation/ClinicalNotesCard";

/**
 * The doctor's own Subjective and Objective, written during the call.
 *
 * Pilot feedback (2026-11, P1 "Editable clinical notes"): doctors wanted to
 * write S and O while the patient was still talking, and to correct the
 * patient's own complaint. These are the same notes record, hook and fields
 * as the post-consult workspace, so what is written here is what the doctor
 * finds after ending the call. The patient's intake stays exactly as the
 * patient wrote it; the Subjective field starts as a copy the doctor rewrites.
 *
 * Assessment is deliberately not here. It is the drafting gate and belongs to
 * the post-consult workspace.
 */
export function RoomNotesTab({
  notes,
  available,
  demo = false,
}: {
  notes: ClinicalNotes;
  /** The consultation has started, so there is a record to save into. */
  available: boolean;
  demo?: boolean;
}) {
  if (demo || !available) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <NotebookPen className="size-6 text-(--text-muted)" aria-hidden />
        <p className="max-w-xs text-sm text-(--text-muted)">
          {demo
            ? "Notes are saved only in a live consultation."
            : "Notes open when the consultation starts."}
        </p>
      </div>
    );
  }

  const showRetry = notes.saveFailed && notes.dirty && !notes.saving;

  return (
    <div data-slot="room-notes" className="flex flex-1 flex-col gap-4 p-3 sm:p-3.5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-(--text-heading)">Your notes</h3>
          <NotesSaveState state={notes.saveState} prefilled={notes.prefilled} />
        </div>
        <p className="text-xs text-(--text-muted)">
          Private to you, never shown to the patient. They save when you leave a field, and carry over to
          documentation after the call.
        </p>
      </div>

      {showRetry ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-(--attention-border)/50 bg-(--attention-bg) px-3 py-2.5"
        >
          <p className="flex min-w-0 flex-1 items-start gap-1.5 text-sm font-medium text-(--attention-fg)">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Not saved. Your text is still here.
          </p>
          <Button
            type="button"
            variant="outline"
            shape="pill"
            className="h-11 shrink-0 gap-1.5 border-(--border-default) bg-(--surface-card) lg:h-9"
            onClick={() => void notes.save()}
          >
            <RotateCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      ) : null}

      <ClinicalNoteField
        notes={notes}
        field="subjective"
        label="Your subjective notes"
        hint={notes.prefilled ? "Pre-filled from the intake: edit it freely" : undefined}
        placeholder="What the patient tells you, in your words."
      />
      <ClinicalNoteField
        notes={notes}
        field="objective"
        label="Your objective findings"
        placeholder="What you observe or measure on the call."
      />

      <p className="mt-auto border-t border-(--border-subtle) pt-3 text-xs text-(--text-muted)">
        Assessment and documents come after you end the call.
      </p>
    </div>
  );
}
