"use client";

import { format, isValid, parse } from "date-fns";
import { ChevronDown, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { cn } from "@/lib/utils";

import { BlockLabel, COMPACT_INPUT, ChipButton, ChoiceCard, FieldError, FieldHint, Reveal } from "./IntakeChoice";

/**
 * The booking-mode "About you" fields: the original questions, labels and
 * options, presented for patients who may be older or unused to phone forms.
 *
 * - every choice is on the page instead of in a bottom sheet or popover;
 * - date of birth is three plain boxes (day / month / year) instead of a
 *   calendar that has to be paged back decades.
 *
 * Every control writes the same `personalDetails.*` values, in the same shapes,
 * as the pickers it replaces — no schema or contract change.
 */

const P = "personalDetails" as const;

const SEX_OPTIONS = [
  ["male", "Male"],
  ["female", "Female"],
  ["prefer not to say", "Prefer not to say"],
] as const;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const ALLERGY_PRESETS = ["Penicillin", "Sulfa Drugs", "Aspirin", "Latex", "Peanuts", "Shellfish", "Tree Nuts", "Pollen"].map(
  (allergen) => [allergen, allergen] as const,
);

const DIET_PRESETS = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["gluten-free", "Gluten Free"],
  ["dairy-free", "Dairy Free"],
  ["keto", "Keto"],
  ["halal", "Halal"],
  ["kosher", "Kosher"],
  ["low-sodium", "Low Sodium"],
  ["diabetic", "Diabetic"],
  ["low-fat", "Low Fat"],
] as const;

