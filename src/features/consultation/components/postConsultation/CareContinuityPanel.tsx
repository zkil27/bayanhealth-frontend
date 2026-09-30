"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CalendarClock,
  Calendar as CalendarIcon,
  CheckCheck,
  Clock,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfToday,
} from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  FOLLOW_UP_REASON_MAX,
  fetchFollowUpRecommendation,
  saveFollowUpRecommendation,
} from "@/features/doctor/lib/api/careContinuity";
import { cn } from "@/lib/utils";

interface CareContinuityPanelProps {
  consultationId: string;
  token: string;
  doctorName?: string;
  className?: string;
}

const PRESET_INTERVALS = [
  { label: "+3 Days", days: 3 },
  { label: "+1 Week", days: 7 },
  { label: "+2 Weeks", days: 14 },
  { label: "+1 Month", days: 30 },
  { label: "+3 Months", days: 90 },
];

const REASON_SUGGESTIONS = [
  "General follow-up",
  "Symptom re-check",
  "Review lab results",
  "Vital signs check",
  "Medication review",
  "Clinical clearance",
];

export function CareContinuityPanel({
  consultationId,
  token,
  doctorName,
  className,
}: CareContinuityPanelProps) {
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ date: string; reason: string }>({
    date: "",
    reason: "",
  });

  useEffect(() => {
    let cancelled = false;
    void fetchFollowUpRecommendation(consultationId, token)
      .then((rec) => {
        if (cancelled || !rec) return;
        setTargetDate(rec.targetDate);
        setReason(rec.reason);
        setSavedAt(rec.updatedAt);
        setInitialData({ date: rec.targetDate, reason: rec.reason });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultationId, token]);

  const todayStr = useMemo(() => format(startOfToday(), "yyyy-MM-dd"), []);

  const selectedDate = useMemo(() => {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return undefined;
    try {
      const parsed = parseISO(targetDate);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }, [targetDate]);

  const relativeDaysLabel = useMemo(() => {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
    try {
      const target = parseISO(targetDate);
      const today = startOfToday();
      const diff = differenceInCalendarDays(target, today);
      if (diff === 0) return "Today";
      if (diff === 1) return "Tomorrow";
      if (diff < 0) return `${Math.abs(diff)}d ago`;
      if (diff === 7) return "In 1 week";
      if (diff === 14) return "In 2 weeks";
      if (diff === 21) return "In 3 weeks";
      if (diff === 30 || diff === 31) return "In 1 month";
      if (diff >= 88 && diff <= 92) return "In 3 months";
      return `In ${diff} days`;
    } catch {
      return null;
    }
  }, [targetDate]);

  const activePreset = useMemo(() => {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
    try {
      const target = parseISO(targetDate);
      const today = startOfToday();
      const diff = differenceInCalendarDays(target, today);
      return PRESET_INTERVALS.find((p) => p.days === diff)?.label ?? null;
    } catch {
      return null;
    }
  }, [targetDate]);

  const isDirty =
    targetDate !== initialData.date || reason.trim() !== initialData.reason.trim();

  const canSave =
    !saving &&
    /^\d{4}-\d{2}-\d{2}$/.test(targetDate) &&
    targetDate >= todayStr &&
    reason.trim().length > 0;

  const handlePresetSelect = useCallback(
    (days: number) => {
      const nextDate = addDays(startOfToday(), days);
      setTargetDate(format(nextDate, "yyyy-MM-dd"));
      if (!reason.trim()) {
        setReason("General follow-up");
      }
      setError(null);
    },
    [reason],
  );

  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setTargetDate(format(date, "yyyy-MM-dd"));
      if (!reason.trim()) {
        setReason("General follow-up");
      }
      setError(null);
    }
  }, [reason]);

  const handleReasonSuggestion = useCallback((suggestion: string) => {
    setReason((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "General follow-up") return suggestion;
      if (trimmed.includes(suggestion)) return trimmed;
      const combined = `${trimmed}; ${suggestion}`;
      return combined.slice(0, FOLLOW_UP_REASON_MAX);
    });
  }, []);

  const handleClear = useCallback(() => {
    setTargetDate("");
    setReason("");
    setError(null);
  }, []);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const rec = await saveFollowUpRecommendation(consultationId, token, {
        targetDate,
        reason: reason.trim(),
      });
      setSavedAt(rec.updatedAt);
      setInitialData({ date: rec.targetDate, reason: rec.reason });
      toast.success("Care continuity recommendation saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save follow-up recommendation.");
    } finally {
      setSaving(false);
    }
  };

  const isDateDisabled = useCallback((date: Date) => {
    return isBefore(date, startOfToday());
  }, []);

  return (
    <section
      data-slot="care-continuity-panel"
      aria-labelledby="care-continuity-heading"
      className={cn(
        "rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-2xs overflow-hidden",
        className,
      )}
    >
      {/* Authoritative Card Header: Strictly "Care Continuity" */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-subtle) bg-(--surface-card) px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-(--teal-50) text-(--teal-700) dark:bg-teal-950/60 dark:text-teal-300 border border-(--teal-500)/25 shadow-2xs">
            <CalendarClock className="size-4.5" />
          </div>
          <div>
            <h2
              id="care-continuity-heading"
              className="text-sm sm:text-base font-bold text-(--navy-800) dark:text-slate-100 tracking-tight"
            >
              Care Continuity
            </h2>
            <p className="text-[11px] sm:text-xs text-(--text-muted)">
              Follow-up window &amp; directives for patient re-evaluation
            </p>
          </div>
        </div>

        {/* Dynamic Status Capsule */}
        <div className="flex items-center gap-2">
          {savedAt && !isDirty && !saving ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300">
              <CheckCheck className="size-3.5 text-teal-600 dark:text-teal-400" />
              Scheduled · {format(parseISO(targetDate), "MMM d, yyyy")} ({relativeDaysLabel})
            </span>
          ) : isDirty && targetDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
              Unsaved follow-up plan
            </span>
          ) : (
            <span className="text-[11px] text-(--text-muted) italic px-2 py-0.5 rounded-md bg-(--surface-warm-soft)/60 border border-(--border-subtle)">
              Optional · No follow-up scheduled
            </span>
          )}
        </div>
      </div>

      {/* Balanced 2-Column Clinical Layout (Resolves "too flat in length") */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Return Interval & Calendar (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-(--navy-800) dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="size-3.5 text-(--teal-700) dark:text-teal-400" />
              Return Interval
            </span>
            {targetDate && (
              <button
                type="button"
                onClick={() => {
                  setTargetDate("");
                  setError(null);
                }}
                className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Preset Intervals Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_INTERVALS.map((preset) => {
              const isSelected = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!loaded || saving}
                  onClick={() => handlePresetSelect(preset.days)}
                  className={cn(
                    "flex items-center justify-center rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer border select-none text-center",
                    isSelected
                      ? "bg-(--teal-700) text-white border-(--teal-700) shadow-xs dark:bg-teal-600"
                      : "bg-(--surface-card) border-(--border-default) text-(--text-body) hover:bg-(--surface-warm-soft) hover:border-(--teal-600)/40 dark:hover:bg-slate-800",
                  )}
                >
                  {isSelected && <CheckCheck className="size-3 mr-1 shrink-0" />}
                  {preset.label}
                </button>
              );
            })}

            {/* Custom Interactive Calendar Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                id="follow-up-calendar-trigger"
                className={cn(
                  "flex items-center justify-center rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer border select-none text-center gap-1",
                  targetDate && !activePreset
                    ? "bg-(--teal-700) text-white border-(--teal-700) shadow-xs dark:bg-teal-600"
                    : "bg-(--surface-card) border-(--border-default) text-(--text-body) hover:bg-(--surface-warm-soft) hover:border-(--teal-600)/40 dark:hover:bg-slate-800",
                  !loaded && "opacity-50 pointer-events-none",
                )}
              >
                <CalendarIcon className="size-3.5 shrink-0 opacity-80" />
                <span>Custom...</span>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[330px] p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-(--border-subtle) shadow-2xl space-y-3"
              >
                {/* Clean Header: Eliminates Text Collision */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarIcon className="size-3.5 text-(--teal-700) dark:text-teal-400 shrink-0" />
                    <span className="text-xs font-bold text-(--navy-900) dark:text-slate-100 truncate">
                      Select Follow-up Date
                    </span>
                  </div>
                  <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md shrink-0">
                    Today: {format(startOfToday(), "MMM d")}
                  </span>
                </div>

                {/* Quick Shortcut Buttons in Calendar Modal */}
                <div className="flex items-center justify-between gap-1 pb-1">
                  {PRESET_INTERVALS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetSelect(p.days)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border",
                        activePreset === p.label
                          ? "bg-(--teal-700) text-white border-(--teal-700)"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Calendar Date Grid */}
                <div className="flex justify-center border rounded-xl border-slate-100 dark:border-slate-800/80 p-1 bg-slate-50/40 dark:bg-slate-950/30">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleCalendarSelect}
                    disabled={isDateDisabled}
                    defaultMonth={selectedDate || startOfToday()}
                    className="p-1"
                  />
                </div>

                {/* Popover Footer with Confirmation */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {targetDate ? (
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold block truncate">
                        {format(parseISO(targetDate), "EEE, MMM d, yyyy")}
                      </span>
                      {relativeDaysLabel && (
                        <span className="text-[10px] text-slate-500 block">
                          ({relativeDaysLabel})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No date selected</span>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCalendarOpen(false)}
                    className="h-7 text-xs px-3 rounded-lg bg-(--teal-700) text-white hover:bg-(--teal-800) font-semibold cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Target Date Feedback Tile */}
          {targetDate ? (
            <div className="flex items-center justify-between rounded-xl border border-teal-500/25 bg-teal-50/50 dark:bg-teal-950/30 p-2.5 px-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-2xs">
                  <CalendarIcon className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-teal-900/70 dark:text-teal-300/70 flex items-center gap-1.5">
                    <span>Target follow-up date</span>
                    {relativeDaysLabel && (
                      <span className="font-bold text-teal-800 dark:text-teal-300">
                        · {relativeDaysLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-(--navy-900) dark:text-slate-100 truncate">
                    {format(parseISO(targetDate), "EEEE, MMMM d, yyyy")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Clear date"
                title="Clear date"
                onClick={() => {
                  setTargetDate("");
                  setError(null);
                }}
                className="p-1 rounded-md text-teal-700/60 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0 ml-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-(--border-default) bg-(--surface-warm-soft)/30 p-2.5 px-3 text-center">
              <p className="text-[11px] text-(--text-muted)">
                Select an interval above or click <span className="font-semibold text-(--teal-700) dark:text-teal-400">Custom</span> to pick a calendar date.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Directives & Actions (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-(--navy-800) dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="size-3.5 text-(--teal-700) dark:text-teal-400" />
              Clinical Directives &amp; Reason
            </span>
            <span className="text-[11px] text-(--text-muted)">
              {reason.length}/{FOLLOW_UP_REASON_MAX}
            </span>
          </div>

          {/* Comfortable Textarea (No longer stretched 1000px horizontally) */}
          <Textarea
            id="follow-up-reason-textarea"
            value={reason}
            disabled={!loaded || saving}
            maxLength={FOLLOW_UP_REASON_MAX}
            rows={2}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Specify reason for follow-up (e.g. Return for symptom re-evaluation, review repeat lab results, or titrate medication if BP remains elevated)..."
            className="min-h-[72px] text-xs sm:text-sm rounded-xl border-(--border-default) bg-white dark:bg-slate-900 focus:border-(--teal-600) resize-none"
          />

          {/* Quick Directives Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-(--text-muted) mr-0.5">
              Quick directives:
            </span>
            {REASON_SUGGESTIONS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={!loaded || saving}
                onClick={() => handleReasonSuggestion(chip)}
                className="rounded-full border border-(--border-subtle) bg-(--surface-warm-soft)/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-(--teal-600)/50 hover:bg-(--teal-50)/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Actions & Status Feedback */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-(--border-subtle)/50">
            <div className="text-[11px] text-(--text-muted)">
              {targetDate && reason.trim() ? (
                <span className="text-teal-700 dark:text-teal-400 font-medium">
                  Ready to record recommendation
                </span>
              ) : (
                <span>Select a return interval and clinical directives to save</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(targetDate || reason) && !saving ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 rounded-xl text-xs text-(--text-muted) hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                className="h-8 rounded-xl bg-(--teal-700) text-white hover:bg-(--teal-800) shadow-xs font-semibold px-4 gap-1.5 cursor-pointer transition-all text-xs dark:bg-teal-600 dark:hover:bg-teal-700"
                disabled={!canSave}
                onClick={() => void save()}
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>{savedAt ? "Update recommendation" : "Save recommendation"}</span>
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
