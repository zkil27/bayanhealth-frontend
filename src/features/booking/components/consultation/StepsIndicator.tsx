// features/booking/components/consultation/StepsIndicator.tsx
"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: string;
  label: string;
  system: boolean;
}

interface StepsIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: boolean[];
  reviewStep: number | null;
  onStepClick: (stepIndex: number) => void;
}

/**
 * Progress tracker for the booking wizard.
 *
 * Responsive: a horizontal rail with the labels under each node on mobile, and a
 * vertical list (node · label per row) on `lg` and up, where it sits in the
 * wizard's left rail beside the step content.
 */
export function StepsIndicator({
  steps,
  currentStep,
  completedSteps,
  reviewStep,
  onStepClick,
}: StepsIndicatorProps) {
  const lastCompleted = Math.max(
    currentStep,
    completedSteps.lastIndexOf(true) + 1,
  );
  const fillFraction =
    steps.length > 1
      ? Math.min(lastCompleted, steps.length - 1) / (steps.length - 1)
      : 0;

  return (
    <div className="px-2 pt-2 lg:px-0">
      <nav
        aria-label="Booking progress"
        className="relative flex flex-row justify-between lg:flex-col lg:justify-start lg:gap-1"
      >
        {/* Horizontal track (mobile) */}
        <span
          aria-hidden
          className="absolute top-[12px] right-[13px] left-[13px] h-[3px] rounded-full bg-(--ink-100) lg:hidden"
        />
        <span
          aria-hidden
          className="absolute top-[12px] left-[13px] h-[3px] rounded-full bg-(--action-primary) transition-all duration-500 lg:hidden"
          style={{ width: `calc((100% - 26px) * ${fillFraction})` }}
        />
        {/* Vertical track (desktop) */}
        <span
          aria-hidden
          className="absolute top-[13px] bottom-[13px] left-[11.5px] hidden w-[3px] rounded-full bg-(--ink-100) lg:block"
        />
        <span
          aria-hidden
          className="absolute top-[13px] left-[11.5px] hidden w-[3px] rounded-full bg-(--action-primary) transition-all duration-500 lg:block"
          style={{ height: `calc((100% - 26px) * ${fillFraction})` }}
        />

        {steps.map((step, i) => {
          const isReviewing = reviewStep === i;
          const isActive = i === currentStep && reviewStep === null;
          const isCompleted =
            (completedSteps && i < currentStep) || completedSteps[i];
          const canReview = isCompleted && !isReviewing;

          return (
            <button
              key={step.id}
              type="button"
              disabled={!canReview}
              onClick={() => canReview && onStepClick(i)}
              className={cn(
                "z-10 flex flex-col items-center gap-[5px] lg:w-full lg:flex-row lg:gap-3 lg:py-1",
                canReview ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-[26px] shrink-0 items-center justify-center rounded-full border-2 bg-(--surface-card) transition-colors",
                  isCompleted || isReviewing
                    ? "border-(--action-primary) bg-(--action-primary) text-white"
                    : isActive
                      ? "border-(--action-primary)"
                      : "border-(--border-default)",
                )}
              >
                {isCompleted || isReviewing ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : isActive ? (
                  <span className="size-[10px] rounded-[5px] bg-(--action-primary)" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight lg:text-left lg:text-[13px]",
                  isActive || isReviewing
                    ? "font-bold text-(--text-heading)"
                    : isCompleted
                      ? "font-semibold text-(--text-heading)"
                      : "font-semibold text-(--text-subtle)",
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </nav>

      {completedSteps.some(Boolean) && (
        <p className="mt-3 text-center text-[11px] text-(--text-subtle) lg:mt-4 lg:text-left">
          Tap a completed step to review
        </p>
      )}
    </div>
  );
}