export function AboutYouFields() {
  const { control } = useFormContext();

  return (
    <section aria-labelledby="personal-details-heading" className="space-y-7">
      <h2 id="personal-details-heading" className="text-[17px] font-semibold text-(--text-heading) sm:text-lg">
        Personal Details &amp; Vitals
      </h2>

      <Controller
        name={`${P}.dateOfBirth`}
        control={control}
        render={({ field, fieldState }) => (
          <DateOfBirthInput value={field.value ?? ""} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />

      <Controller
        name={`${P}.genderAtBirth`}
        control={control}
        render={({ field }) => (
          <fieldset className="space-y-2.5">
            <legend className="contents">
              <BlockLabel id="sex-at-birth-heading">Sex at birth</BlockLabel>
            </legend>
            <div role="radiogroup" aria-labelledby="sex-at-birth-heading" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {SEX_OPTIONS.map(([value, label]) => (
                <ChoiceCard
                  key={value}
                  selected={field.value?.toLowerCase() === value}
                  onClick={() => field.onChange(value)}
                  title={label}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <MeasurementInput name="weight" label="Weight" unit="kg" placeholder="e.g., 70" step="0.1" />
        <MeasurementInput name="height" label="Height" unit="cm" placeholder="e.g., 175" />
      </div>

      <Controller
        name={`${P}.bloodType`}
        control={control}
        render={({ field }) => (
          <div className="space-y-2.5">
            <BlockLabel id="blood-type-heading">Blood type</BlockLabel>
            <div role="radiogroup" aria-labelledby="blood-type-heading" className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={field.value === type}
                  onClick={() => field.onChange(field.value === type ? "" : type)}
                  className={cn(
                    "min-h-12 rounded-xl border text-lg font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                    field.value === type
                      ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
                      : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      />

      <Controller
        name={`${P}.allergens`}
        control={control}
        render={({ field }) => (
          <InlineMultiSelect
            label="Allergies & Intolerances"
            value={Array.isArray(field.value) ? field.value : []}
            onChange={field.onChange}
            presets={ALLERGY_PRESETS}
            noneLabel="None — I have no known allergies"
            addLabel="Add an allergen"
            addPlaceholder="Type an allergen"
            // Blank is "not answered", which is clinically different from an
            // asserted "None" — so it prompts instead of claiming no allergies.
            emptyHint='Not answered yet. Select an allergen, or pick "None" if there are none.'
          />
        )}
      />

      <Controller
        name={`${P}.diet`}
        control={control}
        render={({ field }) => (
          <InlineMultiSelect
            label="Dietary Preferences & Restrictions"
            value={Array.isArray(field.value) ? field.value : []}
            onChange={field.onChange}
            presets={DIET_PRESETS}
            noneLabel="None — I have no dietary restrictions"
            addLabel="Add a preference"
            addPlaceholder="Type a preference"
            collapsible
          />
        )}
      />
    </section>
  );
}

const DATE_FORMAT = "yyyy-MM-dd";

function splitDate(value: string): [string, string, string] {
  const parsed = parse(value, DATE_FORMAT, new Date());
  if (!value || !isValid(parsed)) return ["", "", ""];
  return [String(parsed.getDate()), String(parsed.getMonth() + 1), String(parsed.getFullYear())];
}

/**
 * GOV.UK-style memorable-date input. Writes `yyyy-MM-dd` only once day, month
 * and year form a real past date; anything partial or impossible stays "" so
 * the schema's own "Date of birth is required" still guards the step.
 */
function DateOfBirthInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  const [parts, setParts] = useState<[string, string, string]>(() => splitDate(value));
  const [lastValue, setLastValue] = useState(value);

  // A value written from outside (profile prefill, server draft) replaces the boxes.
  if (value !== lastValue) {
    setLastValue(value);
    if (value) setParts(splitDate(value));
  }

  const [day, month, year] = parts;
  const allFilled = day !== "" && month !== "" && year.length === 4;
  const candidate = allFilled
    ? parse(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`, DATE_FORMAT, new Date())
    : null;
  const impossible =
    allFilled && (!candidate || !isValid(candidate) || candidate > new Date() || Number(year) < 1900);

  const update = (index: 0 | 1 | 2, next: string) => {
    const digits = next.replace(/\D/g, "").slice(0, index === 2 ? 4 : 2);
    const nextParts = [...parts] as [string, string, string];
    nextParts[index] = digits;
    setParts(nextParts);
    const [d, m, y] = nextParts;
    const date = d && m && y.length === 4 ? parse(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, DATE_FORMAT, new Date()) : null;
    const composed = date && isValid(date) && date <= new Date() && Number(y) >= 1900 ? format(date, DATE_FORMAT) : "";
    setLastValue(composed);
    onChange(composed);
  };

  const message = impossible ? "Enter a real date of birth, for example 27 3 1958." : error;
  const boxes = [
    { label: "Day", width: "w-18", autoComplete: "bday-day", max: 2 },
    { label: "Month", width: "w-18", autoComplete: "bday-month", max: 2 },
    { label: "Year", width: "w-26", autoComplete: "bday-year", max: 4 },
  ] as const;

  return (
    <fieldset aria-describedby={`${id}-hint`} className="space-y-2.5">
      <legend className="contents">
        <BlockLabel>Date of Birth</BlockLabel>
      </legend>
      <FieldHint id={`${id}-hint`} className="mt-0">For example, 27 3 1958</FieldHint>
      <div className="flex items-end gap-3">
        {boxes.map((box, index) => (
          <div key={box.label} className="space-y-1">
            <label htmlFor={`${id}-${box.label}`} className="block text-[15px] font-medium text-(--text-body)">
              {box.label}
            </label>
            <input
              id={`${id}-${box.label}`}
              inputMode="numeric"
              autoComplete={box.autoComplete}
              maxLength={box.max}
              value={parts[index]}
              onChange={(event) => update(index as 0 | 1 | 2, event.target.value)}
              aria-invalid={Boolean(message) || undefined}
              className={cn(COMPACT_INPUT, box.width, "text-center text-lg font-semibold tabular-nums")}
            />
          </div>
        ))}
      </div>
      <FieldError>{message}</FieldError>
    </fieldset>
  );
}

function MeasurementInput({
  name,
  label,
  unit,
  placeholder,
  step,
}: {
  name: "height" | "weight";
  label: string;
  unit: string;
  placeholder: string;
  step?: string;
}) {
  const { control } = useFormContext();
  const id = `about-you-${name}`;
  return (
    <Controller
      name={`${P}.${name}`}
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <BlockLabel htmlFor={id}>{`${label} (${unit})`}</BlockLabel>
          <div className="relative">
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step={step}
              placeholder={placeholder}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid || undefined}
              className={cn(
                COMPACT_INPUT,
                "pr-12 text-lg font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              )}
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-base font-medium text-(--text-muted)">
              {unit}
            </span>
          </div>
          <FieldError>{fieldState.error?.message}</FieldError>
        </div>
      )}
    />
  );
}

/**
 * The original allergy / diet multi-select, laid out on the page instead of in
 * a popover or bottom sheet. Same value contract as `MultiSelectDropdown`:
 * `[NONE_OPTION]` is the asserted "none" (mutually exclusive with everything
 * else), an empty array is "not answered", and typed entries join the array
 * title-cased.
 */
function InlineMultiSelect({
  label,
  value,
  onChange,
  presets,
  noneLabel,
  addLabel,
  addPlaceholder,
  emptyHint,
  collapsible = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  presets: readonly (readonly [string, string])[];
  noneLabel: string;
  addLabel: string;
  addPlaceholder: string;
  emptyHint?: string;
  /**
   * Same question and answers, with the options behind a "Show options"
   * button — for lists that are long and rarely change the consult (diet).
   * Opens on its own when an answer is already there.
   */
  collapsible?: boolean;
}) {
  const id = useId();
  const [other, setOther] = useState("");
  const [open, setOpen] = useState(!collapsible || value.length > 0);
  const isNone = value.includes(NONE_OPTION);
  const named = value.filter((item) => item !== NONE_OPTION);
  const presetValues = new Set(presets.map(([preset]) => preset));
  const custom = named.filter((item) => !presetValues.has(item));

  const toggle = (item: string) =>
    onChange(named.includes(item) ? named.filter((entry) => entry !== item) : [...named, item]);

  const addOther = () => {
    const trimmed = other.trim();
    setOther("");
    if (!trimmed) return;
    if (trimmed.toLowerCase() === NONE_OPTION.toLowerCase()) {
      onChange([NONE_OPTION]);
      return;
    }
    if (named.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...named, trimmed.charAt(0).toUpperCase() + trimmed.slice(1)]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BlockLabel id={`${id}-label`}>{label}</BlockLabel>
          {emptyHint && value.length === 0 ? <FieldHint>{emptyHint}</FieldHint> : null}
        </div>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            onClick={() => setOpen(!open)}
            className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-lg px-2 text-base font-semibold text-(--text-link) hover:bg-(--surface-canvas) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {open ? "Hide options" : "Show options"}
            <ChevronDown aria-hidden className={cn("size-4.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </button>
        ) : null}
      </div>

      <Reveal open={open}>
        <div id={`${id}-options`} className="space-y-3">
          <ChipButton
            selected={isNone}
            onClick={() => onChange(isNone ? [] : [NONE_OPTION])}
            className="w-full justify-start text-left"
          >
            {noneLabel}
          </ChipButton>

          <div role="group" aria-labelledby={`${id}-label`} className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3">
            {presets.map(([preset, presetLabel]) => (
              <ChipButton
                key={preset}
                selected={named.includes(preset)}
                onClick={() => toggle(preset)}
                className="w-full justify-start text-left leading-snug"
              >
                {presetLabel}
              </ChipButton>
            ))}
            {custom.map((item) => (
              <ChipButton
                key={item}
                selected
                onClick={() => toggle(item)}
                aria-label={`Remove ${item}`}
                className="w-full justify-start text-left leading-snug"
              >
                <span className="min-w-0 flex-1 truncate">{item}</span>
                <X aria-hidden className="size-4 shrink-0" />
              </ChipButton>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${id}-other`} className="block text-[15px] font-medium text-(--text-body)">
              {addLabel}
            </label>
            <div className="flex gap-2">
              <input
                id={`${id}-other`}
                value={other}
                onChange={(event) => setOther(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOther();
                  }
                }}
                placeholder={addPlaceholder}
                className={cn(COMPACT_INPUT, "min-w-0 flex-1")}
              />
              <button
                type="button"
                onClick={addOther}
                disabled={!other.trim()}
                className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-(--border-default) bg-(--surface-card) px-4 text-base font-semibold text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus aria-hidden className="size-4.5" /> Add
              </button>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
