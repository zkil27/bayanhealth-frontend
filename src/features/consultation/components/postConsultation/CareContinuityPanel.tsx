"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOW_UP_REASON_MAX,
  fetchFollowUpRecommendation,
  saveFollowUpRecommendation,
} from "@/features/doctor/lib/api/careContinuity";

/**
 * Post-consult care continuity for the assigned physician. Lab and diagnostic
 * ordering is intentionally not exposed here until that workflow is ready.
 */
export function CareContinuityPanel({
  consultationId,
  token,
}: {
  consultationId: string;
  token: string;
}) {
  return (
    <section
      data-slot="care-continuity-panel"
      aria-labelledby="care-continuity-heading"
      className="rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4 shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
    >
      <h2
        id="care-continuity-heading"
        className="text-[15px] font-bold text-(--text-heading)"
      >
        Care continuity
      </h2>
      <p className="text-xs text-(--text-muted)">
        Shown to the patient on their home screen.
      </p>

      <div className="mt-3 max-w-2xl">
        <FollowUpSection consultationId={consultationId} token={token} />
      </div>
    </section>
  );
}

function FollowUpSection({
  consultationId,
  token,
}: {
  consultationId: string;
  token: string;
}) {
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFollowUpRecommendation(consultationId, token)
      .then((rec) => {
        if (cancelled || !rec) return;
        setTargetDate(rec.targetDate);
        setReason(rec.reason);
        setSavedAt(rec.updatedAt);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consultationId, token]);

  const today = new Date().toISOString().slice(0, 10);
  const canSave =
    !saving && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) && targetDate >= today && reason.trim().length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const rec = await saveFollowUpRecommendation(consultationId, token, {
        targetDate,
        reason: reason.trim(),
      });
      setSavedAt(rec.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-(--text-heading)">
        <CalendarClock className="size-4 text-(--text-muted)" />
        Follow-up recommendation
      </p>

      <label className="text-xs font-semibold text-(--text-muted)">
        See patient by
        <input
          type="date"
          value={targetDate}
          min={today}
          disabled={!loaded}
          onChange={(e) => setTargetDate(e.target.value)}
          className="mt-1 block w-full rounded-[10px] border border-(--border-default) bg-(--surface-card) px-2.5 py-1.5 text-sm text-(--text-body)"
        />
      </label>

      <Textarea
        value={reason}
        disabled={!loaded}
        maxLength={FOLLOW_UP_REASON_MAX}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason, e.g. recheck blood pressure"
        className="min-h-16 text-sm"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={!canSave}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
          {savedAt ? "Update" : "Save"}
        </Button>
        {savedAt && !saving ? (
          <span className="flex items-center gap-1 text-xs text-(--status-available-fg)">
            <Check className="size-3.5" />
            Saved
          </span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-(--danger-fg)">{error}</p> : null}
    </div>
  );
}
