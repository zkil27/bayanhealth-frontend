"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { number: 1, title: "Personal Details" },
  { number: 2, title: "Service Details" },
  { number: 3, title: "Additional Details" },
];

interface ProgressStepperProps {
  currentSection: number;
}

export function ProgressStepper({ currentSection }: ProgressStepperProps) {
  return (
    <div className="w-full">
      <div className="hidden items-center justify-between sm:flex">
        {STEPS.map((step, idx) => {
          const isCompleted = currentSection > idx;
          const isActive = currentSection === idx;

          return (
            <div key={step.number} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-all",
                    isCompleted &&
                      "bg-(--action-primary) text-white",
                    isActive &&
                      "border-2 border-(--action-primary) bg-(--teal-100) text-(--teal-800)",
                    !isCompleted &&
                      !isActive &&
                      "bg-(--ink-100) text-(--text-subtle)",
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isActive && "font-semibold text-(--text-heading)",
                    !isActive && "text-(--text-subtle)",
                  )}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="mx-3 flex-1">
                  <div className="h-px bg-(--border-default)">
                    <div
                      className={cn(
                        "h-px bg-(--action-primary) transition-all duration-300",
                        currentSection > idx ? "w-full" : "w-0",
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-(--text-subtle)">
            Step {currentSection + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-semibold text-(--text-heading)">
            {STEPS[currentSection]?.title}
          </span>
        </div>
        <Progress value={((currentSection + 1) / STEPS.length) * 100} />
      </div>
    </div>
  );
}
