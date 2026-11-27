"use client";

import { useId, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CONDITION_OPTIONS,
  conditionLabel,
  FAMILY_CONDITION_IDS,
  RELATIVE_OPTIONS,
  type ConditionGroup,
} from "@/features/consultation/lib/patientHistory/labels";
import { packYears } from "@/features/consultation/lib/patientHistory/model";
import type {
  AllergiesSection,
  DemographicsSection,
  FamilySection,
  MedicalSection,
  ObGynSection,
  Relative,
  SocialSection,
  SurgicalSection,
  TriState,
} from "@/features/consultation/lib/patientHistory/types";

/*
 * Section editors for the patient chart. Doctor surfaces: 48px controls below
 * lg (phone and tablet), 32px dense controls on a desktop, 16px text on a phone
 * so iOS never zooms. Every choice is a labelled button or checkbox; nothing
 * hides behind a picker.
 */

const INPUT =
  "h-12 w-full min-w-0 rounded-lg border border-(--border-default) bg-(--surface-card) px-3 text-base text-(--text-body) placeholder:text-(--text-subtle) outline-none transition-colors focus-visible:border-(--teal-700) focus-visible:ring-3 focus-visible:ring-(--focus-ring)/30 disabled:bg-(--surface-warm-soft) disabled:text-(--text-subtle) lg:h-8 lg:px-2.5 lg:text-sm";
const TEXTAREA = cn(INPUT, "h-auto min-h-20 py-2 lg:h-auto lg:min-h-16 lg:py-1.5");

export function FieldLabel({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid min-w-0 gap-1", className)}>
      <span className="text-sm font-semibold text-(--text-body) lg:text-xs">
        {label}
        {hint ? <span className="ml-1 font-normal text-(--text-muted)">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  disabled,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  inputMode?: "numeric" | "decimal";
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(inputMode ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)}
      className={cn(INPUT, className)}
    />
  );
}

function TextArea({ value, onChange, placeholder, disabled, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(TEXTAREA, "resize-y")}
    />
  );
}

