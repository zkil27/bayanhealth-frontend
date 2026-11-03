"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * Saves all three fields. Resolves `true` when the notes on the server now
   * match what is on screen (including when nothing changed), `false` when
   * the save failed. A save already in flight is awaited, then anything typed
   * since is saved too, so a caller that must not lose text (End consultation)
   * can await it.
   */
  save: () => Promise<boolean>;
  loaded: boolean;
  saving: boolean;
  /** Fields pre-filled from the intake and not yet saved. */
  prefilled: boolean;
  /** The last save attempt failed and the text on screen is not on the server. */
  saveFailed: boolean;
  /** Something on screen differs from the last saved version. */
  dirty: boolean;
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
 *
 * Used by the post-consult workspace and by the consultation room's Notes tab
 * (2026-11), so S and O written during the call are the same record.
 *
 * The draft, last-saved values and revision are mirrored in refs so `save`
 * always sends what is on screen. It used to close over the render before the
 * field's final `setField`, so leaving a field saved the text from before the
 * last edit.
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
  const [draft, setDraftState] = useState<ClinicalNotesDraft>(EMPTY);
  const [saved, setSavedState] = useState<ClinicalNotesDraft>(EMPTY);
  const [revision, setRevisionState] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const draftRef = useRef<ClinicalNotesDraft>(EMPTY);
  const savedRef = useRef<ClinicalNotesDraft>(EMPTY);
  const revisionRef = useRef(0);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const setDraft = useCallback((next: ClinicalNotesDraft) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);
  const setSaved = useCallback((next: ClinicalNotesDraft) => {
    savedRef.current = next;
    setSavedState(next);
  }, []);
  const setRevision = useCallback((next: number) => {
    revisionRef.current = next;
    setRevisionState(next);
  }, []);

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
    [consultationId, token, setDraft, setSaved, setRevision],
  );

  useEffect(() => {
    if (!token || !consultationId) return;
    let cancelled = false;
    void load()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [load, token, consultationId]);

  // Pre-fill once, after the read says nothing is saved and the intake is in.
  useEffect(() => {
    if (!loaded || revision > 0 || prefilled || intake === undefined) return;
    if (draft.subjective || draft.objective || draft.assessmentNotes) return;
    const values = prefillFromIntake(intake);
    if (values.subjective || values.objective) {
      setDraft(values);
      setPrefilled(true);
    }
  }, [loaded, revision, prefilled, intake, draft, setDraft]);

  const dirty =
    draft.subjective !== saved.subjective ||
    draft.objective !== saved.objective ||
    draft.assessmentNotes !== saved.assessmentNotes;

  const save = useCallback(async (): Promise<boolean> => {
    // Let a save that is already running finish, then save whatever was typed
    // after it started.
    while (inFlightRef.current) {
      await inFlightRef.current;
    }
    const current = draftRef.current;
    const last = savedRef.current;
    const changed =
      current.subjective !== last.subjective ||
      current.objective !== last.objective ||
      current.assessmentNotes !== last.assessmentNotes;
    if (!changed) return true;
    if (!token || !consultationId) return false;

    const attempt = (async () => {
      setSaving(true);
      try {
        const notes = await saveClinicalNotes(consultationId, token, current, revisionRef.current);
        setSaved({ subjective: notes.subjective, objective: notes.objective, assessmentNotes: notes.assessmentNotes });
        setRevision(notes.revision);
        setPrefilled(false);
        setSaveFailed(false);
        return true;
      } catch (error) {
        setSaveFailed(true);
        if (error instanceof ApiError && error.status === 409) {
          await load().catch(() => null);
          toast.error("These notes were changed in another tab", {
            description: "The latest version is loaded. Re-apply your edit and save again.",
          });
        } else {
          toast.error("Couldn't save your notes", {
            description: "Your text is still here. Try again in a moment.",
          });
        }
        return false;
      } finally {
        setSaving(false);
      }
    })();
    inFlightRef.current = attempt;
    try {
      return await attempt;
    } finally {
      inFlightRef.current = null;
    }
  }, [consultationId, load, token, setSaved, setRevision]);

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

  const setField = useCallback(
    (key: keyof ClinicalNotesDraft, value: string) => {
      setDraft({ ...draftRef.current, [key]: value });
    },
    [setDraft],
  );

  const saveState: ClinicalNotesSaveState = saving
    ? "saving"
    : dirty
      ? "unsaved"
      : revision > 0
        ? "saved"
        : "idle";

  return { draft, setField, save, loaded, saving, prefilled, saveFailed, dirty, saveState };
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
 *
 * Internally isolates fast local typing state with debounced sync to parent
 * notes, ensuring typing at 60 FPS without triggering full-workspace re-renders.
 */
export const ClinicalNoteField = memo(function ClinicalNoteField({
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
  const externalValue = notes.draft[field] ?? "";
  const [localValue, setLocalValue] = useState(externalValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Sync from external draft when external value changes (e.g. initial fetch or reset)
  // unless the physician is actively typing into this field
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(externalValue);
    }
  }, [externalValue]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    isTypingRef.current = true;
    setLocalValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      notes.setField(field, next);
      isTypingRef.current = false;
    }, 300);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    isTypingRef.current = false;
    if (localValue !== notes.draft[field]) {
      notes.setField(field, localValue);
    }
    void notes.save();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
        value={localValue}
        maxLength={CLINICAL_NOTE_MAX}
        placeholder={placeholder}
        className="min-h-20 rounded-xl text-base sm:text-sm"
        disabled={!notes.loaded}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
});
