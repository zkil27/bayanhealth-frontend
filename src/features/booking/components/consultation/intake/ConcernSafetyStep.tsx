"use client";

import {
  Activity,
  Check,
  ChevronDown,
  Droplet,
  HeartPulse,
  Phone,
  Siren,
  Thermometer,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState } from "react";
import { CustomBottomModal } from "@/components/ui/custom-bottom-modal";
import {
  Controller,
  type FieldPath,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ChipButton, Reveal, SegmentedToggle } from "./IntakeChoice";

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
    <div className="space-y-8">
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
      <div className="rounded-2xl border border-(--gold-400) bg-(--gold-100)/70 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-(--gold-100) text-(--gold-700) ring-1 ring-(--gold-400)">
            <TriangleAlert className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="red-flag-heading" className="text-xs font-bold tracking-wider text-(--text-heading) uppercase">
              Quick clinical safety check <span aria-hidden className="text-(--danger-fg)">*</span>
            </h2>
            <p className="mt-0.5 text-sm text-(--text-body)">
              Are you experiencing chest pain or tightness, sudden shortness of breath, or severe uncontrollable bleeding?
            </p>
            <div role="radiogroup" aria-labelledby="red-flag-heading" className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                role="radio"
                aria-checked={answer === "no"}
                onClick={answerNo}
                className={cn(
                  "min-h-11 rounded-xl border px-4 text-xs font-bold transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  answer === "no"
                    ? "border-(--surface-nav-accent) bg-(--surface-raised) text-(--safe-fg) shadow-sm ring-1 ring-(--surface-nav-accent)"
                    : "border-(--gold-400) bg-(--surface-raised)/60 text-(--text-body) hover:bg-(--surface-raised)",
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
                  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-bold transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  answer === "yes"
                    ? "border-(--danger-border) bg-(--danger-border) text-(--text-inverse) shadow-sm"
                    : "border-(--danger-border)/40 bg-(--surface-raised)/60 text-(--danger-fg) hover:bg-(--danger-bg)",
                )}
              >
                <Siren aria-hidden className="size-4" /> Yes, I have severe symptoms
              </button>
            </div>
          </div>
        </div>
      </div>

      {answer === "yes" ? (
        <div role="alert" className="animate-in space-y-3 rounded-2xl border-2 border-(--danger-border) bg-(--danger-bg) p-5 text-sm text-(--danger-fg) duration-200 fade-in">
          <p className="flex items-center gap-2 font-bold">
            <Siren aria-hidden className="size-4" /> Immediate hospital care advised
          </p>
          <p className="leading-relaxed">
            Telehealth cannot safely treat a possible heart, breathing, or bleeding emergency. Go to the nearest emergency department now or call emergency services.
          </p>
          <EmergencyActions onRetract={retract} />
          <fieldset className="border-t border-(--danger-border)/30 pt-3">
            <legend className="mb-2 text-xs font-bold">Which applies? Your doctor sees this first.</legend>
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
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--danger-border) px-5 text-sm font-bold text-(--text-inverse) shadow-sm hover:bg-(--danger-fg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <Phone aria-hidden className="size-4" /> Call 911 now
      </a>
      <button
        type="button"
        onClick={onRetract}
        className="min-h-11 px-2 text-sm font-medium text-(--danger-fg) underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        I selected this by mistake
      </button>
    </div>
  );
}

