"use client";

import { ChevronDown } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { JourneyStep, JourneyViewModel } from "@/lib/patient/careJourney";

import { BannerCta, BannerText, currentBanner } from "./JourneyCtaBar";
import { NodeIcon, nodeClass, STATUS_TEXT } from "./JourneyNode";
import { StepDetails } from "./StepDetails";

/**
 * Mobile (<768px) vertical stepper.
 *
 * The expanded active row is the CTA bar at this size. Other rows collapse by
 * default and expand to the same `StepDetails` the desktop popover shows.
 * Connectors are teal and flowing up to the current step, gray and breathing
 * after it — all read from `vm.activeStepIndex`.
 */
export function MobileJourneyStepper({ vm }: { vm: JourneyViewModel }) {
  const { steps, activeStepIndex, phase } = vm;
  const reached = (i: number) =>
    phase === "complete" || (phase === "in-progress" && i < activeStepIndex);

  return (
    <div data-slot="mobile-journey-stepper" data-active-index={activeStepIndex} className="flex flex-col gap-3">
      {activeStepIndex === -1 ? <PhaseBanner vm={vm} /> : null}
      <ol aria-label="Care recovery steps" className="flex flex-col">
        {steps.map((step, i) => (
          <li
            key={step.id}
            data-slot={`mobile-journey-step-${step.id}`}
            data-status={step.status}
            className="relative flex gap-3 pb-3 last:pb-0"
          >
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                data-slot="mobile-journey-connector"
                data-reached={reached(i)}
                className={cn(
                  "absolute top-8 bottom-1 left-[13px] w-0.5 rounded-full",
                  reached(i) ? "journey-flow bg-(--surface-nav-accent)" : "ecg-idle bg-(--ink-500)",
                )}
              />
            ) : null}
            <span className={cn("relative mt-0.5 shrink-0", nodeClass(step.status))}>
              <NodeIcon status={step.status} />
            </span>
            <div className="min-w-0 flex-1">
              {step.status === "active" ? <ActiveRow step={step} vm={vm} /> : <CollapsedRow step={step} />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PhaseBanner({ vm }: { vm: JourneyViewModel }) {
  const banner = currentBanner(vm);
  return (
    <div
      data-slot="patient-home-care-plan-cta-mobile"
      data-step-id={vm.phase}
      className="flex flex-col gap-2 rounded-2xl border border-(--border-subtle) bg-(--surface-warm-soft) p-3"
    >
      <BannerText banner={banner} />
      <BannerCta banner={banner} />
    </div>
  );
}

function ActiveRow({ step, vm }: { step: JourneyStep; vm: JourneyViewModel }) {
  const banner = currentBanner(vm);
  return (
    <div
      data-slot="patient-home-care-plan-cta-mobile"
      data-step-id={step.id}
      className="flex flex-col gap-2 rounded-2xl border border-(--border-subtle) bg-(--surface-warm-soft) p-3"
    >
      <div>
        <p className="text-[13px] font-bold text-(--text-heading)">{step.label}</p>
        <p className="text-[12.5px] text-(--text-muted)">{step.content.summary}</p>
      </div>
      <StepDetails details={step.content.details} status={step.status} />
      <BannerCta banner={banner} />
    </div>
  );
}

function CollapsedRow({ step }: { step: JourneyStep }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-start justify-between gap-2 rounded-lg text-left">
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[13px] font-bold",
              step.status === "locked" ? "text-(--text-muted)" : "text-(--text-heading)",
            )}
          >
            {step.label}
            <span className="sr-only">, {STATUS_TEXT[step.status]}</span>
          </span>
          <span className="block text-[12px] text-(--text-muted)">{step.content.summary}</span>
        </span>
        <ChevronDown
          aria-hidden
          className="mt-1 size-4 shrink-0 text-(--text-muted) transition-transform group-data-[panel-open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5 pb-1">
        <StepDetails details={step.content.details} status={step.status} />
      </CollapsibleContent>
    </Collapsible>
  );
}
