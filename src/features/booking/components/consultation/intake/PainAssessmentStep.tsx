"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import {
  type FieldPath,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, ChipButton, COMPACT_INPUT, Reveal, SegmentedToggle } from "./IntakeChoice";

const REVIEW = "requestDetails.symptomReview";

/**
 * PQRST pain assessment (Provocation/Palliation, Quality, Region/Radiation,
 * Severity, Timing) — the clinical framework doctors already use, offered as
 * chips instead of the six blank textareas the old Symptom Review page asked
 * for. It is entirely optional: skipping it just leaves `symptomReview` empty,
 * the same as never having answered the old free-text version.
 *
 * The contract's `symptomReview` fields (onset, pattern, location,
 * characteristics, aggravatingFactors, relievingFactors) are each a single
 * string, and several of the questions here let the patient pick more than
 * one chip. Rather than change the contract, each question group composes its
 * own answers into one readable sentence and writes it into the matching
 * field on every change — the same "compose, don't restructure" approach
 * `ReviewConsentStep`'s ledger already uses. The tradeoff: on resuming a saved
 * draft, the composed sentences come back, but which individual chips
 * produced them does not — a returning patient sees their prior answers as
 * text, not as re-selected chips. Only `painSeverity`, already a plain
 * number, round-trips exactly.
 */
export function PainAssessmentStep() {
  return (
    <div className="space-y-8">
      <ProvocationPalliation />
      <Quality />
      <RegionRadiation />
      <Severity />
      <Timing />
      <p className="flex items-start gap-2 text-xs text-(--text-subtle)">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        You can skip this. It&apos;s shown to your doctor as a pain assessment summary alongside your other answers.
      </p>
    </div>
  );
}

const joinParts = (parts: (string | false | null | undefined)[], glue = "; ") =>
  parts.filter(Boolean).join(glue);

/** Writes one `symptomReview` field, treating a blank string as "not answered". */
function useSymptomField(field: string) {
  const { setValue } = useFormContext<DynamicIntakeFormValues>();
  return (value: string | number | undefined) =>
    setValue(`${REVIEW}.${field}` as FieldPath<DynamicIntakeFormValues>, (value || undefined) as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
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
      <p className="text-sm font-semibold text-(--text-body)">{legend}</p>
      <div className="flex flex-wrap gap-2">
        {[...options].map(([value, label]) => (
          <ChipButton key={value} selected={selected.includes(value)} onClick={() => onToggle(value)}>
            {label}
          </ChipButton>
        ))}
        <ChipButton selected={otherEnabled} onClick={() => onOtherEnabledChange(!otherEnabled)}>
          Other
        </ChipButton>
      </div>
      <Reveal open={otherEnabled}>
        <input
          value={otherValue}
          onChange={(event) => onOtherChange(event.target.value)}
          placeholder={otherPlaceholder}
          aria-label={otherAriaLabel}
          className={cn(COMPACT_INPUT, "mt-1 min-h-11")}
        />
      </Reveal>
    </div>
  );
}

function ProvocationPalliation() {
  const [worse, setWorse] = useState<string[]>([]);
  const [worseOtherOn, setWorseOtherOn] = useState(false);
  const [worseOther, setWorseOther] = useState("");
  const [better, setBetter] = useState<string[]>([]);
  const [betterOtherOn, setBetterOtherOn] = useState(false);
  const [betterOther, setBetterOther] = useState("");
  const setAggravating = useSymptomField("aggravatingFactors");
  const setRelieving = useSymptomField("relievingFactors");

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
    <section aria-labelledby="pqrst-p-heading" className="space-y-4">
      <div>
        <BlockLabel id="pqrst-p-heading">What affects the pain</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">Provocation &amp; palliation — optional, select all that apply</p>
      </div>

      <ChipQuestion
        legend="What makes it worse?"
        options={WORSE_OPTIONS}
        selected={worse}
        onToggle={toggleWorse}
        otherEnabled={worseOtherOn}
        onOtherEnabledChange={(next) => { setWorseOtherOn(next); composeWorse(worse, next, worseOther); }}
        otherValue={worseOther}
        onOtherChange={(next) => { setWorseOther(next); composeWorse(worse, worseOtherOn, next); }}
        otherPlaceholder="Describe what else makes it worse"
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
        otherPlaceholder="Describe what else makes it better"
        otherAriaLabel="Other factor that makes it better"
      />
    </section>
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
  const [quality, setQuality] = useState<string[]>([]);
  const [describe, setDescribe] = useState("");
  const setCharacteristics = useSymptomField("characteristics");

  const compose = (chips: string[], description: string) =>
    setCharacteristics(joinParts([chips.map((value) => QUALITY_OPTIONS.get(value)).join(", "), description.trim()]));

  const toggle = (value: string) => {
    const next = quality.includes(value) ? quality.filter((item) => item !== value) : [...quality, value];
    setQuality(next);
    compose(next, describe);
  };

  return (
    <section aria-labelledby="pqrst-q-heading" className="space-y-3 border-t border-(--border-subtle) pt-6">
      <div>
        <BlockLabel id="pqrst-q-heading">What it feels like</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">Quality — optional, select all that apply</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...QUALITY_OPTIONS].map(([value, label]) => (
          <ChipButton key={value} selected={quality.includes(value)} onClick={() => toggle(value)}>
            {label}
          </ChipButton>
        ))}
      </div>
      <textarea
        value={describe}
        onChange={(event) => { setDescribe(event.target.value); compose(quality, event.target.value); }}
        rows={2}
        placeholder="Describe further, in your own words (optional)"
        aria-label="Describe the pain further"
        className={cn(COMPACT_INPUT, "block resize-y")}
      />
    </section>
  );
}

