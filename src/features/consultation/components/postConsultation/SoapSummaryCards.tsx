"use client";

import { memo, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  Clock,
  Gauge,
  HeartPulse,
  MapPin,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  BookingIntakeForm,
  IntakeVitals,
} from "@/features/doctor/lib/api/bookingIntake";

/**
 * The patient's own intake, read-only, as it appears inside the Subjective and
 * Objective sections of the workspace.
 *
 * This used to be a separate two-column strip above a separate "Your notes"
 * card, so S and O each appeared twice on the page under the same letter. Now
 * each SOAP section carries the patient's record at the top (`SubjectiveIntake`,
 * `ObjectiveIntake`) and the physician's own words beneath it.
 *
 * No fabrication: an unrecorded reading renders as "—", never a defaulted
 * number. Allergies are not shown here; an allergy is not a vital sign and
 * lives in the persistent patient banner (`PatientSafetyStrip`).
 */
type HighlightTone = "normal" | "attention" | "danger";

interface ClinicalHighlight {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  tone: HighlightTone;
}

function getClinicalHighlights(
  intake: BookingIntakeForm | null | undefined,
): ClinicalHighlight[] {
  if (!intake) return [];
  const details = intake.sections?.details;
  const purpose = intake.sections?.purpose;
  const symptomReview = details?.symptomReview;
  const safetyScreen = details?.safetyScreen;
  const highlights: ClinicalHighlight[] = [];

  if (safetyScreen?.chestPain === true) {
    highlights.push({ icon: TriangleAlert, label: "Chest pain reported", tone: "danger" });
  }
  if (safetyScreen?.dyspnea === true) {
    highlights.push({ icon: Wind, label: "Dyspnea reported", tone: "attention" });
  }
  if (safetyScreen?.feverDays && safetyScreen.feverDays > 0) {
    highlights.push({ icon: Thermometer, label: `Fever ${safetyScreen.feverDays}d`, tone: "attention" });
  }
  if (symptomReview?.onset?.trim()) {
    highlights.push({ icon: Clock, label: `Onset ${symptomReview.onset.trim()}`, tone: "normal" });
  }
  if (symptomReview?.characteristics?.trim()) {
    highlights.push({ icon: Activity, label: symptomReview.characteristics.trim(), tone: "normal" });
  }
  if (symptomReview?.location?.trim()) {
    highlights.push({ icon: MapPin, label: symptomReview.location.trim(), tone: "normal" });
  }
  for (const tag of purpose?.complaintTags?.slice(0, 3) ?? []) {
    highlights.push({ label: tag.replace(/_/g, " "), tone: "normal" });
  }

  return highlights;
}

const HIGHLIGHT_TONE: Record<HighlightTone, string> = {
  normal: "border-(--border-subtle) bg-(--surface-card) text-(--text-body)",
  attention: "border-(--attention-border)/40 bg-(--attention-bg) text-(--attention-fg)",
  danger: "border-(--danger-border)/50 bg-(--danger-bg) text-(--danger-fg)",
};

function IntakeEmpty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-(--text-muted)">{children}</p>;
}

