"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ChipButton, Reveal, SegmentedToggle } from "./IntakeChoice";

/**
 * Labels stay faithful to the contract enum: `diabetes` is not narrowed to
 * "Type 2" and `asthma` does not absorb COPD, because the doctor reads the
 * stored value, not this label.
 */
const CONDITIONS = [
  ["hypertension", "Hypertension"],
  ["diabetes", "Diabetes"],
  ["asthma", "Asthma"],
  ["heart_disease", "Heart disease"],
  ["stroke", "Stroke"],
  ["kidney_disease", "Kidney disease"],
  ["liver_disease", "Liver disease"],
  ["cancer", "Cancer"],
  ["thyroid_disorder", "Thyroid disorder"],
  ["seizure_disorder", "Seizure / Epilepsy"],
  ["bleeding_disorder", "Bleeding disorder"],
  ["mental_health_condition", "Mental health condition"],
  ["other", "Other"],
] as const;

type KnownCondition = (typeof CONDITIONS)[number][0];

const CONDITION_LABELS = new Map<string, string>(CONDITIONS);

export function conditionLabel(condition: string): string {
  return CONDITION_LABELS.get(condition) ?? condition;
}

const HISTORY = "personalDetails.structuredMedicalHistory" as const;

export function MedicalHistoryStep() {
  return (
    <div className="space-y-8">
      <KnownConditions />
      <MedicationsToggle />
      <SurgeriesToggle />
    </div>
  );
}

function KnownConditions() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const history = useWatch({ control, name: HISTORY });
  const selected = history?.knownConditions ?? [];
  const noneReported = history?.noneReported ?? false;
  const opts = { shouldDirty: true, shouldValidate: true } as const;

  const setNoneReported = (active: boolean) => {
    setValue(`${HISTORY}.noneReported`, active, opts);
    if (active) {
      setValue(`${HISTORY}.knownConditions`, [], opts);
      setValue(`${HISTORY}.other`, "", opts);
    }
  };

  const toggle = (condition: KnownCondition) => {
    const active = selected.includes(condition);
    setValue(
      `${HISTORY}.knownConditions`,
      active ? selected.filter((item) => item !== condition) : [...selected, condition],
      opts,
    );
    if (active && condition === "other") setValue(`${HISTORY}.other`, "", opts);
  };

  return (
    <section aria-labelledby="conditions-heading" className="space-y-3">
      <div>
        <BlockLabel id="conditions-heading">Known conditions</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">
          Select any diagnoses a doctor has given you. This is not a diagnosis tool.
        </p>
      </div>

      <button
        type="button"
        aria-pressed={noneReported}
        onClick={() => setNoneReported(!noneReported)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-4 text-left text-sm transition-colors sm:w-auto",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
          noneReported
            ? "border-(--surface-nav-accent) bg-(--safe-bg) font-bold text-(--safe-fg)"
            : "border-(--border-default) bg-(--surface-card) font-medium text-(--text-body) hover:bg-(--surface-canvas)",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-5 items-center justify-center rounded-md border text-[11px]",
            noneReported
              ? "border-transparent bg-(--surface-nav-accent) text-(--text-inverse)"
              : "border-(--border-strong)",
          )}
        >
          {noneReported ? <Check className="size-3.5" /> : null}
        </span>
        No pre-existing medical conditions
      </button>

      <div
        role="group"
        aria-labelledby="conditions-heading"
        aria-disabled={noneReported || undefined}
        className="flex flex-wrap gap-2"
      >
        {CONDITIONS.map(([value, label]) => (
          <ChipButton
            key={value}
            selected={selected.includes(value)}
            disabled={noneReported}
            onClick={() => toggle(value)}
          >
            {label}
          </ChipButton>
        ))}
      </div>

      <Reveal open={selected.includes("other")} className="-mt-3">
        <Controller
          name={`${HISTORY}.other`}
          control={control}
          render={({ field, fieldState }) => (
            <div className="pt-3">
              <input
                {...field}
                value={field.value ?? ""}
                aria-label="Other condition"
                aria-invalid={fieldState.invalid || undefined}
                placeholder="Specify any other diagnosed conditions..."
                className={cn(COMPACT_INPUT, "min-h-11")}
              />
              {fieldState.error ? (
                <p className="mt-1 text-xs text-(--danger-fg)">{fieldState.error.message}</p>
              ) : null}
            </div>
          )}
        />
      </Reveal>
    </section>
  );
}

function MedicationsToggle() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const medications = useWatch({ control, name: `${HISTORY}.currentMedications` });
  const [choice, setChoice] = useState<"no" | "yes" | undefined>(
    medications?.trim() ? "yes" : undefined,
  );

  const change = (next: "no" | "yes") => {
    setChoice(next);
    if (next === "no") setValue(`${HISTORY}.currentMedications`, "", { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section aria-labelledby="medications-heading" className="space-y-3 border-t border-(--border-subtle) pt-6">
      <BlockLabel id="medications-heading">Current medications</BlockLabel>
      <SegmentedToggle
        label="Current medications"
        value={choice}
        onChange={change}
        options={[
          { value: "no", label: "Not taking maintenance meds" },
          { value: "yes", label: "Taking maintenance medications" },
        ]}
      />
      <Reveal open={choice === "yes"} className="-mt-3">
        <Controller
          name={`${HISTORY}.currentMedications`}
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              value={field.value ?? ""}
              rows={2}
              aria-label="Drug name and dose"
              placeholder="Drug name & dose (e.g. Amlodipine 5mg 1x daily)"
              className={cn(COMPACT_INPUT, "mt-3 block resize-y")}
            />
          )}
        />
      </Reveal>
    </section>
  );
}

function SurgeriesToggle() {
  const { control, setValue } = useFormContext<DynamicIntakeFormValues>();
  const details = useWatch({ control, name: `${HISTORY}.details` });
  const [choice, setChoice] = useState<"no" | "yes" | undefined>(
    details?.trim() ? "yes" : undefined,
  );

  const change = (next: "no" | "yes") => {
    setChoice(next);
    if (next === "no") setValue(`${HISTORY}.details`, "", { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section aria-labelledby="surgeries-heading" className="space-y-3 border-t border-(--border-subtle) pt-6">
      <div>
        <BlockLabel id="surgeries-heading">Prior surgeries / hospitalizations</BlockLabel>
        <p className="mt-1 text-xs text-(--text-muted)">
          Any hospitalizations or major surgeries in the past 2 years?
        </p>
      </div>
      <SegmentedToggle
        label="Hospitalizations or major surgeries in the past 2 years"
        value={choice}
        onChange={change}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
      />
      <Reveal open={choice === "yes"} className="-mt-3">
        <Controller
          name={`${HISTORY}.details`}
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              value={field.value ?? ""}
              rows={2}
              aria-label="Surgery or hospitalization details"
              placeholder="What, when, and where (e.g. Appendectomy, March 2025, PGH)"
              className={cn(COMPACT_INPUT, "mt-3 block resize-y")}
            />
          )}
        />
      </Reveal>
    </section>
  );
}