function RegionRadiation() {
  const [bodyPart, setBodyPart] = useState("");
  const [radiates, setRadiates] = useState<"no" | "yes" | undefined>(undefined);
  const [radiatesTo, setRadiatesTo] = useState("");
  const setLocation = useSymptomField("location");

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
    <section aria-labelledby="pqrst-r-heading" className="space-y-4 border-t border-(--border-subtle) pt-6">
      <div>
        <BlockLabel id="pqrst-r-heading">Where it is</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">Region &amp; radiation — optional</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="pain-body-part" className="block text-xs font-bold text-(--text-muted) uppercase">Where in the body?</label>
        <input
          id="pain-body-part"
          value={bodyPart}
          onChange={(event) => { setBodyPart(event.target.value); compose(event.target.value, radiates, radiatesTo); }}
          placeholder="e.g. Throat, right side"
          className={cn(COMPACT_INPUT, "min-h-11")}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-(--text-body)">Does it spread to other areas?</p>
        <SegmentedToggle
          label="Does the pain spread to other areas"
          value={radiates}
          onChange={(next) => { setRadiates(next); compose(bodyPart, next, radiatesTo); }}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ]}
        />
        <Reveal open={radiates === "yes"} className="-mt-2">
          <input
            value={radiatesTo}
            onChange={(event) => { setRadiatesTo(event.target.value); compose(bodyPart, radiates, event.target.value); }}
            placeholder="Where does it spread to?"
            aria-label="Where the pain spreads to"
            className={cn(COMPACT_INPUT, "mt-2 min-h-11")}
          />
        </Reveal>
      </div>
    </section>
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

  return (
    <section aria-labelledby="pqrst-s-heading" className="space-y-3 border-t border-(--border-subtle) pt-6">
      <div>
        <BlockLabel id="pqrst-s-heading">How intense, 0–10</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">Severity — optional</p>
      </div>
      <div role="radiogroup" aria-labelledby="pqrst-s-heading" className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={severity === value}
            onClick={() =>
              setValue(`${REVIEW}.painSeverity` as FieldPath<DynamicIntakeFormValues>, (severity === value ? undefined : value) as never, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            className={cn(
              "min-h-11 rounded-xl border text-sm font-bold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              severity === value
                ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--safe-fg)"
                : "border-(--border-default) bg-(--surface-canvas) text-(--text-body) hover:bg-(--gray-bg)",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-(--text-subtle)">
        <span>0 · No pain</span>
        <span>5 · Moderate</span>
        <span>10 · Worst possible</span>
      </div>
      {typeof severity === "number" ? (
        <p className="text-sm font-bold text-(--safe-fg)">{severity}/10 — {severityLabel(severity)}</p>
      ) : null}
    </section>
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

function Timing() {
  const [onset, setOnset] = useState<string | undefined>(undefined);
  const [when, setWhen] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string | undefined>(undefined);
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("minutes");
  const setOnsetField = useSymptomField("onset");
  const setPattern = useSymptomField("pattern");

  const composePattern = (nextFrequency: typeof frequency, nextWhen: string[], nextDurationValue: string, nextDurationUnit: DurationUnit) => {
    const whenText = nextWhen.map((value) => WHEN_OPTIONS.get(value)).join(" and ").toLowerCase();
    setPattern(
      joinParts([
        nextFrequency ? FREQUENCY_OPTIONS.get(nextFrequency) : undefined,
        whenText ? `worse ${whenText}` : undefined,
        nextDurationValue.trim() ? `about ${nextDurationValue.trim()} ${nextDurationUnit} each time` : undefined,
      ]),
    );
  };

  return (
    <section aria-labelledby="pqrst-t-heading" className="space-y-4 border-t border-(--border-subtle) pt-6">
      <div>
        <BlockLabel id="pqrst-t-heading">When and how often</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">Timing — optional</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-(--text-body)">When did it start?</p>
        <div className="flex flex-wrap gap-2">
          {[...ONSET_OPTIONS].map(([value, label]) => (
            <ChipButton
              key={value}
              selected={onset === value}
              onClick={() => {
                const next = onset === value ? undefined : value;
                setOnset(next);
                setOnsetField(next ? ONSET_OPTIONS.get(next) : undefined);
              }}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-(--text-body)">When does it usually flare up?</p>
        <div className="flex flex-wrap gap-2">
          {[...WHEN_OPTIONS].map(([value, label]) => (
            <ChipButton
              key={value}
              selected={when.includes(value)}
              onClick={() => {
                const next = when.includes(value) ? when.filter((item) => item !== value) : [...when, value];
                setWhen(next);
                composePattern(frequency, next, durationValue, durationUnit);
              }}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-(--text-body)">How often does it happen?</p>
        <div className="flex flex-wrap gap-2">
          {[...FREQUENCY_OPTIONS].map(([value, label]) => (
            <ChipButton
              key={value}
              selected={frequency === value}
              onClick={() => {
                const next = frequency === value ? undefined : value;
                setFrequency(next);
                composePattern(next, when, durationValue, durationUnit);
              }}
            >
              {label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-(--text-body)">How long does each episode last?</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={durationValue}
            onChange={(event) => { setDurationValue(event.target.value); composePattern(frequency, when, event.target.value, durationUnit); }}
            placeholder="e.g. 20"
            aria-label="Duration of each episode"
            className={cn(COMPACT_INPUT, "min-h-11 w-24")}
          />
          <div className="flex flex-wrap gap-2">
            {DURATION_UNITS.map((unit) => (
              <ChipButton
                key={unit}
                selected={durationUnit === unit}
                onClick={() => { setDurationUnit(unit); composePattern(frequency, when, durationValue, unit); }}
              >
                {unit}
              </ChipButton>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
