"use client";

import type { ComponentType } from "react";
import {
  Gauge,
  HeartPulse,
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
 * The read-only Subjective / Objective strip from the post-consult design (W1).
 *
 * Both cards are context the physician reads while writing the Assessment — they
 * never write back here, so nothing in this file is editable. The Objective card
 * shows only the vitals the patient actually recorded at intake: an unrecorded
 * reading renders as "—", never a defaulted or invented number, matching the
 * no-fabrication rule the patient-details panel already keeps.
 *
 * Allergies used to render here as a warning pill inside vitals — clinically the
 * wrong place, since an allergy is not a vital sign and a physician scanning
 * Objective for the day's readings could miss it entirely. It now lives as a
 * persistent tag in the workspace header (`WorkspaceHeader`), visible regardless
 * of which SOAP card or patient-rail tab is in view.
 */
export function SoapSummaryCards({
  intake,
}: {
  intake: BookingIntakeForm | null | undefined;
}) {
  const details = intake?.sections.details;
  const purpose = intake?.sections.purpose;
  const hasVitals = details?.vitals && hasAnyVital(details.vitals);

  return (
    <div
      data-slot="soap-summary-cards"
      className="flex flex-col gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) px-3.5 py-3 shadow-2xs divide-y divide-(--border-subtle) lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:divide-y-0 lg:divide-x lg:divide-(--border-subtle)"
    >
      {/* S: Subjective */}
      <div className="flex min-w-0 flex-1 lg:flex-[1.25] items-start gap-2.5 pb-2.5 lg:pb-0">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-brand-soft) text-xs font-bold text-(--navy-700) dark:text-(--navy-300) select-none"
        >
          S
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted) shrink-0">
                Subjective:
              </span>
              {intake === undefined ? (
                <span className="text-xs text-(--text-muted)">Loading intake…</span>
              ) : !purpose?.chiefComplaint?.trim() ? (
                <span className="text-xs text-(--text-muted) italic">No chief complaint submitted</span>
              ) : (
                <p
                  className="text-sm font-semibold text-(--text-heading) leading-snug line-clamp-2"
                  title={purpose.chiefComplaint}
                >
                  {purpose.chiefComplaint}
                </p>
              )}
            </div>
            {purpose?.patientVerbatim?.trim() ? (
              <p
                className="text-xs text-(--text-muted) italic leading-normal pl-0.5 line-clamp-1"
                title={`Patient verbatim: "${purpose.patientVerbatim}"`}
              >
                &ldquo;{purpose.patientVerbatim}&rdquo;
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* O: Objective */}
      <div className="flex min-w-0 flex-1 items-start gap-2.5 pt-2.5 lg:pt-0 lg:pl-3.5">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-brand-soft) text-xs font-bold text-(--navy-700) dark:text-(--navy-300) select-none"
        >
          O
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
              Objective Vitals
            </span>
          </div>
          {intake === undefined ? (
            <p className="text-xs text-(--text-muted)">Loading vitals…</p>
          ) : hasVitals ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {VITALS.map((vital) => {
                const vitalsData = details!.vitals as IntakeVitals;
                const sanityFlag = vital.sanityCheck(vitalsData);
                const clinicalTriage = vital.clinicalTriage(vitalsData);
                return (
                  <VitalTile
                    key={vital.key}
                    icon={vital.icon}
                    label={vital.label}
                    value={vital.format(vitalsData)}
                    sanityFlag={sanityFlag}
                    clinicalTriage={clinicalTriage}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-(--text-muted)">No vitals recorded for this consultation</p>
          )}
        </div>
      </div>
    </div>
  );
}

type VitalSeverity = "normal" | "warning" | "critical" | "unverified";

interface ClinicalTriageResult {
  severity: VitalSeverity;
  label?: string;
}

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
  const isUnverified = Boolean(sanityFlag);
  const severity: VitalSeverity = isUnverified
    ? "unverified"
    : clinicalTriage?.severity ?? "normal";
  const flagText = isUnverified ? sanityFlag : clinicalTriage?.label;

  const styleConfig: Record<
    VitalSeverity,
    {
      container: string;
      icon: string;
      label: string;
      value: string;
      badge: string;
    }
  > = {
    normal: {
      container: "border-(--border-subtle) bg-(--surface-warm-soft)/60 text-(--text-heading)",
      icon: "text-(--teal-700)",
      label: "text-(--text-muted)",
      value: "text-(--text-heading)",
      badge: "",
    },
    warning: {
      container:
        "border-amber-300/90 bg-amber-50/90 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 ring-1 ring-amber-300/50 shadow-2xs",
      icon: "text-amber-700 dark:text-amber-400",
      label: "text-amber-800 dark:text-amber-300",
      value: "font-extrabold text-amber-950 dark:text-amber-100",
      badge: "text-amber-800 dark:text-amber-300",
    },
    critical: {
      container:
        "border-(--danger-border)/50 bg-(--danger-bg) text-(--danger-fg) ring-1 ring-(--danger-border)/40 shadow-2xs",
      icon: "text-(--danger-fg)",
      label: "text-(--danger-fg)/90",
      value: "font-extrabold text-(--danger-fg)",
      badge: "text-(--danger-fg)",
    },
    unverified: {
      container:
        "border-dashed border-amber-400 bg-amber-50/60 text-amber-900 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200 shadow-2xs",
      icon: "text-amber-700 dark:text-amber-400",
      label: "text-amber-800 dark:text-amber-300",
      value: "font-semibold text-amber-950 dark:text-amber-100",
      badge: "text-amber-800 dark:text-amber-300",
    },
  };

  const style = styleConfig[severity];

  return (
    <div
      data-slot="vital-tile"
      data-vital={label}
      data-severity={severity}
      role={severity !== "normal" ? "status" : undefined}
      aria-label={`${label}: ${value}${flagText ? ` (${flagText})` : ""}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors",
        style.container,
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", style.icon)} />
      <span className={cn("text-[10px] font-bold uppercase tracking-wider", style.label)}>
        {label}:
      </span>
      <span className={cn("text-xs sm:text-[13px] font-bold tabular-nums", style.value)}>
        {value}
      </span>
      {flagText ? (
        <span className={cn("flex items-center gap-0.5 text-[10px] font-bold tracking-tight", style.badge)}>
          <TriangleAlert className="size-3 shrink-0" />
          ({flagText})
        </span>
      ) : null}
    </div>
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

function hasAnyVital(vitals: IntakeVitals): boolean {
  return Object.values(vitals).some((value) => typeof value === "number");
}
