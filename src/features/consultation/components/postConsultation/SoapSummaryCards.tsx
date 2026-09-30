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
      className="flex flex-col gap-2.5 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between lg:divide-x lg:divide-(--border-subtle)"
    >
      {/* S: Subjective */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-brand-soft) text-xs font-bold text-(--navy-700) dark:text-(--navy-300)"
        >
          S
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-(--text-heading)">Subjective:</span>
            {intake === undefined ? (
              <span className="text-xs text-(--text-muted)">Loading intake…</span>
            ) : !purpose?.chiefComplaint?.trim() ? (
              <span className="text-xs text-(--text-muted)">No chief complaint submitted</span>
            ) : (
              <p className="truncate text-xs font-semibold text-(--text-heading)" title={purpose.chiefComplaint}>
                {purpose.chiefComplaint}
                {purpose.patientVerbatim?.trim() ? (
                  <span className="ml-1 font-normal text-(--text-muted) italic">
                    &ldquo;{purpose.patientVerbatim}&rdquo;
                  </span>
                ) : null}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* O: Objective */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:pl-3.5">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-brand-soft) text-xs font-bold text-(--navy-700) dark:text-(--navy-300)"
        >
          O
        </span>
        <div className="min-w-0 flex-1">
          {intake === undefined ? (
            <p className="text-xs text-(--text-muted)">Loading vitals…</p>
          ) : hasVitals ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {VITALS.map((vital) => {
                const flag = vital.sanityCheck(details!.vitals as IntakeVitals);
                return (
                  <VitalTile
                    key={vital.key}
                    icon={vital.icon}
                    label={vital.label}
                    value={vital.format(details!.vitals as IntakeVitals)}
                    flagged={Boolean(flag)}
                    flagLabel={flag}
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

function SummaryCard({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-[14px] border border-(--border-subtle) bg-(--surface-card) px-4 py-3",
        "shadow-xs sm:min-w-[18rem]",
      )}
      aria-label={title}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-5.5 items-center justify-center rounded-md bg-(--surface-brand-soft) text-xs font-bold text-(--navy-700) dark:text-(--navy-300)"
        >
          {letter}
        </span>
        <h3 className="text-sm font-bold text-(--text-heading)">{title}</h3>
        <span className="ml-auto rounded-md bg-(--surface-warm-soft) px-2 py-0.5 text-[11px] font-semibold text-(--text-muted)">
          Intake record
        </span>
      </div>
      <div className="pt-2">{children}</div>
    </section>
  );
}

function VitalTile({
  icon: Icon,
  label,
  value,
  flagged,
  flagLabel,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  /** Whether this reading fell outside its plausible physiological range. */
  flagged?: boolean;
  /** The reason shown alongside the value when {@link flagged} is true. */
  flagLabel?: string;
}) {
  return (
    <div
      data-slot="vital-tile"
      data-vital={label}
      data-flagged={flagged ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors shadow-2xs",
        flagged
          ? "border border-(--status-soon-fg)/40 bg-(--status-soon-bg) font-bold text-(--status-soon-fg)"
          : "border border-(--border-subtle) bg-(--surface-warm-soft)/60 text-(--text-heading)",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", flagged ? "text-(--status-soon-fg)" : "text-(--teal-700)")} />
      <span className="font-semibold text-(--text-muted) text-[11px]">{label}:</span>
      <span className="font-bold text-xs">{value}</span>
      {flagged ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-(--status-soon-fg)">
          <TriangleAlert className="size-3" />
          ({flagLabel})
        </span>
      ) : null}
    </div>
  );
}

const NOT_RECORDED = "—";

/**
 * Plausible physiological bounds for a patient-reported home reading. A value
 * outside these is flagged as unverified rather than trusted at face value —
 * the intake device is unsupervised, so an implausible number is far more
 * likely to be a typo or a miscalibrated cuff/thermometer than a genuine
 * emergency the physician would otherwise triage from the chief complaint.
 * These bounds are a sanity check on the reading, not a clinical threshold.
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

/** The four vitals from the design, each with its icon, format, and sanity check. */
const VITALS: ReadonlyArray<{
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  format: (v: IntakeVitals) => string;
  /** Returns the flag reason when this reading fails its sanity check, else undefined. */
  sanityCheck: (v: IntakeVitals) => string | undefined;
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
  },
  {
    key: "bloodPressure",
    label: "BP",
    icon: Gauge,
    format: (v) =>
      typeof v.systolicBp === "number" && typeof v.diastolicBp === "number"
        ? `${v.systolicBp}/${v.diastolicBp}`
        : NOT_RECORDED,
    sanityCheck: (v) =>
      (typeof v.systolicBp === "number" && outOfRange(v.systolicBp, VITAL_BOUNDS.systolicBp)) ||
      (typeof v.diastolicBp === "number" && outOfRange(v.diastolicBp, VITAL_BOUNDS.diastolicBp))
        ? "Unverified"
        : undefined,
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
  },
];

function hasAnyVital(vitals: IntakeVitals): boolean {
  return Object.values(vitals).some((value) => typeof value === "number");
}
