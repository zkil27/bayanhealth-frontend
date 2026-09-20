"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { CONSULT_HREF } from "./content";
import {
  PROTOCOL_BOOK_LABEL,
  PROTOCOL_READ_FULL_LABEL,
  WORKFLOW_STEPS,
  type MedicalProtocol,
} from "./medicalHubContent";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/**
 * The section a doctor is actually reading mid-consult.
 *
 * Management, where a protocol has one — that is where the dosing sits. Falling
 * back to the last section rather than the first keeps assessment criteria out
 * of a step that is meant to show treatment guidance.
 */
function decisionSection(protocol: MedicalProtocol) {
  return (
    protocol.sections.find((section) =>
      /management|treatment/i.test(section.heading),
    ) ?? protocol.sections[protocol.sections.length - 1]
  );
}

function StepNumber({ number }: { number: number }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--surface-accent-soft) font-display text-sm font-bold text-(--status-available-fg)"
    >
      {number}
    </span>
  );
}

export interface ProtocolWorkflowDrawerProps {
  protocol: MedicalProtocol | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "How this protocol behaves inside a live consult", as a slide-over.
 *
 * A drawer rather than a route so the visitor keeps their scroll position and
 * their active filter — opening one of eleven previews should not cost them the
 * grid they were reading.
 *
 * `protocol` is held by the parent and deliberately not cleared on close, so the
 * panel still has content to render while it animates out.
 */
export function ProtocolWorkflowDrawer({
  protocol,
  open,
  onOpenChange,
}: ProtocolWorkflowDrawerProps) {
  if (!protocol) return null;

  const decision = decisionSection(protocol);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-(--surface-page) text-(--text-body) sm:max-w-lg"
      >
        <SheetHeader className="gap-3 border-b border-(--border-subtle) p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
              {protocol.category}
            </span>
            <span className="rounded-(--radius-pill) border border-(--border-default) px-3 py-1 text-xs font-medium text-(--text-muted)">
              {protocol.authority}
            </span>
          </div>
          <SheetTitle className="font-display text-xl leading-snug font-bold text-(--text-heading)">
            {protocol.title}
          </SheetTitle>
          <SheetDescription className="text-[15px] leading-relaxed text-(--text-muted)">
            How this protocol works inside a BayanHealth consultation.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-8 p-6">
          {/* Step 1 — intake triage */}
          <section className="flex gap-4">
            <StepNumber number={WORKFLOW_STEPS[0].number} />
            <div className="flex flex-1 flex-col gap-2">
              <h3 className="font-display text-base font-bold text-(--text-heading)">
                {WORKFLOW_STEPS[0].title}
                <span className="block text-sm font-medium text-(--text-muted)">
                  {WORKFLOW_STEPS[0].subtitle}
                </span>
              </h3>
              <p className="text-sm leading-relaxed text-(--text-muted)">
                {WORKFLOW_STEPS[0].description}
              </p>
              {/*
                The red flags are stated plainly on a sunken surface rather than
                in a full-bleed red panel. They are referral criteria a clinician
                reads deliberately, not an alarm — and eleven red panels down a
                page stop being read at all.
              */}
              <div className="mt-1 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) p-4">
                <p className="flex items-center gap-2 text-xs font-bold tracking-(--tracking-overline) text-(--danger-fg) uppercase">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden />
                  {protocol.warning.heading}
                </p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-(--text-body)">
                  {protocol.warning.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Step 2 — clinical decision */}
          <section className="flex gap-4">
            <StepNumber number={WORKFLOW_STEPS[1].number} />
            <div className="flex flex-1 flex-col gap-2">
              <h3 className="font-display text-base font-bold text-(--text-heading)">
                {WORKFLOW_STEPS[1].title}
                <span className="block text-sm font-medium text-(--text-muted)">
                  {WORKFLOW_STEPS[1].subtitle}
                </span>
              </h3>
              <p className="text-sm leading-relaxed text-(--text-muted)">
                {WORKFLOW_STEPS[1].description}
              </p>
              <p className="mt-1 text-xs font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                {decision.heading}
              </p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-(--text-body)">
                {decision.bullets.map((bullet) => (
                  <li key={bullet.text}>{bullet.text}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Step 3 — patient deliverable */}
          <section className="flex gap-4">
            <StepNumber number={WORKFLOW_STEPS[2].number} />
            <div className="flex flex-1 flex-col gap-2">
              <h3 className="font-display text-base font-bold text-(--text-heading)">
                {WORKFLOW_STEPS[2].title}
                <span className="block text-sm font-medium text-(--text-muted)">
                  {WORKFLOW_STEPS[2].subtitle}
                </span>
              </h3>
              <p className="text-sm leading-relaxed text-(--text-muted)">
                {WORKFLOW_STEPS[2].description}
              </p>
            </div>
          </section>
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-(--border-subtle) p-6">
          <Link
            href={CONSULT_HREF}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--action-primary) px-5 text-[15px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) ${focusRing}`}
          >
            <Stethoscope className="size-4" aria-hidden />
            {PROTOCOL_BOOK_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/medical-hub/${protocol.slug}`}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) border border-(--action-secondary-border) px-5 text-[15px] font-bold text-(--action-secondary-text) transition-colors hover:bg-(--action-secondary-hover-surface) ${focusRing}`}
          >
            {PROTOCOL_READ_FULL_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
