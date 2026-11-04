"use client";

import {
  type FieldPath,
  useFormContext,
  useWatch,
} from "react-hook-form";

import type { z } from "zod";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues, symptomReviewSchema } from "../../../schemas/intakeSchema";
import { BlockLabel, ChipButton, COMPACT_INPUT, OptionalBlock, Reveal, SegmentedToggle } from "./IntakeChoice";
import { useClearIntakeUiState, useIntakeUiState } from "./intakeUiState";

type SymptomReviewValues = z.infer<typeof symptomReviewSchema>;

const REVIEW = "requestDetails.symptomReview";
const FIELD_OPTS = { shouldDirty: true, shouldValidate: true } as const;

/** Longest free-text "Other" entry; keeps every composed string far under the 1000-character contract cap. */
const OTHER_MAX = 120;

/**
 * Pain questions (PQRST), now an optional section at the end of the Concern
 * page instead of a page of their own (pilot feedback: shorten the form).
 *
 * A plain No / Yes opens the detail. Every detail block is optional and has a
 * Skip. Chip selections live in the intake UI store, so they are still lit
 * after Back, Continue, or a reload. Each control still composes the same
 * `symptomReview` strings as before.
 */
export function PainAssessmentStep({ className }: { className?: string }) {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const clearUi = useClearIntakeUiState();
  const review = useWatch({ control, name: REVIEW as FieldPath<DynamicIntakeFormValues> }) as
    | SymptomReviewValues
    | undefined;

  const hasAnyPainData = Boolean(
    typeof review?.painSeverity === "number" ||
    review?.characteristics?.trim() ||
    review?.location?.trim() ||
    review?.aggravatingFactors?.trim() ||
    review?.relievingFactors?.trim() ||
    review?.onset?.trim() ||
    review?.pattern?.trim()
  );

  const [hasPain, setHasPain] = useIntakeUiState<"no" | "yes" | undefined>("pain.hasPain", () =>
    hasAnyPainData ? "yes" : undefined
  );

  const handlePainGate = (answer: "no" | "yes") => {
    if (answer === "no") {
      clearUi("pain.");
      setValue(REVIEW as FieldPath<DynamicIntakeFormValues>, undefined as never, FIELD_OPTS);
    }
    setHasPain(answer);
  };

  return (
    <section aria-labelledby="pain-gate-heading" className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <BlockLabel id="pain-gate-heading" optional>Are you in pain right now?</BlockLabel>
        <SegmentedToggle
          label="Are you in pain right now?"
          value={hasPain}
          onChange={handlePainGate}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ]}
        />
      </div>

      <Reveal open={hasPain === "yes"}>
        <div className="space-y-7 pt-1">
          <Severity />
          <Quality />
          <RegionRadiation />
          <ProvocationPalliation />
          <Timing />
        </div>
      </Reveal>
    </section>
  );
}

/** Chips fill their grid cell so every row lines up. */
const CHIP = "w-full justify-start text-left leading-snug";

const joinParts = (parts: (string | false | null | undefined)[], glue = "; ") =>
  parts.filter(Boolean).join(glue);

/** Writes one `symptomReview` field, treating a blank string as "not answered". */
function useSymptomField(field: string) {
  const { setValue } = useFormContext<DynamicIntakeFormValues>();
  return (value: string | number | undefined) =>
    setValue(`${REVIEW}.${field}` as FieldPath<DynamicIntakeFormValues>, (value || undefined) as never, FIELD_OPTS);
}

/**
 * Skip state for one pain block. Skipping clears that block's stored fields
 * and its chips, then folds the block to a line.
 */
function useSkippableBlock(block: string, fields: readonly string[]) {
  const { setValue } = useFormContext<DynamicIntakeFormValues>();
  const clearUi = useClearIntakeUiState();
  const [skipped, setSkipped] = useIntakeUiState(`pain.skip.${block}`, false);
  return {
    skipped,
    onSkip: () => {
      clearUi(`pain.${block}.`);
      for (const field of fields) {
        setValue(`${REVIEW}.${field}` as FieldPath<DynamicIntakeFormValues>, undefined as never, FIELD_OPTS);
      }
      setSkipped(true);
    },
    onResume: () => setSkipped(false),
  };
}

