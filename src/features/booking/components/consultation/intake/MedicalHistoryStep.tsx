"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ChoiceCard, ConditionTile, Reveal } from "./IntakeChoice";

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
    <div className="space-y-6 sm:space-y-7">
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
    const nextSelected = active
      ? selected.filter((item) => item !== condition)
      : [...selected, condition];
    setValue(`${HISTORY}.knownConditions`, nextSelected, opts);
    if (noneReported && nextSelected.length > 0) {
      setValue(`${HISTORY}.noneReported`, false, opts);
    }
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
          "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all sm:text-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
          noneReported
            ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--safe-fg) shadow-xs ring-1 ring-(--surface-nav-accent)"
            : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] transition-colors",
            noneReported
              ? "border-transparent bg-(--surface-nav-accent) text-white"
              : "border-(--border-strong) bg-(--surface-canvas)",
          )}
        >
          {noneReported ? <Check className="size-3.5 stroke-[2.5]" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block font-bold">No pre-existing medical conditions</span>
          <span className="block text-[11px] font-normal text-(--text-muted)">
            I have not been diagnosed with any chronic or long-term conditions
          </span>
        </div>
      </button>

      <div
        role="group"
        aria-labelledby="conditions-heading"
        aria-disabled={noneReported || undefined}
        className={cn(
          "grid grid-cols-2 gap-2 transition-opacity sm:grid-cols-3",
          noneReported && "pointer-events-none opacity-40",
        )}
      >
        {CONDITIONS.map(([value, label]) => {
          const isOther = value === "other";
          return (
            <ConditionTile
              key={value}
              selected={selected.includes(value)}
              disabled={noneReported}
              onClick={() => toggle(value)}
              className={isOther ? "col-span-2 sm:col-span-3" : undefined}
            >
              {isOther ? "Other condition (please specify)" : label}
            </ConditionTile>
          );
        })}
      </div>

      <Reveal open={selected.includes("other")} className="-mt-1">
        <Controller
          name={`${HISTORY}.other`}
          control={control}
          render={({ field, fieldState }) => (
            <div className="pt-2">
              <label htmlFor="other-condition-input" className="mb-1 block text-[11px] font-semibold text-(--text-muted) uppercase">
                Other condition specification
              </label>
              <input
                {...field}
                id="other-condition-input"
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
    <section aria-labelledby="medications-heading" className="space-y-2.5 border-t border-(--border-subtle) pt-5">
      <div>
        <BlockLabel id="medications-heading">Current medications</BlockLabel>
        <p className="mt-0.5 text-xs text-(--text-muted)">
          Are you taking any maintenance medications or daily prescriptions?
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="medications-heading"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        <ChoiceCard
          selected={choice === "no"}
          onClick={() => change("no")}
          title="Not taking maintenance meds"
          description="No regular daily prescription medications"
        />
        <ChoiceCard
          selected={choice === "yes"}
          onClick={() => change("yes")}
          title="Taking maintenance medications"
          description="Taking daily or ongoing prescription medications"
        />
      </div>

      <Reveal open={choice === "yes"} className="-mt-1">
        <Controller
          name={`${HISTORY}.currentMedications`}
          control={control}
          render={({ field }) => (
            <div className="pt-2">
              <label htmlFor="medications-input" className="mb-1 block text-[11px] font-semibold text-(--text-muted) uppercase">
                Medication name and daily dose
              </label>
              <textarea
                {...field}
                id="medications-input"
                value={field.value ?? ""}
                rows={2}
                aria-label="Drug name and dose"
                placeholder="e.g. Amlodipine 5mg once daily, Metformin 500mg"
                className={cn(COMPACT_INPUT, "block resize-y")}
              />
            </div>
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
    <section aria-labelledby="surgeries-heading" className="space-y-2.5 border-t border-(--border-subtle) pt-5">
      <div>
        <BlockLabel id="surgeries-heading">Prior surgeries / hospitalizations</BlockLabel>
        <p className="mt-0.5 text-xs text-(--text-muted)">
          Any hospitalizations or major surgeries in the past 2 years?
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="surgeries-heading"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        <ChoiceCard
          selected={choice === "no"}
          onClick={() => change("no")}
          title="No prior surgeries"
          description="No surgeries or hospital admissions in last 2 years"
        />
        <ChoiceCard
          selected={choice === "yes"}
          onClick={() => change("yes")}
          title="Yes, had surgery / hospitalization"
          description="Underwent an operation or admitted to hospital"
        />
      </div>

      <Reveal open={choice === "yes"} className="-mt-1">
        <Controller
          name={`${HISTORY}.details`}
          control={control}
          render={({ field }) => (
            <div className="pt-2">
              <label htmlFor="surgeries-input" className="mb-1 block text-[11px] font-semibold text-(--text-muted) uppercase">
                Procedure details and hospital
              </label>
              <textarea
                {...field}
                id="surgeries-input"
                value={field.value ?? ""}
                rows={2}
                aria-label="Surgery or hospitalization details"
                placeholder="e.g. Appendectomy, March 2025, PGH"
                className={cn(COMPACT_INPUT, "block resize-y")}
              />
            </div>
          )}
        />
      </Reveal>
    </section>
  );
}
