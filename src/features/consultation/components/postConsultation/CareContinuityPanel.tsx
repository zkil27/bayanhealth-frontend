"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfToday,
} from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  FOLLOW_UP_REASON_MAX,
  fetchFollowUpRecommendation,
  saveFollowUpRecommendation,
} from "@/features/doctor/lib/api/careContinuity";
import { cn } from "@/lib/utils";

const PRESET_INTERVALS = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
];

const REASON_SUGGESTIONS = [
  "General follow-up",
  "Symptom re-check",
  "Review lab results",
  "Vital signs check",
  "Medication review",
  "Clinical clearance",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function relativeLabel(targetDate: string): string | null {
  if (!ISO_DATE.test(targetDate)) return null;
  const diff = differenceInCalendarDays(parseISO(targetDate), startOfToday());
  if (Number.isNaN(diff)) return null;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff === 7) return "in 1 week";
  if (diff === 14) return "in 2 weeks";
  if (diff === 30 || diff === 31) return "in 1 month";
  if (diff >= 88 && diff <= 92) return "in 3 months";
  return `in ${diff} days`;
}

export interface FollowUpRecommendation {
  targetDate: string;
  setTargetDate: (value: string) => void;
  reason: string;
  setReason: (value: string | ((previous: string) => string)) => void;
  loaded: boolean;
  saving: boolean;
  savedAt: string | null;
  isDirty: boolean;
  canSave: boolean;
  save: () => Promise<void>;
  clear: () => void;
}

/**
 * The follow-up recommendation for this consultation, loaded once by the
 * workspace so the document checklist can show whether one is set without the
 * editor being open. Same endpoints as before.
 */