function OtherInput({
  open,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  open: boolean;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <Reveal open={open}>
      <input
        value={value}
        maxLength={OTHER_MAX}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(COMPACT_INPUT, "mt-1")}
      />
    </Reveal>
  );
}

const WORSE_OPTIONS = new Map([
  ["swallowing", "Swallowing"],
  ["movement", "Movement"],
  ["deep_breathing", "Deep breathing"],
  ["eating", "Eating"],
  ["coughing", "Coughing"],
]);
const BETTER_OPTIONS = new Map([
  ["resting", "Resting"],
  ["fever_medicine", "Fever medicine"],
  ["warm_water", "Warm water or drinks"],
  ["cold_compress", "Cold compress"],
]);

/**
 * One "select some chips, optionally add your own" question. Every change —
 * a chip toggle or an edit to the custom entry — recomposes the full answer
 * from values computed in that same handler, never from a state variable
 * that might not have re-rendered yet.
 */
function ChipQuestion({
  legend,
  options,
  selected,
  onToggle,
  otherEnabled,
  onOtherEnabledChange,
  otherValue,
  onOtherChange,
  otherPlaceholder,
  otherAriaLabel,
}: {
  legend: string;
  options: ReadonlyMap<string, string>;
  selected: string[];
  onToggle: (value: string) => void;
  otherEnabled: boolean;
  onOtherEnabledChange: (next: boolean) => void;
  otherValue: string;
  onOtherChange: (next: string) => void;
  otherPlaceholder: string;
  otherAriaLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium text-(--text-body)">{legend}</p>
      <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
        {[...options].map(([value, label]) => (
          <ChipButton key={value} selected={selected.includes(value)} onClick={() => onToggle(value)} className={CHIP}>
            {label}
          </ChipButton>
        ))}
        <ChipButton selected={otherEnabled} onClick={() => onOtherEnabledChange(!otherEnabled)} className={CHIP}>
          Other
        </ChipButton>
      </div>
      <OtherInput open={otherEnabled} value={otherValue} onChange={onOtherChange} placeholder={otherPlaceholder} ariaLabel={otherAriaLabel} />
    </div>
  );
}

function ProvocationPalliation() {
  const [worse, setWorse] = useIntakeUiState<string[]>("pain.affects.worse", []);
  const [worseOtherOn, setWorseOtherOn] = useIntakeUiState("pain.affects.worseOtherOn", false);
  const [worseOther, setWorseOther] = useIntakeUiState("pain.affects.worseOther", "");
  const [better, setBetter] = useIntakeUiState<string[]>("pain.affects.better", []);
  const [betterOtherOn, setBetterOtherOn] = useIntakeUiState("pain.affects.betterOtherOn", false);
  const [betterOther, setBetterOther] = useIntakeUiState("pain.affects.betterOther", "");
  const setAggravating = useSymptomField("aggravatingFactors");
  const setRelieving = useSymptomField("relievingFactors");
  const skip = useSkippableBlock("affects", ["aggravatingFactors", "relievingFactors"]);

  const composeWorse = (chips: string[], otherOn: boolean, other: string) =>
    setAggravating(joinParts([chips.map((value) => WORSE_OPTIONS.get(value)).join(", "), otherOn ? other.trim() : undefined], ", "));
  const composeBetter = (chips: string[], otherOn: boolean, other: string) =>
    setRelieving(joinParts([chips.map((value) => BETTER_OPTIONS.get(value)).join(", "), otherOn ? other.trim() : undefined], ", "));

  const toggleWorse = (value: string) => {
    const next = worse.includes(value) ? worse.filter((item) => item !== value) : [...worse, value];
    setWorse(next);
    composeWorse(next, worseOtherOn, worseOther);
  };
  const toggleBetter = (value: string) => {
    const next = better.includes(value) ? better.filter((item) => item !== value) : [...better, value];
    setBetter(next);
    composeBetter(next, betterOtherOn, betterOther);
  };

  return (
    <OptionalBlock id="pqrst-p" title="What affects the pain" hint="Choose any that apply." {...skip}>
      <div className="space-y-4">
        <ChipQuestion
          legend="What makes it worse?"
          options={WORSE_OPTIONS}
          selected={worse}
          onToggle={toggleWorse}
          otherEnabled={worseOtherOn}
          onOtherEnabledChange={(next) => { setWorseOtherOn(next); composeWorse(worse, next, worseOther); }}
          otherValue={worseOther}
          onOtherChange={(next) => { setWorseOther(next); composeWorse(worse, worseOtherOn, next); }}
          otherPlaceholder="What else makes it worse?"
          otherAriaLabel="Other factor that makes it worse"
        />

        <ChipQuestion
          legend="What makes it better?"
          options={BETTER_OPTIONS}
          selected={better}
          onToggle={toggleBetter}
          otherEnabled={betterOtherOn}
          onOtherEnabledChange={(next) => { setBetterOtherOn(next); composeBetter(better, next, betterOther); }}
          otherValue={betterOther}
          onOtherChange={(next) => { setBetterOther(next); composeBetter(better, betterOtherOn, next); }}
          otherPlaceholder="What else makes it better?"
          otherAriaLabel="Other factor that makes it better"
        />
      </div>
    </OptionalBlock>
  );
}

