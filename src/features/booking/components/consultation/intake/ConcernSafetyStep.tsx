"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  type FieldPath,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, FieldHint, Reveal, SegmentedToggle } from "./IntakeChoice";
import { SymptomSelect } from "./SymptomSelect";
import { classifyBloodPressure, classifyVital, vitalPatientMessage } from "../../../lib/vitalStatus";

export { redFlagFromScreen, type RedFlagState } from "./intakeGates";

type ComplaintTag = NonNullable<
  Extract<DynamicIntakeFormValues["requestDetails"], { type: "teleconsult" }>["complaintTags"]
>[number];
type Teleconsult = Extract<DynamicIntakeFormValues["requestDetails"], { type: "teleconsult" }>;

/**
 * Symptom chips grouped by clinical category. Every value is an existing
 * `complaintTagSchema` member. `chest_discomfort` and `breathing_concern` are
 * deliberately absent: the red-flag check above asks about them explicitly,
 * and a second, softer chip for the same symptom invites contradictory answers.
 */
const SYMPTOM_GROUPS: readonly { title: string; tags: readonly (readonly [ComplaintTag, string])[] }[] = [
  {
    title: "Respiratory / Cold & flu",
    tags: [["fever", "Fever"], ["cough", "Cough"], ["colds", "Colds / Runny nose"], ["sore_throat", "Sore throat"]],
  },
  {
    title: "Pain & discomfort",
    tags: [["headache", "Headache"], ["musculoskeletal_pain", "Body aches"], ["dizziness", "Dizziness"], ["fatigue", "Fatigue"]],
  },
  {
    title: "Digestive",
    tags: [["nausea_or_vomiting", "Nausea / Vomiting"], ["diarrhea", "Diarrhea"], ["abdominal_pain", "Abdominal pain"]],
  },
  {
    title: "General & consultation goals",
    tags: [
      ["medication_request", "Medication refill"],
      ["skin_concern", "Skin rash"],
      ["urinary_concern", "Urinary symptoms"],
      ["reproductive_health", "Reproductive health"],
      ["mental_health", "Mental health"],
      ["other", "Other"],
    ],
  },
];

const TAG_LABELS = new Map<string, string>(SYMPTOM_GROUPS.flatMap((group) => group.tags));

/** Patient-facing label for a stored complaint tag (falls back for tags no longer offered). */
export function complaintTagLabel(tag: string): string {
  return TAG_LABELS.get(tag) ?? tag.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Current concern (teleconsult). The emergency red-flag question that used to
 * open this page is now the intake's first page (`SafetyCheckStep`), so a
 * patient with severe symptoms is stopped before typing anything else.
 */
export function ConcernSafetyStep() {
  return (
    <div className="space-y-9">
      <MainConcern />
      <HomeVitals />
    </div>
  );
}
function MainConcern() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const tags = (useWatch({ control, name: "requestDetails.complaintTags" as FieldPath<DynamicIntakeFormValues> }) ?? []) as ComplaintTag[];
  const opts = { shouldDirty: true, shouldValidate: true } as const;

  const toggle = (tag: ComplaintTag) => {
    const active = tags.includes(tag);
    setValue("requestDetails.complaintTags" as FieldPath<DynamicIntakeFormValues>, (active ? tags.filter((item) => item !== tag) : [...tags, tag]) as never, opts);
    // Fever duration only means something while Fever is selected.
    if (active && tag === "fever") setValue("requestDetails.safetyScreen.feverDays" as FieldPath<DynamicIntakeFormValues>, undefined as never, opts);
  };

  return (
    <section className="space-y-7">
      <Controller
        name={"requestDetails.chiefComplaint" as FieldPath<DynamicIntakeFormValues>}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <div>
              <BlockLabel htmlFor="chief-complaint" required>
                What is your main concern or reason for consult?
              </BlockLabel>
              <FieldHint id="chief-complaint-hint">
                Describe your main symptom, how many days you&apos;ve felt this way, and anything you&apos;ve already taken.
              </FieldHint>
            </div>
            <textarea
              id="chief-complaint"
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              aria-describedby="chief-complaint-hint"
              aria-invalid={fieldState.invalid || undefined}
              className="min-h-[120px] w-full rounded-xl border border-(--border-default) bg-(--surface-raised) p-3.5 text-base leading-relaxed text-(--text-body) outline-none placeholder:text-(--text-subtle) focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent) aria-invalid:border-(--danger-border)"
            />
            {fieldState.error ? <p role="alert" className="text-[15px] font-medium text-(--danger-fg)">{fieldState.error.message}</p> : null}
          </div>
        )}
      />

      {/*
       * A grouped, searchable dropdown instead of a 19-tile grid (pilot
       * feedback). Picks stay visible as removable chips under the trigger.
       */}
      <div className="space-y-3">
        <div>
          <BlockLabel id="related-symptoms-heading" optional>Related symptoms</BlockLabel>
          <FieldHint>Choose any that apply.</FieldHint>
        </div>
        <SymptomSelect labelId="related-symptoms-heading" groups={SYMPTOM_GROUPS} value={tags} onToggle={toggle} />
      </div>

      <Reveal open={tags.includes("fever")} className="-mt-5">
        <Controller
          name={"requestDetails.safetyScreen.feverDays" as FieldPath<DynamicIntakeFormValues>}
          control={control}
          render={({ field, fieldState }) => (
            <div className="max-w-xs space-y-1.5 pt-2">
              <BlockLabel htmlFor="fever-days">How many days have you had a fever?</BlockLabel>
              <input
                id="fever-days"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                placeholder="e.g. 2"
                aria-invalid={fieldState.invalid || undefined}
                className={cn(COMPACT_INPUT, "w-32 text-lg font-semibold tabular-nums")}
                value={field.value == null ? "" : String(field.value)}
                // Empty stays "not answered", never 0.
                onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
              />
              {fieldState.error ? <p role="alert" className="text-[15px] font-medium text-(--danger-fg)">{fieldState.error.message}</p> : null}
            </div>
          )}
        />
      </Reveal>
    </section>
  );
}