/** What the patient reported: chief complaint, flagged symptoms, their own words. */
export const SubjectiveIntake = memo(function SubjectiveIntake({ intake }: { intake: BookingIntakeForm | null | undefined }) {
  const purpose = intake?.sections.purpose;
  const highlights = getClinicalHighlights(intake);

  if (intake === undefined) return <IntakeEmpty>Loading intake…</IntakeEmpty>;
  if (!purpose?.chiefComplaint?.trim() && highlights.length === 0) {
    return <IntakeEmpty>The patient did not submit a chief complaint.</IntakeEmpty>;
  }

  return (
    <div data-slot="subjective-intake" className="flex flex-col gap-2">
      {purpose?.chiefComplaint?.trim() ? (
        <p className="text-[15px] leading-snug font-semibold text-(--text-heading)">
          {purpose.chiefComplaint}
        </p>
      ) : null}
      {highlights.length > 0 ? (
        <ul aria-label="Reported symptoms" className="flex flex-wrap gap-1.5">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={`${item.label}-${index}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                  HIGHLIGHT_TONE[item.tone],
                )}
              >
                {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                {item.label}
              </li>
            );
          })}
        </ul>
      ) : null}
      {purpose?.patientVerbatim?.trim() ? (
        <p className="text-sm text-(--text-muted) italic">&ldquo;{purpose.patientVerbatim}&rdquo;</p>
      ) : null}
    </div>
  );
});

/** The vitals the patient recorded at intake, each flagged in words when abnormal. */
export const ObjectiveIntake = memo(function ObjectiveIntake({ intake }: { intake: BookingIntakeForm | null | undefined }) {
  const vitals = intake?.sections.details?.vitals;

  if (intake === undefined) return <IntakeEmpty>Loading vitals…</IntakeEmpty>;
  if (!vitals || !hasAnyVital(vitals)) {
    return <IntakeEmpty>No vitals were recorded for this consultation.</IntakeEmpty>;
  }

  return (
    <ul
      data-slot="objective-intake"
      aria-label="Patient-recorded vitals"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {VITALS.map((vital) => (
        <VitalTile
          key={vital.key}
          icon={vital.icon}
          label={vital.label}
          value={vital.format(vitals)}
          sanityFlag={vital.sanityCheck(vitals)}
          clinicalTriage={vital.clinicalTriage(vitals)}
        />
      ))}
    </ul>
  );
});

/** One line for a folded Subjective section. */
export function subjectiveIntakeSummary(intake: BookingIntakeForm | null | undefined): string | undefined {
  return intake?.sections.purpose?.chiefComplaint?.trim() || undefined;
}

type VitalSeverity = "normal" | "warning" | "critical" | "unverified";

interface ClinicalTriageResult {
  severity: VitalSeverity;
  label?: string;
}

const VITAL_TONE: Record<VitalSeverity, string> = {
  normal: "border-(--border-subtle) bg-(--surface-card)",
  warning: "border-(--attention-border)/50 bg-(--attention-bg)",
  unverified: "border-dashed border-(--attention-border)/60 bg-(--surface-card)",
  critical: "border-(--danger-border)/60 bg-(--danger-bg)",
};

const VITAL_FLAG_TEXT: Record<VitalSeverity, string> = {
  normal: "text-(--text-muted)",
  warning: "text-(--attention-fg)",
  unverified: "text-(--attention-fg)",
  critical: "text-(--danger-fg)",
};

function VitalTile({
  icon: Icon,
  label,
  value,
  sanityFlag,
  clinicalTriage,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  /** Whether this reading fell outside its plausible physiological range. */
  sanityFlag?: string;
  /** Clinical status derived from standard diagnostic thresholds. */
  clinicalTriage?: ClinicalTriageResult;
}) {
  const severity: VitalSeverity = sanityFlag ? "unverified" : clinicalTriage?.severity ?? "normal";
  const flagText = sanityFlag ?? clinicalTriage?.label;

  return (
    <li
      data-slot="vital-tile"
      data-vital={label}
      data-severity={severity}
      aria-label={`${label}: ${value}${flagText ? ` (${flagText})` : ""}`}
      className={cn("flex min-w-0 flex-col gap-0.5 rounded-xl border px-3 py-2", VITAL_TONE[severity])}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-(--text-muted)">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            severity === "critical" ? "text-(--danger-fg)" : "text-(--text-heading)",
          )}
        >
          {value}
        </span>
        {flagText ? (
          <span className={cn("flex items-center gap-0.5 text-xs font-semibold", VITAL_FLAG_TEXT[severity])}>
            <TriangleAlert className="size-3 shrink-0" aria-hidden />
            {flagText}
          </span>
        ) : null}
      </span>
    </li>
  );
}

const NOT_RECORDED = "—";

/**
 * Plausible physiological bounds for a patient-reported home reading. A value
 * outside these is flagged as unverified rather than trusted at face value.
 */
const VITAL_BOUNDS = {
  temperatureC: { min: 35, max: 41 },
  systolicBp: { min: 70, max: 220 },
  diastolicBp: { min: 40, max: 130 },
  heartRateBpm: { min: 40, max: 180 },
  spo2Percent: { min: 70, max: 100 },
} as const;

function outOfRange(value: number, bounds: { min: number; max: number }): boolean {
  return value < bounds.min || value > bounds.max;
}

/** The four vitals from the design, each with its icon, format, sanity check, and clinical triage. */
const VITALS: ReadonlyArray<{
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  format: (v: IntakeVitals) => string;
  /** Returns the flag reason when this reading fails its biological sanity check, else undefined. */
  sanityCheck: (v: IntakeVitals) => string | undefined;
  /** Evaluates clinical normality/abnormality for rapid triage scanning. */
  clinicalTriage: (v: IntakeVitals) => ClinicalTriageResult | undefined;
}> = [
  {
    key: "temperature",
    label: "Temp",
    icon: Thermometer,
    format: (v) =>
      typeof v.temperatureC === "number" ? `${v.temperatureC}°C` : NOT_RECORDED,
    sanityCheck: (v) =>
      typeof v.temperatureC === "number" && outOfRange(v.temperatureC, VITAL_BOUNDS.temperatureC)
        ? "Unverified"
        : undefined,
    clinicalTriage: (v) => {
      if (typeof v.temperatureC !== "number") return undefined;
      if (v.temperatureC >= 38.0) {
        return { severity: "warning", label: "Fever" };
      }
      if (v.temperatureC >= 37.5) {
        return { severity: "warning", label: "Elevated" };
      }
      return { severity: "normal" };
    },
  },
  {
    key: "bloodPressure",
    label: "BP",
    icon: Gauge,
    format: (v) =>
      typeof v.systolicBp === "number" && typeof v.diastolicBp === "number"
        ? `${v.systolicBp}/${v.diastolicBp}`
        : NOT_RECORDED,
    sanityCheck: (v) => {
      const hasSys = typeof v.systolicBp === "number";
      const hasDia = typeof v.diastolicBp === "number";
      if (hasSys && outOfRange(v.systolicBp!, VITAL_BOUNDS.systolicBp)) return "Unverified";
      if (hasDia && outOfRange(v.diastolicBp!, VITAL_BOUNDS.diastolicBp)) return "Unverified";
      // Pulse pressure inversion: systolic must be greater than diastolic
      if (hasSys && hasDia && v.systolicBp! <= v.diastolicBp!) return "Unverified";
      return undefined;
    },
    clinicalTriage: (v) => {
      const { systolicBp, diastolicBp } = v;
      if (typeof systolicBp !== "number" || typeof diastolicBp !== "number") return undefined;
      if (systolicBp >= 140 || diastolicBp >= 90) {
        return { severity: "warning", label: "High" };
      }
      if (systolicBp < 90) {
        return { severity: "warning", label: "Low" };
      }
      return { severity: "normal" };
    },
  },
  {
    key: "heartRate",
    label: "HR",
    icon: HeartPulse,
    format: (v) =>
      typeof v.heartRateBpm === "number" ? `${v.heartRateBpm} bpm` : NOT_RECORDED,
    sanityCheck: (v) =>
      typeof v.heartRateBpm === "number" && outOfRange(v.heartRateBpm, VITAL_BOUNDS.heartRateBpm)
        ? "Unverified"
        : undefined,
    clinicalTriage: (v) => {
      if (typeof v.heartRateBpm !== "number") return undefined;
      if (v.heartRateBpm > 100) {
        return { severity: "warning", label: "High" };
      }
      if (v.heartRateBpm < 60) {
        return { severity: "warning", label: "Low" };
      }
      return { severity: "normal" };
    },
  },
  {
    key: "spo2",
    label: "SpO₂",
    icon: Wind,
    format: (v) =>
      typeof v.spo2Percent === "number" ? `${v.spo2Percent}%` : NOT_RECORDED,
    sanityCheck: (v) =>
      typeof v.spo2Percent === "number" && outOfRange(v.spo2Percent, VITAL_BOUNDS.spo2Percent)
        ? "Unverified"
        : undefined,
    clinicalTriage: (v) => {
      if (typeof v.spo2Percent !== "number") return undefined;
      if (v.spo2Percent < 92) {
        return { severity: "critical", label: "Critical" };
      }
      if (v.spo2Percent < 95) {
        return { severity: "critical", label: "Low" };
      }
      return { severity: "normal" };
    },
  },
];

/**
 * The recorded vitals as one line, e.g. "Temp 38.2°C, BP 120/80", for
 * pre-filling the doctor's Objective and for the folded Objective summary.
 * Unrecorded readings are left out rather than written as "—"; null when
 * nothing was recorded.
 */
export function formatIntakeVitalsLine(vitals: IntakeVitals | undefined): string | null {
  if (!vitals) return null;
  const parts = VITALS.map((vital) => ({ label: vital.label, value: vital.format(vitals) }))
    .filter(({ value }) => value !== NOT_RECORDED)
    .map(({ label, value }) => `${label} ${value}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function hasAnyVital(vitals: IntakeVitals): boolean {
  return Object.values(vitals).some((value) => typeof value === "number");
}

/* ── Folded-section summaries ─────────────────────────────────────────────── */

const SUMMARY_TONE: Record<HighlightTone, string> = {
  normal: "bg-(--surface-warm-soft) text-(--text-body)",
  attention: "bg-(--attention-bg) text-(--attention-fg)",
  danger: "bg-(--danger-bg) text-(--danger-fg)",
};

function severityTone(severity: VitalSeverity): HighlightTone {
  if (severity === "critical") return "danger";
  if (severity === "warning" || severity === "unverified") return "attention";
  return "normal";
}

/**
 * A folded Objective, as one chip per recorded vital: a muted label, a bold
 * value, and the abnormal ones tinted and marked. Was one muted sentence
 * ("Temp 38.2°C, BP 118/76, …") where a fever looked like every other number.
 */
export const ObjectiveSummary = memo(function ObjectiveSummary({
  intake,
  fallback,
}: {
  intake: BookingIntakeForm | null | undefined;
  /** The doctor's own Objective line, when no vitals were recorded. */
  fallback?: string;
}) {
  const vitals = intake?.sections.details?.vitals;
  const items = vitals
    ? VITALS.map((vital) => {
        const value = vital.format(vitals);
        const severity: VitalSeverity = vital.sanityCheck(vitals)
          ? "unverified"
          : vital.clinicalTriage(vitals)?.severity ?? "normal";
        return { key: vital.key, label: vital.label, value, tone: severityTone(severity) };
      }).filter((item) => item.value !== NOT_RECORDED)
    : [];

  if (items.length === 0) {
    return <span className="min-w-0 truncate">{fallback ?? "No vitals recorded"}</span>;
  }
  return (
    <>
      {items.map((item) => (
        <span
          key={item.key}
          data-slot="summary-vital"
          className={cn(
            "inline-flex shrink-0 items-baseline gap-1 rounded-md px-1.5 py-0.5",
            SUMMARY_TONE[item.tone],
          )}
        >
          <span className={cn("text-xs", item.tone === "normal" && "text-(--text-muted)")}>{item.label}</span>
          <span className={cn("font-semibold tabular-nums", item.tone === "normal" && "text-(--text-heading)")}>
            {item.value}
          </span>
          {item.tone !== "normal" ? <TriangleAlert className="size-3 shrink-0 self-center" aria-label="flagged" /> : null}
        </span>
      ))}
    </>
  );
});

/**
 * A folded Subjective: flagged symptoms first, as chips, so a red flag is
 * never the part cut off by truncation; then the complaint in body color.
 */
export const SubjectiveSummary = memo(function SubjectiveSummary({
  intake,
  text,
}: {
  intake: BookingIntakeForm | null | undefined;
  /** The doctor's first line, else the patient's chief complaint. */
  text?: string;
}) {
  const flagged = getClinicalHighlights(intake).filter((item) => item.tone !== "normal");
  return (
    <>
      {flagged.map((item, index) => {
        const Icon = item.icon;
        return (
          <span
            key={`${item.label}-${index}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              SUMMARY_TONE[item.tone],
            )}
          >
            {Icon ? <Icon className="size-3 shrink-0" /> : null}
            {item.label}
          </span>
        );
      })}
      {text ? <span className="min-w-0 truncate font-medium text-(--text-body)">{text}</span> : null}
    </>
  );
});