const QUALITY_OPTIONS = new Map([
  ["sharp", "Sharp"],
  ["stinging", "Stinging"],
  ["throbbing", "Throbbing"],
  ["heavy", "Heavy / dull"],
  ["pinching", "Pinching"],
]);

function Quality() {
  const [quality, setQuality] = useIntakeUiState<string[]>("pain.quality.chips", []);
  const [describe, setDescribe] = useIntakeUiState("pain.quality.describe", "");
  const setCharacteristics = useSymptomField("characteristics");
  const skip = useSkippableBlock("quality", ["characteristics"]);

  const compose = (chips: string[], description: string) =>
    setCharacteristics(joinParts([chips.map((value) => QUALITY_OPTIONS.get(value)).join(", "), description.trim()]));

  const toggle = (value: string) => {
    const next = quality.includes(value) ? quality.filter((item) => item !== value) : [...quality, value];
    setQuality(next);
    compose(next, describe);
  };

  return (
    <OptionalBlock id="pqrst-q" title="What it feels like" hint="Choose any that apply." {...skip}>
      <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
        {[...QUALITY_OPTIONS].map(([value, label]) => (
          <ChipButton key={value} selected={quality.includes(value)} onClick={() => toggle(value)} className={CHIP}>
            {label}
          </ChipButton>
        ))}
      </div>
      <textarea
        value={describe}
        onChange={(event) => { setDescribe(event.target.value); compose(quality, event.target.value); }}
        rows={2}
        placeholder="Describe it in your own words"
        aria-label="Describe the pain further"
        className={cn(COMPACT_INPUT, "block resize-y")}
      />
    </OptionalBlock>
  );
}

function RegionRadiation() {
  const [bodyPart, setBodyPart] = useIntakeUiState("pain.region.bodyPart", "");
  const [radiates, setRadiates] = useIntakeUiState<"no" | "yes" | undefined>("pain.region.radiates", undefined);
  const [radiatesTo, setRadiatesTo] = useIntakeUiState("pain.region.radiatesTo", "");
  const setLocation = useSymptomField("location");
  const skip = useSkippableBlock("region", ["location"]);

  const compose = (part: string, spread: typeof radiates, spreadTarget: string) => {
    const spreadText =
      spread === "yes"
        ? spreadTarget.trim()
          ? `Spreads to ${spreadTarget.trim()}`
          : "Spreads to other areas"
        : spread === "no"
          ? "Does not spread"
          : undefined;
    setLocation(joinParts([part.trim(), spreadText]));
  };

  return (
    <OptionalBlock id="pqrst-r" title="Where it is" {...skip}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pain-body-part" className="block text-base font-medium text-(--text-body)">Where in the body?</label>
          <input
            id="pain-body-part"
            value={bodyPart}
            onChange={(event) => { setBodyPart(event.target.value); compose(event.target.value, radiates, radiatesTo); }}
            placeholder="e.g. Throat, right side"
            className={COMPACT_INPUT}
          />
        </div>
        <div className="space-y-2">
          <p className="text-base font-medium text-(--text-body)">Does it spread to other areas?</p>
          <SegmentedToggle
            label="Does the pain spread to other areas"
            value={radiates}
            onChange={(next) => { setRadiates(next); compose(bodyPart, next, radiatesTo); }}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
          />
          <Reveal open={radiates === "yes"}>
            <input
              value={radiatesTo}
              onChange={(event) => { setRadiatesTo(event.target.value); compose(bodyPart, radiates, event.target.value); }}
              placeholder="Where does it spread to?"
              aria-label="Where the pain spreads to"
              className={cn(COMPACT_INPUT, "mt-1")}
            />
          </Reveal>
        </div>
      </div>
    </OptionalBlock>
  );
}

