"use client";

import { Phone, Siren, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  type FieldPath,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ChipButton, FieldHint, Reveal, SegmentedToggle } from "./IntakeChoice";

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

type RedFlagAnswer = "no" | "yes";

export interface RedFlagState {
  answer: RedFlagAnswer | undefined;
  /** No contract field carries bleeding yet, so it is held for this visit only. */
  bleeding: boolean;
}

/** Why Continue is blocked on this step, or null when it may proceed. */
export function concernBlockedReason(request: DynamicIntakeFormValues["requestDetails"] | undefined, redFlag: RedFlagState): string | null {
  if (!redFlag.answer) return "Answer the safety check to continue.";
  const teleconsult = request?.type === "teleconsult" ? request : undefined;
  if (
    redFlag.answer === "yes" &&
    !redFlag.bleeding &&
    teleconsult?.safetyScreen?.chestPain !== true &&
    teleconsult?.safetyScreen?.dyspnea !== true
  ) {
    return "Tell us which severe symptom applies to continue.";
  }
  const complaint = teleconsult?.chiefComplaint;
  if (!complaint?.trim()) return "Describe your main concern to continue.";
  return null;
}

/** Reads the stored screen back into the single yes/no gate answer. */
export function redFlagFromScreen(screen: Teleconsult["safetyScreen"]): RedFlagAnswer | undefined {
  if (screen?.chestPain === true || screen?.dyspnea === true) return "yes";
  if (screen?.chestPain === false && screen?.dyspnea === false) return "no";
  return undefined;
}

export function ConcernSafetyStep({
  redFlag,
  onRedFlagChange,
}: {
  redFlag: RedFlagState;
  onRedFlagChange: (state: RedFlagState) => void;
}) {
  return (
    <div className="space-y-9">
      <RedFlagGate state={redFlag} onChange={onRedFlagChange} />
      <MainConcern />
      <HomeVitals />
    </div>
  );
}

/**
 * Emergency red-flag gate. It replaces the three tri-state questions with one
 * explicit binary answer, and still writes the router's named fields:
 * "No" asserts both `chestPain` and `dyspnea` are false; "Yes" leaves them
 * unanswered until the patient says which applies, so nothing is invented.
 */