const VITALS = "requestDetails.vitals";

function HomeVitals() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const vitals = useWatch({ control, name: VITALS as FieldPath<DynamicIntakeFormValues> }) as Teleconsult["vitals"];
  const [show, setShow] = useState(() => Object.values(vitals ?? {}).some((value) => value !== undefined));

  const change = (next: "off" | "on") => {
    setShow(next === "on");
    // "No vitals taken" must not leave half-typed readings behind.
    if (next === "off") setValue(VITALS as FieldPath<DynamicIntakeFormValues>, undefined as never, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section aria-labelledby="home-vitals-heading" className="space-y-3 border-t border-(--border-subtle) pt-7">
      <div>
        <BlockLabel id="home-vitals-heading" optional>Home vitals</BlockLabel>
        <FieldHint>Only if you measured them today.</FieldHint>
      </div>
      <SegmentedToggle
        label="Home vitals"
        value={show ? "on" : "off"}
        onChange={change}
        options={[
          { value: "off", label: "No vitals taken" },
          { value: "on", label: "+ Log vitals" },
        ]}
      />

      <Reveal open={show}>
        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <BloodPressureCard />
          <VitalCard label="Temperature">
            <VitalInput name="temperatureC" label="Temperature (°C)" placeholder="37.0" unitSuffix="°C" step="0.1" min={30} max={45} hint="30.0 – 45.0 °C" />
          </VitalCard>
          <VitalCard label="Heart rate">
            <VitalInput name="heartRateBpm" label="Heart rate (bpm)" placeholder="72" unitSuffix="bpm" min={20} max={300} hint="20 – 300 bpm" />
          </VitalCard>
          <VitalCard label="Oxygen">
            <VitalInput name="spo2Percent" label="Oxygen saturation (SpO₂ %)" placeholder="98" unitSuffix="% SpO₂" min={50} max={100} hint="50 – 100% SpO₂" />
          </VitalCard>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Dedicated Blood Pressure vital card: locks Systolic and Diastolic inputs
 * side-by-side with the slash separator in a unified row, with a full-width
 * single-line status footer below (eliminating multiline sub-column error wraps).
 */
function BloodPressureCard() {
  const { control } = useFormContext<DynamicIntakeFormValues>();
  return (
    <Controller
      name={`${VITALS}.systolicBp` as FieldPath<DynamicIntakeFormValues>}
      control={control}
      render={({ field: sysField, fieldState: sysState }) => (
        <Controller
          name={`${VITALS}.diastolicBp` as FieldPath<DynamicIntakeFormValues>}
          control={control}
          render={({ field: diaField, fieldState: diaState }) => {
            // Status words instead of bare ranges: "40–300 mmHg" under a
            // mistyped box read like a reading, not a problem.
            const bp = classifyBloodPressure(sysField.value, diaField.value);
            const oneMissing = (bp.systolic === "not_recorded") !== (bp.diastolic === "not_recorded");
            const errorMsg = oneMissing
              ? null
              : vitalPatientMessage("systolicBp", bp.systolic) ??
                vitalPatientMessage("diastolicBp", bp.diastolic) ??
                vitalPatientMessage("bloodPressure", bp.pair);
            const hasError = Boolean(errorMsg || sysState.error || diaState.error);
            const sysBad = sysState.invalid || (bp.systolic !== "ok" && bp.systolic !== "not_recorded");
            const diaBad = diaState.invalid || (bp.diastolic !== "ok" && bp.diastolic !== "not_recorded");

            return (
              <VitalCard id="bp-label" label="Blood pressure">
                <div role="group" aria-labelledby="bp-label" className="flex items-center gap-1.5">
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="vital-systolicBp"
                      type="number"
                      inputMode="decimal"
                      min={40}
                      max={300}
                      placeholder="120"
                      aria-label="Systolic blood pressure (mmHg)"
                      aria-invalid={sysBad || undefined}
                      title={sysState.error?.message}
                      className={cn(
                        COMPACT_INPUT,
                        "text-center text-lg font-semibold tabular-nums",
                        sysBad && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
                      )}
                      value={sysField.value == null ? "" : String(sysField.value)}
                      onChange={(e) => sysField.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  </div>
                  <span aria-hidden className="shrink-0 text-lg font-semibold text-(--text-muted)">/</span>
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="vital-diastolicBp"
                      type="number"
                      inputMode="decimal"
                      min={20}
                      max={200}
                      placeholder="80"
                      aria-label="Diastolic blood pressure (mmHg)"
                      aria-invalid={diaBad || undefined}
                      title={diaState.error?.message}
                      className={cn(
                        COMPACT_INPUT,
                        "text-center text-lg font-semibold tabular-nums",
                        diaBad && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
                      )}
                      value={diaField.value == null ? "" : String(diaField.value)}
                      onChange={(e) => diaField.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mt-1.5 text-[15px] leading-snug">
                  {hasError ? (
                    <span role="alert" className="flex items-start gap-1.5 font-medium text-(--danger-fg)">
                      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                      {errorMsg ?? "Check the reading and enter it again."}
                    </span>
                  ) : oneMissing ? (
                    <span className="text-(--text-muted)">Enter both numbers, like 120/80.</span>
                  ) : (
                    <span className="text-(--text-muted)">mmHg (e.g. 120/80)</span>
                  )}
                </div>
              </VitalCard>
            );
          }}
        />
      )}
    />
  );
}

/**
 * A single vital's card shell: icon + label on one line (never a unit
 * alongside it — that wrapped mid-word in a 3-up grid) plus the input(s)
 * below. `truncate` guarantees every card's header is exactly one line, so
 * cards in the same row stay the same height regardless of label length.
 */
function VitalCard({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-(--border-default) bg-(--surface-card) p-3.5", className)}>
      <span id={id} className="mb-2 block text-base font-medium text-(--text-body)">
        {label}
      </span>
      {children}
    </div>
  );
}

function VitalInput({
  name,
  label,
  placeholder,
  min,
  max,
  step,
  unitSuffix,
  hint,
}: {
  name: keyof NonNullable<Teleconsult["vitals"]>;
  label: string;
  placeholder: string;
  min: number;
  max: number;
  step?: string;
  unitSuffix?: string;
  hint?: string;
}) {
  const { control } = useFormContext<DynamicIntakeFormValues>();
  const id = `vital-${name}`;
  return (
    <Controller
      name={`${VITALS}.${name}` as FieldPath<DynamicIntakeFormValues>}
      control={control}
      render={({ field, fieldState }) => {
        const message = vitalPatientMessage(name, classifyVital(name, field.value)) ?? fieldState.error?.message;
        const bad = Boolean(message);
        return (
        <div className="min-w-0">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <div className="relative">
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              aria-invalid={bad || undefined}
              aria-describedby={`${id}-note`}
              className={cn(
                COMPACT_INPUT,
                "text-lg font-semibold tabular-nums",
                unitSuffix && (unitSuffix.length > 3 ? "pr-20" : "pr-12"),
                bad && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
              )}
              value={field.value == null ? "" : String(field.value)}
              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
            />
            {unitSuffix ? (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-base font-medium text-(--text-muted)">
                {unitSuffix}
              </span>
            ) : null}
          </div>
          {bad ? (
            <p id={`${id}-note`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[15px] leading-snug font-medium text-(--danger-fg)">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {message}
            </p>
          ) : hint ? (
            <p id={`${id}-note`} className="mt-1.5 text-[15px] leading-snug text-(--text-muted)">{hint}</p>
          ) : null}
        </div>
        );
      }}
    />
  );
}