/**
 * A short set of exclusive choices as pressed/unpressed buttons. Pressing the
 * chosen one again clears it, so "not asked" stays reachable.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T | "") => void;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1">
      <span id={id} className="text-sm font-semibold text-(--text-body) lg:text-xs">{label}</span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const pressed = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(pressed ? "" : option.value)}
              className={cn(
                "h-12 min-w-12 rounded-lg border px-3.5 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:h-8 lg:min-w-0 lg:px-2.5 lg:text-xs",
                pressed
                  ? "border-(--teal-750) bg-(--teal-750) text-white"
                  : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-warm-soft)",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const YES_NO: ReadonlyArray<{ value: Exclude<TriState, "">; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg px-1 text-base text-(--text-body) hover:bg-(--surface-warm-soft) lg:min-h-8 lg:text-sm">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} className="size-5 lg:size-4" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

const GRID = "grid gap-3 @md:grid-cols-2";

export function AllergiesEditor({ value, onChange }: { value: AllergiesSection; onChange: (v: AllergiesSection) => void }) {
  return (
    <div className="grid gap-3">
      <CheckRow
        checked={value.noneKnown}
        onChange={(noneKnown) => onChange({ ...value, noneKnown, drug: noneKnown ? "" : value.drug })}
      >
        No known allergies
      </CheckRow>
      <FieldLabel label="Drug / other allergies" hint="with the reaction">
        <TextArea
          value={value.drug}
          disabled={value.noneKnown}
          onChange={(drug) => onChange({ ...value, drug })}
          placeholder="e.g. Penicillin (hives), Shellfish (swelling)"
        />
      </FieldLabel>
      <Choice label="Allergic to latex?" value={value.latex} options={YES_NO} onChange={(latex) => onChange({ ...value, latex })} />
    </div>
  );
}

const SEX_CHOICES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Not disclosed" },
] as const;

const MARITAL_CHOICES = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Separated", label: "Separated" },
  { value: "Widowed", label: "Widowed" },
] as const;

export function DemographicsEditor({ value, onChange }: { value: DemographicsSection; onChange: (v: DemographicsSection) => void }) {
  const set = (patch: Partial<DemographicsSection>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className={GRID}>
        <FieldLabel label="Date of birth">
          <TextInput type="date" value={value.dateOfBirth} onChange={(dateOfBirth) => set({ dateOfBirth })} />
        </FieldLabel>
        <Choice label="Sex" value={value.sex} options={SEX_CHOICES} onChange={(sex) => set({ sex })} />
      </div>
      <FieldLabel label="Address">
        <TextInput value={value.address} onChange={(address) => set({ address })} placeholder="Barangay, city, province" />
      </FieldLabel>
      <div className={GRID}>
        <FieldLabel label="Nationality">
          <TextInput value={value.nationality} onChange={(nationality) => set({ nationality })} />
        </FieldLabel>
        <FieldLabel label="Occupation">
          <TextInput value={value.occupation} onChange={(occupation) => set({ occupation })} />
        </FieldLabel>
      </div>
      <Choice
        label="Marital status"
        value={(MARITAL_CHOICES.find((c) => c.value === value.maritalStatus)?.value ?? "") as (typeof MARITAL_CHOICES)[number]["value"] | ""}
        options={MARITAL_CHOICES}
        onChange={(maritalStatus) => set({ maritalStatus })}
      />
    </div>
  );
}

const GROUP_ORDER: ConditionGroup[] = ["Heart & blood", "Lungs", "Metabolic", "Organs", "Infection", "Bones & joints", "Other"];

export function MedicalEditor({ value, onChange }: { value: MedicalSection; onChange: (v: MedicalSection) => void }) {
  const set = (patch: Partial<MedicalSection>) => onChange({ ...value, ...patch });
  const toggle = (id: string, on: boolean) =>
    set({
      conditions: on ? [...value.conditions, id] : value.conditions.filter((c) => c !== id),
      noneReported: on ? false : value.noneReported,
    });
  return (
    <div className="grid gap-4">
      <CheckRow
        checked={value.noneReported}
        onChange={(noneReported) => set({ noneReported, conditions: noneReported ? [] : value.conditions })}
      >
        No past illnesses or conditions
      </CheckRow>
      <fieldset disabled={value.noneReported} className="grid gap-3 disabled:opacity-60">
        <legend className="sr-only">Conditions the patient has had</legend>
        {GROUP_ORDER.map((group) => (
          <div key={group} className="grid gap-0.5">
            <p className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">{group}</p>
            <div className="grid @sm:grid-cols-2 @xl:grid-cols-3">
              {CONDITION_OPTIONS.filter((o) => o.group === group).map((option) => (
                <CheckRow key={option.id} checked={value.conditions.includes(option.id)} onChange={(on) => toggle(option.id, on)}>
                  {option.label}
                </CheckRow>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      {value.conditions.includes("cancer") ? (
        <FieldLabel label="Cancer type">
          <TextInput value={value.cancerType} onChange={(cancerType) => set({ cancerType })} />
        </FieldLabel>
      ) : null}
      <FieldLabel label="Other conditions">
        <TextInput value={value.other} onChange={(other) => set({ other })} />
      </FieldLabel>
      <FieldLabel label="Maintenance medicines" hint="name, dose, frequency">
        <TextArea value={value.maintenanceMeds} onChange={(maintenanceMeds) => set({ maintenanceMeds })} placeholder="e.g. Losartan 50 mg once a day" />
      </FieldLabel>
      <FieldLabel label="Serious injuries / illnesses">
        <TextArea value={value.seriousIllness} onChange={(seriousIllness) => set({ seriousIllness })} />
      </FieldLabel>
    </div>
  );
}

export function SurgicalEditor({ value, onChange }: { value: SurgicalSection; onChange: (v: SurgicalSection) => void }) {
  const update = (id: string, patch: Partial<SurgicalSection["entries"][number]>) =>
    onChange({ ...value, entries: value.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const add = () =>
    onChange({
      noneReported: false,
      entries: [...value.entries, { id: `s${Date.now().toString(36)}`, procedure: "", year: "", complication: "" }],
    });
  return (
    <div className="grid gap-3">
      <CheckRow checked={value.noneReported} onChange={(noneReported) => onChange({ noneReported, entries: noneReported ? [] : value.entries })}>
        No operations
      </CheckRow>
      {value.entries.map((entry, index) => (
        <div key={entry.id} className="grid gap-2 rounded-lg border border-(--border-subtle) p-2.5 @md:grid-cols-[minmax(0,2fr)_5.5rem_minmax(0,2fr)_auto] @md:items-end">
          <FieldLabel label={`Operation ${index + 1}`}>
            <TextInput value={entry.procedure} onChange={(procedure) => update(entry.id, { procedure })} placeholder="Procedure" />
          </FieldLabel>
          <FieldLabel label="Year">
            <TextInput value={entry.year} inputMode="numeric" onChange={(year) => update(entry.id, { year: year.slice(0, 4) })} placeholder="YYYY" />
          </FieldLabel>
          <FieldLabel label="Complication">
            <TextInput value={entry.complication} onChange={(complication) => update(entry.id, { complication })} placeholder="None" />
          </FieldLabel>
          <Button
            type="button"
            variant="ghost"
            className="h-12 justify-self-start text-(--danger-fg) lg:h-8"
            onClick={() => onChange({ ...value, entries: value.entries.filter((e) => e.id !== entry.id) })}
            aria-label={`Remove operation ${index + 1}`}
          >
            <Trash2 aria-hidden />
            <span className="@md:sr-only">Remove</span>
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="h-12 justify-self-start lg:h-8" onClick={add}>
        <Plus aria-hidden /> Add operation
      </Button>
    </div>
  );
}

export function FamilyEditor({ value, onChange }: { value: FamilySection; onChange: (v: FamilySection) => void }) {
  const toggle = (condition: string, relative: Relative) => {
    const current = value.conditions[condition] ?? [];
    const next = current.includes(relative) ? current.filter((r) => r !== relative) : [...current, relative];
    const conditions = { ...value.conditions };
    if (next.length > 0) conditions[condition] = next;
    else delete conditions[condition];
    onChange({ ...value, conditions, noneReported: false });
  };
  return (
    <div className="grid gap-3">
      <CheckRow checked={value.noneReported} onChange={(noneReported) => onChange({ ...value, noneReported, conditions: noneReported ? {} : value.conditions })}>
        No known family history
      </CheckRow>
      <p className="text-sm text-(--text-muted) lg:text-xs">Tap each relative who has had the condition.</p>
      <ul className="grid divide-y divide-(--border-subtle) rounded-lg border border-(--border-subtle)">
        {FAMILY_CONDITION_IDS.map((condition) => {
          const relatives = value.conditions[condition] ?? [];
          return (
            <li key={condition} className="grid gap-1.5 px-2.5 py-2 @lg:grid-cols-[10rem_1fr] @lg:items-center">
              <span className={cn("text-base lg:text-sm", relatives.length ? "font-semibold text-(--text-heading)" : "text-(--text-body)")}>
                {conditionLabel(condition)}
              </span>
              <div role="group" aria-label={`${conditionLabel(condition)}: relatives`} className="flex flex-wrap gap-1">
                {RELATIVE_OPTIONS.map((relative) => {
                  const pressed = relatives.includes(relative.id);
                  return (
                    <button
                      key={relative.id}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => toggle(condition, relative.id)}
                      className={cn(
                        "h-12 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:h-7 lg:px-2 lg:text-xs",
                        pressed
                          ? "border-(--teal-750) bg-(--teal-750) text-white"
                          : "border-(--border-default) bg-(--surface-card) text-(--text-muted) hover:text-(--text-body)",
                      )}
                    >
                      {relative.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <FieldLabel label="Other family history">
        <TextInput value={value.other} onChange={(other) => onChange({ ...value, other })} />
      </FieldLabel>
    </div>
  );
}

export function ObGynEditor({ value, onChange }: { value: ObGynSection; onChange: (v: ObGynSection) => void }) {
  const set = (patch: Partial<ObGynSection>) => onChange({ ...value, ...patch });
  const counts: Array<{ key: "gravida" | "term" | "preterm" | "abortion" | "living"; label: string; full: string }> = [
    { key: "gravida", label: "G", full: "Gravida (pregnancies)" },
    { key: "term", label: "T", full: "Term births" },
    { key: "preterm", label: "P", full: "Preterm births" },
    { key: "abortion", label: "A", full: "Abortions / miscarriages" },
    { key: "living", label: "L", full: "Living children" },
  ];
  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm font-semibold text-(--text-body) lg:text-xs">Gravida and parity (TPAL)</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {counts.map((count) => (
            <label key={count.key} className="grid gap-0.5 text-center">
              <span className="text-xs font-bold text-(--text-muted)" aria-hidden>{count.label}</span>
              <TextInput
                value={value[count.key]}
                inputMode="numeric"
                aria-label={count.full}
                onChange={(v) => set({ [count.key]: v.slice(0, 2) } as Partial<ObGynSection>)}
                className="px-1 text-center tabular-nums lg:px-1"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <div className={GRID}>
        <FieldLabel label="Last menstrual period" hint="first day">
          <TextInput type="date" value={value.lastMenstrualPeriod} onChange={(lastMenstrualPeriod) => set({ lastMenstrualPeriod })} />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <FieldLabel label="Interval" hint="days">
            <TextInput value={value.intervalDays} inputMode="numeric" onChange={(intervalDays) => set({ intervalDays: intervalDays.slice(0, 3) })} placeholder="28" />
          </FieldLabel>
          <FieldLabel label="Duration" hint="days">
            <TextInput value={value.durationDays} inputMode="numeric" onChange={(durationDays) => set({ durationDays: durationDays.slice(0, 2) })} placeholder="5" />
          </FieldLabel>
        </div>
      </div>
      <FieldLabel label="Contraceptive use">
        <TextInput value={value.contraception} onChange={(contraception) => set({ contraception })} placeholder="e.g. None, pills, IUD, implant" />
      </FieldLabel>
    </div>
  );
}

const TOBACCO = [
  { value: "never", label: "Never" },
  { value: "former", label: "Former" },
  { value: "current", label: "Current" },
] as const;
const ALCOHOL = [
  { value: "none", label: "None" },
  { value: "occasional", label: "Occasional" },
  { value: "daily", label: "Daily" },
] as const;

export function SocialEditor({ value, onChange }: { value: SocialSection; onChange: (v: SocialSection) => void }) {
  const set = (patch: Partial<SocialSection>) => onChange({ ...value, ...patch });
  const smoker = value.tobacco === "former" || value.tobacco === "current";
  const py = packYears(value.packsPerDay, value.tobaccoYears);
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Choice label="Tobacco" value={value.tobacco} options={TOBACCO} onChange={(tobacco) => set({ tobacco })} />
        {smoker ? (
          <div className="grid grid-cols-[1fr_1fr] items-end gap-2 @md:grid-cols-[8rem_8rem_1fr]">
            <FieldLabel label="Packs per day">
              <TextInput value={value.packsPerDay} inputMode="decimal" onChange={(packsPerDay) => set({ packsPerDay: packsPerDay.slice(0, 4) })} placeholder="1" />
            </FieldLabel>
            <FieldLabel label="Years smoked">
              <TextInput value={value.tobaccoYears} inputMode="numeric" onChange={(tobaccoYears) => set({ tobaccoYears: tobaccoYears.slice(0, 2) })} placeholder="10" />
            </FieldLabel>
            <p className="col-span-2 text-sm text-(--text-body) @md:col-span-1 @md:pb-1.5" aria-live="polite">
              {py !== undefined ? (
                <>
                  <span className="font-bold tabular-nums text-(--text-heading)">{py}</span> pack-years
                </>
              ) : (
                <span className="text-(--text-muted)">Pack-years appear when both are filled.</span>
              )}
            </p>
          </div>
        ) : null}
      </div>
      <Choice label="Alcohol" value={value.alcohol} options={ALCOHOL} onChange={(alcohol) => set({ alcohol })} />
      <FieldLabel label="Other substance use">
        <TextInput value={value.substances} onChange={(substances) => set({ substances })} placeholder="None" />
      </FieldLabel>
      <div className="grid gap-2">
        <Choice label="Sexually active" value={value.sexuallyActive} options={YES_NO} onChange={(sexuallyActive) => set({ sexuallyActive })} />
        {value.sexuallyActive === "yes" ? (
          <div className={GRID}>
            <FieldLabel label="Number of partners">
              <TextInput value={value.partners} inputMode="numeric" onChange={(partners) => set({ partners: partners.slice(0, 3) })} />
            </FieldLabel>
            <FieldLabel label="Contraception">
              <TextInput value={value.sexualContraception} onChange={(sexualContraception) => set({ sexualContraception })} placeholder="e.g. Condoms" />
            </FieldLabel>
          </div>
        ) : null}
      </div>
      <Choice label="Lives alone" value={value.livesAlone} options={YES_NO} onChange={(livesAlone) => set({ livesAlone })} />
    </div>
  );
}
