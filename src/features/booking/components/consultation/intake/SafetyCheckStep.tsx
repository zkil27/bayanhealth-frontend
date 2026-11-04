"use client";

import { type FieldPath, useFormContext } from "react-hook-form";

import { EmergencyCareCard } from "@/features/consultation/components/emergency/EmergencyCareCard";
import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { isSafetyHardStop, type RedFlagState } from "./intakeGates";

const RED_FLAGS = [
  "Chest pain or tightness",
  "Sudden shortness of breath",
  "Severe bleeding that won't stop",
] as const;

/**
 * First page of a teleconsult intake: the emergency red-flag question.
 *
 * "No" asserts `chestPain` and `dyspnea` are false, which the backend's
 * red-flag router reads as screened. "Yes" leaves both unanswered and stops
 * the intake: the page shows emergency actions and the footer offers no
 * Continue. Nothing about a "Yes" is invented or sent.
 */
export function SafetyCheckStep({
  redFlag,
  onRedFlagChange,
}: {
  redFlag: RedFlagState;
  onRedFlagChange: (state: RedFlagState) => void;
}) {
  const { setValue } = useFormContext<DynamicIntakeFormValues>();
  const opts = { shouldDirty: true, shouldValidate: true } as const;
  const { answer } = redFlag;

  const setScreen = (chestPain: boolean | undefined, dyspnea: boolean | undefined) => {
    setValue("requestDetails.safetyScreen.chestPain" as FieldPath<DynamicIntakeFormValues>, chestPain as never, opts);
    setValue("requestDetails.safetyScreen.dyspnea" as FieldPath<DynamicIntakeFormValues>, dyspnea as never, opts);
  };

  const answerNo = () => {
    setScreen(false, false);
    onRedFlagChange({ answer: "no", bleeding: false });
  };
  const answerYes = () => {
    setScreen(undefined, undefined);
    onRedFlagChange({ answer: "yes", bleeding: false });
  };
  const retract = () => {
    setScreen(undefined, undefined);
    onRedFlagChange({ answer: undefined, bleeding: false });
  };

  return (
    <div className="space-y-6" data-slot="always-visible-safety">
      <section aria-labelledby="red-flag-heading" className="space-y-4">
        <div>
          <h2 id="red-flag-heading" className="text-[19px] leading-snug font-semibold text-(--text-heading) sm:text-xl">
            Do you have any of these right now?<span className="sr-only"> (required)</span>
          </h2>
          <ul className="mt-3 space-y-1.5 text-base text-(--text-body)">
            {RED_FLAGS.map((flag) => (
              <li key={flag} className="flex items-center gap-2.5">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--text-muted)" />
                {flag}
              </li>
            ))}
          </ul>
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
            No, none of these
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={answer === "yes"}
            onClick={answerYes}
            className={cn(
              "min-h-14 rounded-xl border px-4 py-3 text-left text-base transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              answer === "yes"
                ? "border-(--red-600) bg-(--red-600) font-semibold text-white"
                : "border-(--border-default) bg-(--surface-card) font-medium text-(--text-body) hover:border-(--danger-border) hover:bg-(--danger-bg)",
            )}
          >
            Yes, I have one or more
          </button>
        </div>
      </section>

      {isSafetyHardStop(redFlag) ? <EmergencyCareCard onRetract={retract} /> : null}
    </div>
  );
}