function RedFlagGate({
  state,
  onChange,
}: {
  state: RedFlagState;
  onChange: (state: RedFlagState) => void;
}) {
  const { answer, bleeding } = state;
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const screen = useWatch({ control, name: "requestDetails.safetyScreen" as FieldPath<DynamicIntakeFormValues> }) as Teleconsult["safetyScreen"];
  const opts = { shouldDirty: true, shouldValidate: true } as const;

  const setScreen = (field: "chestPain" | "dyspnea", value: boolean | undefined) =>
    setValue(`requestDetails.safetyScreen.${field}` as FieldPath<DynamicIntakeFormValues>, value as never, opts);

  const answerNo = () => {
    setScreen("chestPain", false);
    setScreen("dyspnea", false);
    onChange({ answer: "no", bleeding: false });
  };

  const answerYes = () => {
    if (answer !== "yes") {
      setScreen("chestPain", undefined);
      setScreen("dyspnea", undefined);
    }
    onChange({ answer: "yes", bleeding });
  };

  const retract = () => {
    setScreen("chestPain", undefined);
    setScreen("dyspnea", undefined);
    onChange({ answer: undefined, bleeding: false });
  };

  return (
    <section aria-labelledby="red-flag-heading" data-slot="always-visible-safety" className="space-y-4">
      {/*
       * Original wording, presented calmly: neutral answers until "Yes", with
       * red reserved for the emergency path. The gold warning box and
       * uppercase banner read as an alarm before the patient had answered.
       */}
      <div className="space-y-3">
        <div>
          <h2 id="red-flag-heading" className="text-[17px] leading-snug font-semibold text-(--text-heading) sm:text-lg">
            Quick clinical safety check<span className="sr-only"> (required)</span>
          </h2>
          <p className="mt-1 text-base leading-snug text-(--text-body)">
            Are you experiencing chest pain or tightness, sudden shortness of breath, or severe uncontrollable bleeding?
          </p>
        </div>
        <div role="radiogroup" aria-labelledby="red-flag-heading" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={answer === "no"}
            onClick={answerNo}
            className={cn(
              "min-h-14 rounded-xl border px-4 py-3 text-left text-base transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              answer === "no"
                ? "border-(--surface-nav-accent) bg-(--safe-bg) font-semibold text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
                : "border-(--border-default) bg-(--surface-card) font-medium text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
            )}
          >
            No, none of these severe symptoms
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={answer === "yes"}
            onClick={answerYes}
            className={cn(
              "inline-flex min-h-14 items-center gap-2 rounded-xl border px-4 py-3 text-left text-base transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              answer === "yes"
                ? "border-(--danger-border) bg-(--danger-border) font-semibold text-(--text-inverse)"
                : "border-(--border-default) bg-(--surface-card) font-medium text-(--text-body) hover:border-(--danger-border) hover:bg-(--danger-bg)",
            )}
          >
            <Siren aria-hidden className="size-4.5 shrink-0" /> Yes, I have severe symptoms
          </button>
        </div>
      </div>

      {answer === "yes" ? (
        <div role="alert" className="animate-in space-y-3 rounded-2xl border-2 border-(--danger-border) bg-(--danger-bg) p-5 text-base text-(--danger-fg) duration-200 fade-in motion-reduce:animate-none">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Siren aria-hidden className="size-5" /> Immediate hospital care advised
          </p>
          <p className="leading-relaxed">
            Telehealth cannot safely treat a possible heart, breathing, or bleeding emergency. Go to the nearest emergency department now or call emergency services.
          </p>
          <EmergencyActions onRetract={retract} />
          <fieldset className="border-t border-(--danger-border)/30 pt-3">
            <legend className="mb-2 text-[15px] font-bold">Which applies? Your doctor sees this first.</legend>
            <div className="flex flex-wrap gap-2">
              <ChipButton selected={screen?.chestPain === true} onClick={() => setScreen("chestPain", screen?.chestPain === true ? undefined : true)}>
                Chest pain or tightness
              </ChipButton>
              <ChipButton selected={screen?.dyspnea === true} onClick={() => setScreen("dyspnea", screen?.dyspnea === true ? undefined : true)}>
                Shortness of breath
              </ChipButton>
              <ChipButton selected={bleeding} onClick={() => onChange({ answer, bleeding: !bleeding })}>
                Severe bleeding
              </ChipButton>
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}

function EmergencyActions({ onRetract }: { onRetract: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <a
        href="tel:911"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--danger-border) px-6 text-base font-bold text-(--text-inverse) shadow-sm hover:bg-(--danger-fg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <Phone aria-hidden className="size-4" /> Call 911 now
      </a>
      <button
        type="button"
        onClick={onRetract}
        className="min-h-12 px-2 text-base font-medium text-(--danger-fg) underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        I selected this by mistake
      </button>
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
    <section className="space-y-7 border-t border-(--border-subtle) pt-7">
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
       * Symptoms sit on the page instead of in a bottom sheet. An even grid —
       * equal-width tiles, rows matched to their tallest label — rather than
       * ragged wrapping chips, so the list scans as one tidy set. Order is the
       * stored groups' order (common first).
       */}
      <div className="space-y-3">
        <div>
          <BlockLabel id="related-symptoms-heading" optional>Related symptoms</BlockLabel>
          <FieldHint>Select all that apply.</FieldHint>
        </div>
        <div role="group" aria-labelledby="related-symptoms-heading" className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
          {SYMPTOM_GROUPS.flatMap((group) => group.tags).map(([value, label]) => (
            <ChipButton
              key={value}
              selected={tags.includes(value)}
              onClick={() => toggle(value)}
              className="w-full justify-start text-left leading-snug"
            >
              {label}
            </ChipButton>
          ))}
        </div>
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
            const hasError = Boolean(sysState.error || diaState.error);
            const errorMsg =
              sysState.error && diaState.error
                ? "Range: 40–300 / 20–200"
                : sysState.error
                  ? sysState.error.message || "40–300 mmHg"
                  : diaState.error
                    ? diaState.error.message || "20–200 mmHg"
                    : null;

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
                      aria-invalid={sysState.invalid || undefined}
                      title={sysState.error?.message}
                      className={cn(
                        COMPACT_INPUT,
                        "text-center text-lg font-semibold tabular-nums",
                        sysState.invalid && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
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
                      aria-invalid={diaState.invalid || undefined}
                      title={diaState.error?.message}
                      className={cn(
                        COMPACT_INPUT,
                        "text-center text-lg font-semibold tabular-nums",
                        diaState.invalid && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
                      )}
                      value={diaField.value == null ? "" : String(diaField.value)}
                      onChange={(e) => diaField.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mt-1.5 text-[15px] leading-snug">
                  {hasError && errorMsg ? (
                    <span role="alert" className="flex items-start gap-1.5 font-medium text-(--danger-fg)">
                      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                      {errorMsg}
                    </span>
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
      render={({ field, fieldState }) => (
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
              aria-invalid={fieldState.invalid || undefined}
              title={fieldState.error?.message}
              className={cn(
                COMPACT_INPUT,
                "text-lg font-semibold tabular-nums",
                unitSuffix && (unitSuffix.length > 3 ? "pr-20" : "pr-12"),
                fieldState.invalid && "border-(--danger-border) focus-visible:ring-(--danger-border) bg-(--danger-bg)/10 text-(--danger-fg)",
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
          {fieldState.error ? (
            <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[15px] leading-snug font-medium text-(--danger-fg)">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {fieldState.error.message}
            </p>
          ) : hint ? (
            <p className="mt-1.5 text-[15px] leading-snug text-(--text-muted)">{hint}</p>
          ) : null}
        </div>
      )}
    />
  );
}