export function useFollowUpRecommendation(consultationId: string, token: string): FollowUpRecommendation {
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [initial, setInitial] = useState({ date: "", reason: "" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetchFollowUpRecommendation(consultationId, token)
      .then((rec) => {
        if (cancelled || !rec) return;
        setTargetDate(rec.targetDate);
        setReason(rec.reason);
        setSavedAt(rec.updatedAt);
        setInitial({ date: rec.targetDate, reason: rec.reason });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultationId, token]);

  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const isDirty = targetDate !== initial.date || reason.trim() !== initial.reason.trim();
  const canSave = !saving && ISO_DATE.test(targetDate) && targetDate >= todayStr && reason.trim().length > 0;

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const rec = await saveFollowUpRecommendation(consultationId, token, {
        targetDate,
        reason: reason.trim(),
      });
      setSavedAt(rec.updatedAt);
      setInitial({ date: rec.targetDate, reason: rec.reason });
      toast.success("Follow-up saved.");
    } catch (e) {
      toast.error("Couldn't save the follow-up", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [canSave, consultationId, reason, targetDate, token]);

  const clear = useCallback(() => {
    setTargetDate("");
    setReason("");
  }, []);

  return { targetDate, setTargetDate, reason, setReason, loaded, saving, savedAt, isDirty, canSave, save, clear };
}

/** The checklist row's status for the follow-up. */
export function followUpStatus(followUp: FollowUpRecommendation): {
  label: string;
  tone: "neutral" | "attention" | "success";
} {
  if (followUp.isDirty && (followUp.targetDate || followUp.reason)) {
    return { label: "Not saved", tone: "attention" };
  }
  if (followUp.savedAt && ISO_DATE.test(followUp.targetDate)) {
    return { label: format(parseISO(followUp.targetDate), "MMM d"), tone: "success" };
  }
  return { label: "Optional", tone: "neutral" };
}

const chipClass = (selected: boolean) =>
  cn(
    "flex min-h-10 items-center justify-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors select-none disabled:opacity-50 max-lg:min-h-11",
    selected
      ? "border-(--action-primary) bg-(--action-primary) text-(--action-primary-text)"
      : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--action-primary)/50 hover:bg-(--surface-warm-soft)",
  );

/**
 * When the patient should come back, and why. Optional.
 *
 * Shown in the document checklist's pane as "Follow-up", because a return
 * visit is part of the Plan, not a separate card at the bottom of the page.
 */
export function CareContinuityPanel({ followUp }: { followUp: FollowUpRecommendation }) {
  const { targetDate, setTargetDate, reason, setReason, loaded, saving, savedAt, isDirty, canSave, save, clear } =
    followUp;
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!ISO_DATE.test(targetDate)) return undefined;
    const parsed = parseISO(targetDate);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [targetDate]);
  const activePreset = selectedDate
    ? PRESET_INTERVALS.find((preset) => preset.days === differenceInCalendarDays(selectedDate, startOfToday()))
    : undefined;
  const relative = relativeLabel(targetDate);

  const pickDate = (date: Date) => {
    setTargetDate(format(date, "yyyy-MM-dd"));
    if (!reason.trim()) setReason("General follow-up");
  };

  const addReason = (suggestion: string) =>
    setReason((previous) => {
      const trimmed = previous.trim();
      if (!trimmed || trimmed === "General follow-up") return suggestion;
      if (trimmed.includes(suggestion)) return trimmed;
      return `${trimmed}; ${suggestion}`.slice(0, FOLLOW_UP_REASON_MAX);
    });

  return (
    <div data-slot="care-continuity-panel" className="flex flex-col gap-5 p-4 sm:p-5">
      <fieldset className="flex flex-col gap-2.5" disabled={!loaded || saving}>
        <legend className="mb-2.5 text-sm font-semibold text-(--text-heading)">Come back in</legend>
        <div className="flex flex-wrap gap-2">
          {PRESET_INTERVALS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={activePreset?.days === preset.days}
              onClick={() => pickDate(addDays(startOfToday(), preset.days))}
              className={chipClass(activePreset?.days === preset.days)}
            >
              {activePreset?.days === preset.days ? <Check className="size-3.5" aria-hidden /> : null}
              {preset.label}
            </button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger className={chipClass(Boolean(selectedDate) && !activePreset)}>
              <CalendarIcon className="size-3.5" aria-hidden />
              {selectedDate && !activePreset ? format(selectedDate, "MMM d") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-auto rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    pickDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => isBefore(date, startOfToday())}
                defaultMonth={selectedDate ?? startOfToday()}
              />
            </PopoverContent>
          </Popover>
        </div>
        {selectedDate ? (
          <p className="flex items-center gap-2 text-sm text-(--text-body)">
            <span className="font-semibold text-(--text-heading)">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
            {relative ? <span className="text-(--text-muted)">({relative})</span> : null}
            <button
              type="button"
              aria-label="Clear date"
              onClick={() => setTargetDate("")}
              className="flex size-7 items-center justify-center rounded-full text-(--text-muted) hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="follow-up-reason" className="text-sm font-semibold text-(--text-heading)">
            Reason
          </label>
          <span className="text-xs text-(--text-muted) tabular-nums">
            {reason.length}/{FOLLOW_UP_REASON_MAX}
          </span>
        </div>
        <Textarea
          id="follow-up-reason"
          value={reason}
          disabled={!loaded || saving}
          maxLength={FOLLOW_UP_REASON_MAX}
          rows={2}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Re-check cough and temperature; return sooner if breathing gets worse."
          className="min-h-20 resize-none rounded-xl text-base sm:text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {REASON_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={!loaded || saving}
              onClick={() => addReason(suggestion)}
              className="rounded-full border border-(--border-subtle) bg-(--surface-card) px-2.5 py-1 text-xs font-medium text-(--text-body) transition-colors hover:border-(--action-primary)/50 hover:bg-(--surface-warm-soft) disabled:opacity-50"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned under the thumb on a phone; steps aside while the keyboard is up. */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--border-subtle) bg-(--surface-card) pt-3 max-lg:sticky max-lg:bottom-0 max-lg:z-20 max-lg:-mx-4 max-lg:px-4 sm:max-lg:-mx-5 sm:max-lg:px-5 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-sm:[&>*]:flex-1 max-lg:group-has-[textarea:focus]/ws:hidden max-lg:group-has-[input:focus]/ws:hidden">
        {(targetDate || reason) && !saving ? (
          <Button type="button" variant="ghost" shape="pill" className="max-lg:h-11" onClick={clear}>
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          shape="pill"
          className="max-lg:h-11"
          disabled={!canSave || !isDirty}
          onClick={() => void save()}
        >
          {saving ? <Spinner className="size-4" /> : null}
          {savedAt ? "Update follow-up" : "Save follow-up"}
        </Button>
      </div>
    </div>
  );
}
