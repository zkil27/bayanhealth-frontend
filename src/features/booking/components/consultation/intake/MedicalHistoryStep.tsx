"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { BlockLabel, COMPACT_INPUT, ConditionTile, FieldHint, Reveal, SegmentedToggle } from "./IntakeChoice";
import { useIntakeUiState } from "./intakeUiState";

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

/**
 * Every yes/no on this page is the same compact No / Yes control, with the
 * question as the label (pilot feedback: simplify the yes/no questions). The
 * old paired cards each carried a title and a description line.
 */
const YES_NO = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const;

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
  const [saidYes, setSaidYes] = useIntakeUiState("history.conditionsYes", false);
  const answer = noneReported ? "no" : selected.length > 0 || saidYes ? "yes" : undefined;

  const setNoneReported = (active: boolean) => {
    setValue(`${HISTORY}.noneReported`, active, opts);
    if (active) {
      setValue(`${HISTORY}.knownConditions`, [], opts);
      setValue(`${HISTORY}.other`, "", opts);
    }
  };

  const choose = (next: "no" | "yes") => {
    if (next === "no") {
      setSaidYes(false);
      setNoneReported(true);
    } else {
      setSaidYes(true);
      if (noneReported) setValue(`${HISTORY}.noneReported`, false, opts);
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
        <FieldHint>Conditions a doctor has diagnosed.</FieldHint>
      </div>

      <SegmentedToggle label="Do you have any known medical conditions?" value={answer} onChange={choose} options={YES_NO} />

      <Reveal open={answer === "yes"}>
        <div className="space-y-3 pt-2">
          <p className="text-base font-medium text-(--text-body)">Choose all that apply</p>
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
                {value === "other" ? "Other condition" : label}
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
                Which other condition?
              </label>
              <input
                {...field}
                id="other-condition-input"
                value={field.value ?? ""}
                aria-invalid={fieldState.invalid || undefined}
                placeholder="e.g. Gout"
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
  // Held in the intake UI store so a "No" is still selected after Back or a reload.
  const [choice, setChoice] = useIntakeUiState<"no" | "yes" | undefined>("history.meds", () =>
    medications?.trim() ? "yes" : undefined,
  );

  const change = (next: "no" | "yes") => {
    setChoice(next);
    if (next === "no") setValue(`${HISTORY}.currentMedications`, "", { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section aria-labelledby="medications-heading" className="space-y-3 border-t border-(--border-subtle) pt-7">
      <div>
        <BlockLabel id="medications-heading">Do you take any regular medicines?</BlockLabel>
        <FieldHint>Daily or maintenance medicines.</FieldHint>
      </div>

      <SegmentedToggle label="Do you take any regular medicines?" value={choice} onChange={change} options={YES_NO} />

      <Reveal open={choice === "yes"} className="-mt-1">
        <Controller
          name={`${HISTORY}.currentMedications`}
          control={control}
          render={({ field }) => (
            <div className="pt-2">
              <label htmlFor="medications-input" className="mb-1.5 block text-base font-medium text-(--text-body)">
                Medicine name and dose
              </label>
              <textarea
                {...field}
                id="medications-input"
                value={field.value ?? ""}
                rows={2}
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
  const [choice, setChoice] = useIntakeUiState<"no" | "yes" | undefined>("history.surgeries", () =>
    details?.trim() ? "yes" : undefined,
  );

  const change = (next: "no" | "yes") => {
    setChoice(next);
    if (next === "no") setValue(`${HISTORY}.details`, "", { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section aria-labelledby="surgeries-heading" className="space-y-3 border-t border-(--border-subtle) pt-7">
      <BlockLabel id="surgeries-heading">Any surgery or hospital stay in the last 2 years?</BlockLabel>

      <SegmentedToggle label="Any surgery or hospital stay in the last 2 years?" value={choice} onChange={change} options={YES_NO} />

      <Reveal open={choice === "yes"} className="-mt-1">
        <Controller
          name={`${HISTORY}.details`}
          control={control}
          render={({ field }) => (
            <div className="pt-2">
              <label htmlFor="surgeries-input" className="mb-1.5 block text-base font-medium text-(--text-body)">
                What was it, and when?
              </label>
              <textarea
                {...field}
                id="surgeries-input"
                value={field.value ?? ""}
                rows={2}
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
