// features/booking/components/consultation/StepsIndicator.tsx
"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

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
 * The booking tracker as a jeepney route — the same paper-cut world as the
 * waiting screen's video, so the whole flow reads as one ride.
 *
 * - The travelled road is solid teal; the road ahead is a dashed line.
 * - Finished stops are teal with a tick; upcoming stops are hollow.
 * - The current stop carries a ticket-shaped stamp cropped from the real
 *   jeepney art (day or night, matching the waiting video). It is decorative
 *   and hidden from assistive tech; the stop itself carries `aria-current`.
 * - One authored motion: when the patient reaches a new stop the stamp rides
 *   along the road from the previous one. Reduced motion places it directly.
 *
 * Stops sit on an equal-size grid (columns on phones, fixed-height rows from
 * `lg`), so the stamp's position is a pure function of the stop index and can
 * transition between stops.
 */
export function StepsIndicator({
  steps,
  currentStep,
  completedSteps,
  reviewStep,
  onStepClick,
}: StepsIndicatorProps) {
  const count = steps.length;
  const lastCompleted = Math.max(currentStep, completedSteps.lastIndexOf(true) + 1);
  const fill = count > 1 ? Math.min(lastCompleted, count - 1) / (count - 1) : 0;

  const routeVars = {
    "--stops": count,
    "--fill": fill,
    "--route-cols": `repeat(${count}, minmax(0, 1fr))`,
    "--route-rows": `repeat(${count}, 3.5rem)`,
  } as CSSProperties;

  return (
    <div className="px-1 pt-1 lg:px-0 lg:pt-0">
      <nav aria-label="Booking progress" style={routeVars} className="relative">
        {/* Road — horizontal on phones, between the first and last stop centres. */}
        <span
          aria-hidden
          className="absolute top-[21px] right-[calc(100%/(var(--stops)*2))] left-[calc(100%/(var(--stops)*2))] h-0 border-t-2 border-dashed border-(--border-strong) lg:hidden"
        />
        <span
          aria-hidden
          className="absolute top-[20px] left-[calc(100%/(var(--stops)*2))] h-1 w-[calc((100%-100%/var(--stops))*var(--fill))] rounded-full bg-(--action-primary) transition-[width] duration-700 ease-out motion-reduce:transition-none lg:hidden"
        />
        {/* Road — vertical from `lg`, through the stop column's centre. */}
        <span
          aria-hidden
          className="absolute top-[calc(100%/(var(--stops)*2))] bottom-[calc(100%/(var(--stops)*2))] left-[35px] hidden w-0 border-l-2 border-dashed border-(--border-strong) lg:block"
        />
        <span
          aria-hidden
          className="absolute top-[calc(100%/(var(--stops)*2))] left-[34px] hidden h-[calc((100%-100%/var(--stops))*var(--fill))] w-1 rounded-full bg-(--action-primary) transition-[height] duration-700 ease-out motion-reduce:transition-none lg:block"
        />

        <ol className="relative z-10 grid grid-cols-(--route-cols) lg:grid-cols-1 lg:grid-rows-(--route-rows)">
          {steps.map((step, i) => {
            const isReviewing = reviewStep === i;
            const isCurrent = i === currentStep;
            const isCompleted = (completedSteps && i < currentStep) || completedSteps[i];
            // While a completed stop is open for review, the current stop must
            // stay tappable so the patient can ride back to it.
            const isReturnTarget = isCurrent && reviewStep !== null;
            const canReview = (isCompleted || isReturnTarget) && !isReviewing;
            const stateText = isCurrent ? "current stop" : isCompleted ? "done" : "coming up";

            return (
              <li key={step.id} className="flex justify-center lg:justify-start">
                <button
                  type="button"
                  disabled={!canReview}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => canReview && onStepClick(i)}
                  className={cn(
                    "flex min-h-12 w-full flex-col items-center gap-1 rounded-lg pb-1",
                    "lg:h-full lg:flex-row lg:gap-2 lg:pb-0",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                    canReview ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <span className="flex h-11 w-full items-center justify-center lg:h-full lg:w-[72px] lg:shrink-0">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted || isReviewing
                          ? "border-(--action-primary) bg-(--action-primary) text-(--text-inverse)"
                          : isCurrent
                            ? "border-(--action-primary) bg-(--surface-card)"
                            : "border-(--border-strong) bg-(--surface-card)",
                        isReviewing && "ring-4 ring-(--teal-200)",
                      )}
                    >
                      {isCompleted || isReviewing ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : isCurrent ? (
                        <span className="size-3 rounded-full bg-(--action-primary)" />
                      ) : null}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-center text-[13px] leading-tight lg:text-left lg:text-[15px]",
                      isCurrent || isReviewing
                        ? "font-bold text-(--text-heading)"
                        : isCompleted
                          ? "font-semibold text-(--text-body)"
                          : "font-medium text-(--text-muted)",
                    )}
                  >
                    {step.label}
                    <span className="sr-only">{`, stop ${i + 1} of ${count}, ${stateText}`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
