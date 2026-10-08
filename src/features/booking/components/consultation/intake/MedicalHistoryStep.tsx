"use client";

import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ChoiceCard, ConditionTile, FieldHint, Reveal } from "./IntakeChoice";

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

  // "Do you have any?" gate: the list only appears on Yes. "No" is the same
  // stored answer the old "No pre-existing medical conditions" tile wrote
  // (`noneReported: true`); an existing answer opens the matching branch.
  const [saidYes, setSaidYes] = useState(false);
  const answer = noneReported ? "no" : selected.length > 0 || saidYes ? "yes" : undefined;

  const choose = (next: "no" | "yes") => {
    if (next === "no") {
      setSaidYes(false);
      setNoneReported(true);
    } else {
      setSaidYes(true);
      if (noneReported) setValue(`${HISTORY}.noneReported`, false, opts);
    }
  };

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
        <BlockLabel id="conditions-heading">Do you have any known medical conditions?</BlockLabel>
        <FieldHint>Diagnoses a doctor has given you. This is not a diagnosis tool.</FieldHint>
      </div>

      <div role="radiogroup" aria-labelledby="conditions-heading" className="grid grid-cols-2 gap-2.5 sm:max-w-md">
        <ChoiceCard selected={answer === "no"} onClick={() => choose("no")} title="No" />
        <ChoiceCard selected={answer === "yes"} onClick={() => choose("yes")} title="Yes" />
      </div>

      <Reveal open={answer === "yes"}>
        <div className="space-y-3 pt-2">
          <p className="text-base font-medium text-(--text-body)">Tap all that apply</p>
          <div
            role="group"
            aria-label="Known conditions"
            className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {CONDITIONS.map(([value, label]) => (
              <ConditionTile
                key={value}
                selected={selected.includes(value)}
                onClick={() => toggle(value)}
                className={value === "other" ? "col-span-2 sm:col-span-3" : undefined}
              >
                {value === "other" ? "Other condition (please specify)" : label}
              </ConditionTile>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal open={selected.includes("other")} className="-mt-1">
        <Controller
          name={`${HISTORY}.other`}
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-1.5 pt-2">
              <label htmlFor="other-condition-input" className="block text-base font-medium text-(--text-body)">
                Other condition specification
              </label>
              <input
                {...field}
                id="other-condition-input"
                value={field.value ?? ""}
                aria-label="Other condition"
                aria-invalid={fieldState.invalid || undefined}
                placeholder="Specify any other diagnosed conditions..."
                className={COMPACT_INPUT}
              />
              {fieldState.error ? (
                <p role="alert" className="text-[15px] font-medium text-(--danger-fg)">{fieldState.error.message}</p>
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
    <section aria-labelledby="medications-heading" className="space-y-3 border-t border-(--border-subtle) pt-7">
      <div>
        <BlockLabel id="medications-heading">Current medications</BlockLabel>
        <FieldHint>Are you taking any maintenance medications or daily prescriptions?</FieldHint>
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
              <label htmlFor="medications-input" className="mb-1.5 block text-base font-medium text-(--text-body)">
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
    <section aria-labelledby="surgeries-heading" className="space-y-3 border-t border-(--border-subtle) pt-7">
      <div>
        <BlockLabel id="surgeries-heading">Prior surgeries / hospitalizations</BlockLabel>
        <FieldHint>Any hospitalizations or major surgeries in the past 2 years?</FieldHint>
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
              <label htmlFor="surgeries-input" className="mb-1.5 block text-base font-medium text-(--text-body)">
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
