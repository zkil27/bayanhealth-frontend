"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import {
  CLINICAL_NOTE_MAX,
  fetchClinicalNotes,
  saveClinicalNotes,
  type ClinicalNotesDraft,
} from "../../lib/api/clinicalNotes";
import { formatIntakeVitalsLine } from "./SoapSummaryCards";

const EMPTY: ClinicalNotesDraft = { subjective: "", objective: "", assessmentNotes: "" };

/**
 * A starting point drawn from the intake, for a consultation with no notes yet.
 * Only what the patient actually submitted; empty when they submitted nothing.
 */
function prefillFromIntake(intake: BookingIntakeForm | null | undefined): ClinicalNotesDraft {
  const purpose = intake?.sections.purpose;
  const subjective = [
    purpose?.chiefComplaint?.trim(),
    purpose?.patientVerbatim?.trim() ? `Patient: "${purpose.patientVerbatim.trim()}"` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  const vitals = formatIntakeVitalsLine(intake?.sections.details?.vitals);
  return {
    subjective,
    objective: vitals ? `Patient-recorded vitals: ${vitals}` : "",
    assessmentNotes: "",
  };
}

export type ClinicalNotesSaveState = "idle" | "saving" | "unsaved" | "saved";

export interface ClinicalNotes {
  draft: ClinicalNotesDraft;
  setField: (key: keyof ClinicalNotesDraft, value: string) => void;
  /** Saves all three fields. A no-op when nothing changed. */
  save: () => Promise<void>;
  loaded: boolean;
  saving: boolean;
  /** Fields pre-filled from the intake and not yet saved. */
  prefilled: boolean;
  saveState: ClinicalNotesSaveState;
}

/**
 * The physician's own Subjective, Objective and Assessment reasoning.
 *
 * Was one "Your notes" card with its own S, O and A letters, sitting between
 * the intake strip (also lettered S and O) and the Assessment card (also A).
 * The state now lives in this hook so each field can sit inside its own SOAP
 * section of the workspace, under the patient's intake for that section. The
 * contract is unchanged: one GET, one PUT with the revision for all three
 * fields, internal only, never sent to the AI or shown to the patient.
 */
export function useClinicalNotes({
  consultationId,
  token,
  intake,
}: {
  consultationId: string;
  token: string;
  intake: BookingIntakeForm | null | undefined;
}): ClinicalNotes {
  const [draft, setDraft] = useState<ClinicalNotesDraft>(EMPTY);
  const [saved, setSaved] = useState<ClinicalNotesDraft>(EMPTY);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(
    () =>
      fetchClinicalNotes(consultationId, token).then((notes) => {
        if (notes) {
          const values = {
            subjective: notes.subjective,
            objective: notes.objective,
            assessmentNotes: notes.assessmentNotes,
          };
          setDraft(values);
          setSaved(values);
          setRevision(notes.revision);
          setPrefilled(false);
        }
        return notes;
      }),
    [consultationId, token],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void load()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [load, token]);

  // Pre-fill once, after the read says nothing is saved and the intake is in.
  useEffect(() => {
    if (!loaded || revision > 0 || prefilled || intake === undefined) return;
    if (draft.subjective || draft.objective || draft.assessmentNotes) return;
    const values = prefillFromIntake(intake);
    if (values.subjective || values.objective) {
      setDraft(values);
      setPrefilled(true);
    }
  }, [loaded, revision, prefilled, intake, draft]);

  const dirty =
    draft.subjective !== saved.subjective ||
    draft.objective !== saved.objective ||
    draft.assessmentNotes !== saved.assessmentNotes;

  const save = useCallback(async () => {
    const current = draft;
    const changed =
      current.subjective !== saved.subjective ||
      current.objective !== saved.objective ||
      current.assessmentNotes !== saved.assessmentNotes;
    if (!changed || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const notes = await saveClinicalNotes(consultationId, token, current, revision);
      setSaved({ subjective: notes.subjective, objective: notes.objective, assessmentNotes: notes.assessmentNotes });
      setRevision(notes.revision);
      setPrefilled(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await load().catch(() => null);
        toast.error("These notes were changed in another tab", {
          description: "The latest version is loaded. Re-apply your edit and save again.",
        });
      } else {
        toast.error("Couldn't save your notes", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [consultationId, draft, load, revision, saved, token]);

  // A phone gets locked, or the doctor switches to another app, mid-sentence.
  // Blur does not fire then, so save when the page is hidden as well.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void saveRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const setField = useCallback((key: keyof ClinicalNotesDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const saveState: ClinicalNotesSaveState = saving
    ? "saving"
    : dirty
      ? "unsaved"
      : revision > 0
        ? "saved"
        : "idle";

  return { draft, setField, save, loaded, saving, prefilled, saveState };
}

const SAVE_STATE_COPY: Record<ClinicalNotesSaveState, string> = {
  idle: "",
  saving: "Saving…",
  unsaved: "Not saved",
  saved: "Saved",
};

/** "Saving…" / "Not saved" / "Saved" / "Pre-filled", for a section header. */
export function NotesSaveState({ state, prefilled }: { state: ClinicalNotesSaveState; prefilled?: boolean }) {
  const text = prefilled && state !== "saving" ? "Pre-filled" : SAVE_STATE_COPY[state];
  if (!text) return null;
  return (
    <span
      aria-live="polite"
      title={prefilled ? "Pre-filled from the intake. Edit it, and it saves when you leave the field." : undefined}
      className={cn(
        "text-xs font-medium",
        state === "saved" ? "text-(--status-available-fg)" : "text-(--text-muted)",
      )}
    >
      {text}
    </span>
  );
}

/**
 * One of the physician's note fields. Saves when the field loses focus, the
 * same moment the old card saved, so nothing is lost by moving on.
 */
export function ClinicalNoteField({
  notes,
  field,
  label,
  placeholder,
  hint,
}: {
  notes: ClinicalNotes;
  field: keyof ClinicalNotesDraft;
  label: string;
  placeholder: string;
  hint?: string;
}) {
  const id = `clinical-notes-${field}`;
  return (
    <div data-slot="clinical-note-field" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={id} className="text-sm font-semibold text-(--text-heading)">
          {label}
        </label>
        {hint ? <span className="text-xs text-(--text-muted)">{hint}</span> : null}
      </div>
      <Textarea
        id={id}
        value={notes.draft[field]}
        maxLength={CLINICAL_NOTE_MAX}
        placeholder={placeholder}
        className="min-h-20 rounded-xl text-base sm:text-sm"
        disabled={!notes.loaded}
        onChange={(event) => notes.setField(field, event.target.value)}
        onBlur={() => void notes.save()}
      />
    </div>
  );
}
