import { ArrowRight } from "lucide-react";

import { brandButtonClass } from "@/features/patient/components/redesign/primitives";
import type { JourneyBanner, JourneyViewModel } from "@/lib/patient/careJourney";

import { NavigatingLink } from "./NavigatingLink";

/**
 * What to show for the current moment: the current step, or the start /
 * complete banner when there is no current step. The one function both the
 * desktop bar and the mobile stepper use, so they cannot disagree.
 */
export function currentBanner(vm: JourneyViewModel): JourneyBanner & { stepId?: string } {
  const step = vm.steps[vm.activeStepIndex];
  if (step) {
    return {
      stepId: step.id,
      label: step.label,
      summary: step.content.summary,
      ...(step.content.cta ? { cta: step.content.cta } : {}),
    };
  }
  return vm.banner ?? { label: "", summary: "" };
}

export function JourneyCtaBar({ vm }: { vm: JourneyViewModel }) {
  const banner = currentBanner(vm);
  return (
    <div
      data-slot="patient-home-care-plan-cta"
      data-active-index={vm.activeStepIndex}
      data-step-id={banner.stepId ?? vm.phase}
      aria-live="polite"
      className="flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-warm-soft) px-4 py-2.5"
    >
      <BannerText banner={banner} />
      {banner.cta ? <BannerCta banner={banner} /> : null}
    </div>
  );
}

export function BannerText({ banner }: { banner: JourneyBanner }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-bold text-(--text-heading)">{banner.label}</p>
      <p className="text-[12.5px] text-(--text-muted)">{banner.summary}</p>
    </div>
  );
}

export function BannerCta({ banner }: { banner: JourneyBanner }) {
  if (!banner.cta) return null;
  return (
    <NavigatingLink
      href={banner.cta.action.href}
      className={brandButtonClass({ variant: "primary", size: "sm" })}
    >
      {banner.cta.label}
      <ArrowRight aria-hidden />
    </NavigatingLink>
  );
}