/** Qualitative bucket for a 0–10 severity score, shared with the review ledger. */
export function severityLabel(value: number): string {
  if (value === 0) return "No pain";
  if (value <= 3) return "Mild";
  if (value <= 6) return "Moderate";
  if (value <= 9) return "Severe";
  return "Worst possible";
}

function Severity() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const severity = useWatch({ control, name: `${REVIEW}.painSeverity` as FieldPath<DynamicIntakeFormValues> }) as number | undefined;
  const skip = useSkippableBlock("severity", ["painSeverity"]);

  return (
    <OptionalBlock
      id="pqrst-s"
      title="How bad is the pain?"
      hint={typeof severity === "number" ? `${severity} out of 10 · ${severityLabel(severity)}` : "0 is no pain, 10 is the worst pain possible."}
      {...skip}
    >
      <div role="radiogroup" aria-label="Pain from 0 to 10" className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={severity === value}
            aria-label={`${value}, ${severityLabel(value)}`}
            onClick={() =>
              setValue(`${REVIEW}.painSeverity` as FieldPath<DynamicIntakeFormValues>, (severity === value ? undefined : value) as never, FIELD_OPTS)
            }
            className={cn(
              "min-h-12 rounded-xl border text-lg font-semibold tabular-nums transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              severity === value
                ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
                : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-[15px] text-(--text-muted)">
        <span>No pain</span>
        <span>Worst possible</span>
      </div>
    </OptionalBlock>
  );
}

const ONSET_OPTIONS = new Map([
  ["just_now", "Just now"],
  ["yesterday", "Yesterday"],
  ["2_3_days", "2–3 days ago"],
  ["1_week_plus", "A week or more ago"],
]);
const WHEN_OPTIONS = new Map([
  ["waking", "On waking"],
  ["after_eating", "After eating"],
  ["night", "At night"],
  ["all_day", "All day"],
]);
const FREQUENCY_OPTIONS = new Map([
  ["constant", "Constant"],
  ["several_daily", "Several times a day"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["rare", "Rarely"],
]);
const DURATION_UNITS = ["seconds", "minutes", "hours", "days"] as const;
type DurationUnit = (typeof DURATION_UNITS)[number];
const OTHER = "other";

interface PatternParts {
  frequency: string | undefined;
  frequencyOther: string;
  when: string[];
  whenOther: string;
  durationValue: string;
  durationUnit: DurationUnit;
}

/**
 * Composes `symptomReview.pattern`, e.g. "Daily; worse at night; about 20
 * minutes each time". An "Other" answer replaces (frequency) or joins (flare
 * times) the chip labels in the same sentence, so the contract field and the
 * doctor's read-back are unchanged in shape.
 */
export function composePattern(parts: PatternParts): string {
  const whenLabels = parts.when
    .filter((value) => value !== OTHER)
    .map((value) => WHEN_OPTIONS.get(value)?.toLowerCase());
  if (parts.when.includes(OTHER) && parts.whenOther.trim()) whenLabels.push(parts.whenOther.trim());
  const whenText = whenLabels.filter(Boolean).join(" and ");
  const frequencyText =
    parts.frequency === OTHER ? parts.frequencyOther.trim() || undefined : parts.frequency ? FREQUENCY_OPTIONS.get(parts.frequency) : undefined;
  return joinParts([
    frequencyText,
    whenText ? `worse ${whenText}` : undefined,
    parts.durationValue.trim() ? `about ${parts.durationValue.trim()} ${parts.durationUnit} each time` : undefined,
  ]);
}

/** Composes `symptomReview.onset` from the chip, or from the patient's own words under "Other". */
export function composeOnset(onset: string | undefined, onsetOther: string): string | undefined {
  if (onset === OTHER) return onsetOther.trim() || undefined;
  return onset ? ONSET_OPTIONS.get(onset) : undefined;
}

function Timing() {
  const [onset, setOnset] = useIntakeUiState<string | undefined>("pain.timing.onset", undefined);
  const [onsetOther, setOnsetOther] = useIntakeUiState("pain.timing.onsetOther", "");
  const [when, setWhen] = useIntakeUiState<string[]>("pain.timing.when", []);
  const [whenOther, setWhenOther] = useIntakeUiState("pain.timing.whenOther", "");
  const [frequency, setFrequency] = useIntakeUiState<string | undefined>("pain.timing.frequency", undefined);
  const [frequencyOther, setFrequencyOther] = useIntakeUiState("pain.timing.frequencyOther", "");
  const [durationValue, setDurationValue] = useIntakeUiState("pain.timing.durationValue", "");
  const [durationUnit, setDurationUnit] = useIntakeUiState<DurationUnit>("pain.timing.durationUnit", "minutes");
  const setOnsetField = useSymptomField("onset");
  const setPattern = useSymptomField("pattern");
  const skip = useSkippableBlock("timing", ["onset", "pattern"]);

  const current: PatternParts = { frequency, frequencyOther, when, whenOther, durationValue, durationUnit };
  const updatePattern = (patch: Partial<PatternParts>) => setPattern(composePattern({ ...current, ...patch }));

  return (
    <OptionalBlock id="pqrst-t" title="When and how often" {...skip}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-base font-medium text-(--text-body)">When did it start?</p>
          <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
            {[...ONSET_OPTIONS, [OTHER, "Other"] as const].map(([value, label]) => (
              <ChipButton
                className={CHIP}
                key={value}
                selected={onset === value}
                onClick={() => {
                  const next = onset === value ? undefined : value;
                  setOnset(next);
                  setOnsetField(composeOnset(next, onsetOther));
                }}
              >
                {label}
              </ChipButton>
            ))}
          </div>
          <OtherInput
            open={onset === OTHER}
            value={onsetOther}
            onChange={(next) => { setOnsetOther(next); setOnsetField(composeOnset(onset, next)); }}
            placeholder="e.g. After a fall last month"
            ariaLabel="When the pain started, in your own words"
          />
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium text-(--text-body)">When does it usually flare up?</p>
          <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
            {[...WHEN_OPTIONS, [OTHER, "Other"] as const].map(([value, label]) => (
              <ChipButton
                className={CHIP}
                key={value}
                selected={when.includes(value)}
                onClick={() => {
                  const next = when.includes(value) ? when.filter((item) => item !== value) : [...when, value];
                  setWhen(next);
                  updatePattern({ when: next });
                }}
              >
                {label}
              </ChipButton>
            ))}
          </div>
          <OtherInput
            open={when.includes(OTHER)}
            value={whenOther}
            onChange={(next) => { setWhenOther(next); updatePattern({ whenOther: next }); }}
            placeholder="e.g. After exercise"
            ariaLabel="When the pain flares up, in your own words"
          />
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium text-(--text-body)">How often does it happen?</p>
          <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
            {[...FREQUENCY_OPTIONS, [OTHER, "Other"] as const].map(([value, label]) => (
              <ChipButton
                className={CHIP}
                key={value}
                selected={frequency === value}
                onClick={() => {
                  const next = frequency === value ? undefined : value;
                  setFrequency(next);
                  updatePattern({ frequency: next });
                }}
              >
                {label}
              </ChipButton>
            ))}
          </div>
          <OtherInput
            open={frequency === OTHER}
            value={frequencyOther}
            onChange={(next) => { setFrequencyOther(next); updatePattern({ frequencyOther: next }); }}
            placeholder="e.g. Twice a month"
            ariaLabel="How often the pain happens, in your own words"
          />
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium text-(--text-body)">How long does each episode last?</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={durationValue}
              onChange={(event) => { setDurationValue(event.target.value); updatePattern({ durationValue: event.target.value }); }}
              placeholder="e.g. 20"
              aria-label="Duration of each episode"
              className={cn(COMPACT_INPUT, "w-28 tabular-nums")}
            />
            <SegmentedToggle
              label="Duration unit"
              value={durationUnit}
              onChange={(unit) => { setDurationUnit(unit); updatePattern({ durationUnit: unit }); }}
              options={DURATION_UNITS.map((unit) => ({ value: unit, label: unit }))}
              className="sm:w-auto [&>button]:px-3"
            />
          </div>
        </div>
      </div>
    </OptionalBlock>
  );
}