function MainConcern() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const tags = (useWatch({ control, name: "requestDetails.complaintTags" as FieldPath<DynamicIntakeFormValues> }) ?? []) as ComplaintTag[];
  const [symptomsModalOpen, setSymptomsModalOpen] = useState(false);
  const opts = { shouldDirty: true, shouldValidate: true } as const;

  const toggle = (tag: ComplaintTag) => {
    const active = tags.includes(tag);
    setValue("requestDetails.complaintTags" as FieldPath<DynamicIntakeFormValues>, (active ? tags.filter((item) => item !== tag) : [...tags, tag]) as never, opts);
    // Fever duration only means something while Fever is selected.
    if (active && tag === "fever") setValue("requestDetails.safetyScreen.feverDays" as FieldPath<DynamicIntakeFormValues>, undefined as never, opts);
  };

  return (
    <section className="space-y-5 border-t border-(--border-subtle) pt-5">
      <Controller
        name={"requestDetails.chiefComplaint" as FieldPath<DynamicIntakeFormValues>}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-1.5">
            <BlockLabel htmlFor="chief-complaint" required>
              What is your main concern or reason for consult?
            </BlockLabel>
            <p id="chief-complaint-hint" className="text-xs text-(--text-muted)">
              Describe your main symptom, how many days you&apos;ve felt this way, and anything you&apos;ve already taken.
            </p>
            <textarea
              id="chief-complaint"
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              aria-describedby="chief-complaint-hint"
              aria-invalid={fieldState.invalid || undefined}
              className="min-h-[85px] w-full rounded-2xl border border-(--border-default) bg-(--surface-raised) p-3 text-sm text-(--text-body) outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent) aria-invalid:border-(--danger-border)"
            />
            {fieldState.error ? <p className="text-xs text-(--danger-fg)">{fieldState.error.message}</p> : null}
          </div>
        )}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <BlockLabel>Related symptoms</BlockLabel>
            <span className="text-[11px] text-(--text-subtle)">Optional · select all that apply</span>
          </div>
          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => setValue("requestDetails.complaintTags" as FieldPath<DynamicIntakeFormValues>, [] as never, opts)}
              className="text-[11px] font-semibold text-(--danger-fg) hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* High-Affordance Trigger Button */}
        <button
          type="button"
          onClick={() => setSymptomsModalOpen(true)}
          className={cn(
            "flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3 text-left text-xs sm:text-sm transition-colors hover:bg-(--surface-canvas)",
            "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="size-4 shrink-0 text-(--action-primary)" />
            <span className={cn("truncate font-medium", tags.length === 0 ? "text-muted-foreground" : "text-(--text-heading)")}>
              {tags.length === 0
                ? "Select related symptoms..."
                : `${tags.length} symptom${tags.length > 1 ? "s" : ""} selected`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {tags.length > 0 && (
              <span className="rounded-full bg-(--teal-100) px-2 py-0.5 text-[10px] font-bold text-(--teal-800)">
                {tags.length}
              </span>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </button>

        {/* Selected Symptoms Chips display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--surface-nav-accent) bg-(--safe-bg) px-2.5 py-1 text-xs font-semibold text-(--safe-fg)"
              >
                <Check className="size-3 text-(--surface-nav-accent)" />
                <span>{complaintTagLabel(tag)}</span>
                <button
                  type="button"
                  onClick={() => toggle(tag)}
                  className="rounded p-0.5 hover:bg-(--safe-fg)/10 cursor-pointer"
                  aria-label={`Remove ${complaintTagLabel(tag)}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Symmetrical Aligned Mobile Modal */}
        <CustomBottomModal
          open={symptomsModalOpen}
          onOpenChange={setSymptomsModalOpen}
          title="Related Symptoms"
          description="Select all symptoms that apply to your visit"
        >
          <div className="space-y-4 pb-2 max-h-[60vh] overflow-y-auto px-0.5">
            {SYMPTOM_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-(--text-muted)">
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.tags.map(([value, label]) => {
                    const selected = tags.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggle(value)}
                        className={cn(
                          "flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all active:scale-[0.98]",
                          selected
                            ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--safe-fg) shadow-xs ring-1 ring-(--surface-nav-accent)"
                            : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-canvas)",
                        )}
                      >
                        <span className="truncate mr-1">{label}</span>
                        {selected && <Check className="size-3.5 shrink-0 text-(--surface-nav-accent)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSymptomsModalOpen(false)}
              className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-(--action-primary) font-semibold text-white transition-opacity active:opacity-90"
            >
              Done {tags.length > 0 ? `(${tags.length} selected)` : ""}
            </button>
          </div>
        </CustomBottomModal>
      </div>

      <Reveal open={tags.includes("fever")} className="-mt-6">
        <Controller
          name={"requestDetails.safetyScreen.feverDays" as FieldPath<DynamicIntakeFormValues>}
          control={control}
          render={({ field, fieldState }) => (
            <div className="max-w-[200px] space-y-1.5 pt-4">
              <BlockLabel htmlFor="fever-days">How many days have you had a fever?</BlockLabel>
              <input
                id="fever-days"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                placeholder="e.g. 2"
                aria-invalid={fieldState.invalid || undefined}
                className={cn(COMPACT_INPUT, "min-h-11")}
                value={field.value == null ? "" : String(field.value)}
                // Empty stays "not answered", never 0.
                onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
              />
              {fieldState.error ? <p className="text-xs text-(--danger-fg)">{fieldState.error.message}</p> : null}
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
    <section aria-labelledby="home-vitals-heading" className="border-t border-(--border-subtle) pt-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <BlockLabel id="home-vitals-heading">Home vitals</BlockLabel>
          <span className="text-[11px] text-(--text-subtle)">Optional · only if you measured them today</span>
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
      </div>

      {/* A plain 2x2: every vital gets an equal-sized card, none commandeering the whole row. */}
      <Reveal open={show}>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-canvas) p-4">
          <VitalCard id="bp-label" label="Blood pressure" icon={<HeartPulse className="size-4" />}>
            <div role="group" aria-labelledby="bp-label" className="flex items-center gap-1.5">
              <VitalInput name="systolicBp" label="Systolic (mmHg)" placeholder="120" min={40} max={300} bare />
              <span aria-hidden className="text-sm font-medium text-(--text-subtle)">/</span>
              <VitalInput name="diastolicBp" label="Diastolic (mmHg)" placeholder="80" min={20} max={200} bare />
            </div>
          </VitalCard>
          <VitalCard label="Temperature" icon={<Thermometer className="size-4" />}>
            <VitalInput name="temperatureC" label="Temperature (°C)" placeholder="37.0" unitSuffix="°C" step="0.1" min={30} max={45} bare />
          </VitalCard>
          <VitalCard label="Heart rate" icon={<Activity className="size-4" />}>
            <VitalInput name="heartRateBpm" label="Heart rate (bpm)" placeholder="72" unitSuffix="bpm" min={20} max={300} bare />
          </VitalCard>
          <VitalCard label="Oxygen" icon={<Droplet className="size-4" />}>
            <VitalInput name="spo2Percent" label="Oxygen saturation (SpO₂ %)" placeholder="98" unitSuffix="% SpO₂" min={50} max={100} bare />
          </VitalCard>
        </div>
      </Reveal>
    </section>
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
  icon,
  className,
  children,
}: {
  id?: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-(--border-default) bg-(--surface-raised) p-3", className)}>
      <span id={id} className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-nowrap text-(--text-muted) uppercase">
        <span aria-hidden className="shrink-0 text-(--text-subtle)">{icon}</span>
        <span className="truncate">{label}</span>
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
  bare = false,
}: {
  name: keyof NonNullable<Teleconsult["vitals"]>;
  label: string;
  placeholder: string;
  min: number;
  max: number;
  step?: string;
  /** Shown as a quiet suffix inside the input (e.g. "°C") instead of crowding the card's header label. */
  unitSuffix?: string;
  /** Visually label-less (the value lives inside a `VitalCard`); keeps an accessible name. */
  bare?: boolean;
}) {
  const { control } = useFormContext<DynamicIntakeFormValues>();
  const id = `vital-${name}`;
  return (
    <Controller
      name={`${VITALS}.${name}` as FieldPath<DynamicIntakeFormValues>}
      control={control}
      render={({ field, fieldState }) => (
        <div className={bare ? "min-w-0 flex-1" : undefined}>
          <label htmlFor={id} className={bare ? "sr-only" : "mb-1 block text-[10px] font-bold text-(--text-muted) uppercase"}>
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
              className={cn(COMPACT_INPUT, "min-h-11 text-sm font-medium", bare && "text-center", unitSuffix && "pr-11")}
              value={field.value == null ? "" : String(field.value)}
              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
            />
            {unitSuffix ? (
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] font-semibold text-(--text-subtle)">
                {unitSuffix}
              </span>
            ) : null}
          </div>
          {fieldState.error ? <p className="mt-1 text-[10px] text-(--danger-fg)">{fieldState.error.message}</p> : null}
        </div>
      )}
    />
  );
}
