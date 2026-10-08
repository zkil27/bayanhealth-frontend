"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { PatientSafetyStrip } from "@/features/doctor/components/PatientSafetyStrip";

import type { WorkspacePhase } from "./workspacePhase";

const PHASES: ReadonlyArray<{ id: WorkspacePhase; label: string; hint: string }> = [
  { id: "review", label: "Review", hint: "Read the intake and write your S and O notes" },
  { id: "assess", label: "Assess", hint: "Confirm your diagnosis and ICD-10 code" },
  { id: "deliver", label: "Deliver", hint: "Draft, sign and release documents" },
];

/**
 * Review → Assess → Deliver, as progress (desktop, `lg` and up).
 *
 * Every step is labelled; it used to show only the current step's name, so a
 * first-time doctor saw "① ② ③ Deliver" and had to guess the other two.
 */
export function WorkspaceStepper({
  phase,
  blocked,
}: {
  phase: WorkspacePhase;
  /** A safety finding is holding the consultation, so Deliver is unreachable. */
  blocked?: boolean;
}) {
  const currentIndex = PHASES.findIndex((step) => step.id === phase);

  return (
    <ol
      data-slot="workspace-stepper"
      data-phase={phase}
      className="flex items-center gap-1"
      aria-label="Post-consultation progress"
    >
      {PHASES.map((step, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        const unreachable = Boolean(blocked) && step.id === "deliver";

        return (
          <li key={step.id} className="flex items-center gap-1" title={step.hint}>
            {index > 0 ? (
              <span
                aria-hidden
                className={cn("h-px w-4 xl:w-6", done || isCurrent ? "bg-(--action-primary)" : "bg-(--border-default)")}
              />
            ) : null}
            <span
              data-step={step.id}
              data-state={unreachable ? "unreachable" : done ? "done" : isCurrent ? "current" : "pending"}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold",
                done && "text-(--status-available-fg)",
                isCurrent && "bg-(--surface-accent-soft) text-(--text-heading)",
                !done && !isCurrent && "text-(--text-subtle)",
                unreachable && "text-(--danger-fg)",
              )}
            >
              <StepMark index={index} done={done} current={isCurrent} locked={unreachable} />
              {step.label}
              {done ? <span className="sr-only">(done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepMark({
  index,
  done,
  current,
  locked,
}: {
  index: number;
  done: boolean;
  current: boolean;
  locked: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
        done && "border-(--action-primary) bg-(--action-primary) text-(--action-primary-text)",
        current && !done && "border-(--action-primary) text-(--status-available-fg)",
        !done && !current && "border-(--border-default)",
        locked && "border-(--border-default) text-(--text-subtle)",
      )}
    >
      {done ? <Check className="size-3" /> : locked ? <Lock className="size-3" /> : index + 1}
    </span>
  );
}

/**
 * The same three steps as a phone's navigation (below `lg`).
 *
 * On a phone each step is its own screen, and this is how the doctor moves
 * between them: three 44px segments, one tap each, the one on screen filled.
 * A finished step carries a check. Deliver stays tappable before the
 * Assessment is confirmed so the tap can explain why it is not open yet,
 * rather than being a dead, greyed-out button.
 */
export function PhoneStepTabs({
  view,
  phase,
  deliverLocked,
  onSelect,
  className,
}: {
  /** The step on screen. */
  view: WorkspacePhase;
  /** How far the consultation actually is. */
  phase: WorkspacePhase;
  deliverLocked: boolean;
  onSelect: (view: WorkspacePhase) => void;
  className?: string;
}) {
  const phaseIndex = PHASES.findIndex((step) => step.id === phase);

  return (
    <nav aria-label="Post-consultation steps" className={cn("w-full", className)}>
      <ol className="grid grid-cols-3 gap-1 rounded-xl bg-(--surface-warm-soft) p-1">
        {PHASES.map((step, index) => {
          const selected = step.id === view;
          const done = index < phaseIndex;
          const locked = step.id === "deliver" && deliverLocked;
          return (
            <li key={step.id}>
              <button
                type="button"
                data-step={step.id}
                aria-current={selected ? "step" : undefined}
                aria-disabled={locked || undefined}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none",
                  selected
                    ? "bg-(--surface-card) text-(--text-heading) shadow-[0_1px_2px_rgb(7_73_114/0.12)]"
                    : locked
                      ? "text-(--text-subtle)"
                      : "text-(--text-muted) active:bg-(--surface-card)/60",
                )}
              >
                <StepMark index={index} done={done} current={selected} locked={locked} />
                {step.label}
                {done ? <span className="sr-only">(done)</span> : null}
                {locked ? <span className="sr-only">(opens after you confirm the assessment)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The workspace header: who this consultation is for, where it stands, and
 * the actions that apply to the whole consultation.
 *
 * Desktop: one row, identity on the left, progress and actions on the right.
 * Phone: identity with Intake and ER on the first row, recorded allergies on
 * their own full-width line (never truncated into a chip), then the three
 * step tabs. The tabs step aside while the keyboard is up, so a note being
 * typed is not squeezed between two sticky bars; identity and allergies stay.
 */
export function WorkspaceHeader({
  consultationId,
  chiefComplaint,
  patientName,
  age,
  sex,
  allergies,
  phase,
  blocked,
  view,
  deliverLocked,
  onSelectView,
  actions,
  phoneActions,
}: {
  consultationId: string;
  chiefComplaint?: string;
  /** Patient display name, present only when the booking intake carries one. */
  patientName?: string;
  /** Whole years, derived from the recorded birth date. */
  age?: number;
  /** Human-readable sex label, e.g. "Male". */
  sex?: string;
  /** Recorded allergies worth warning about; omitted for an asserted "None". */
  allergies?: string;
  phase: WorkspacePhase;
  blocked?: boolean;
  /** The phone screen currently shown. */
  view: WorkspacePhase;
  deliverLocked: boolean;
  onSelectView: (view: WorkspacePhase) => void;
  /** Desktop actions, beside the stepper. */
  actions?: React.ReactNode;
  /** Phone actions, on the identity row. */
  phoneActions?: React.ReactNode;
}) {
  return (
    <header
      data-slot="workspace-header"
      className="flex w-full max-w-full min-w-0 flex-col gap-2 border-b border-(--border-subtle) bg-(--surface-card) px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 max-lg:sticky max-lg:top-0 max-lg:z-30 sm:px-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:px-6 lg:py-2.5"
    >
      <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:gap-3">
        <Link
          href="/doctor/history"
          aria-label="Back to consultation history"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-(--text-body) transition-colors hover:bg-(--surface-warm-soft) lg:size-9 lg:border lg:border-(--border-default)"
        >
          <ArrowLeft className="size-5 lg:size-4" />
        </Link>

        <PatientSafetyStrip
          className="min-w-0 flex-1"
          name={patientName}
          fallbackTitle={chiefComplaint}
          age={age}
          sex={sex}
          reference={`Konsulta #${consultationId}`}
          allergies={allergies}
          hideAvatarBelowLg
          allergiesClassName="max-lg:hidden"
        />

        {phoneActions ? <div className="flex shrink-0 items-center gap-1.5 lg:hidden">{phoneActions}</div> : null}
      </div>

      {allergies ? (
        <p
          data-slot="header-allergy-line"
          className="flex items-start gap-1.5 rounded-lg border border-(--danger-border)/50 bg-(--danger-bg) px-3 py-1.5 text-sm font-bold text-(--danger-fg) lg:hidden"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">Allergies: {allergies}</span>
        </p>
      ) : null}

      <div className="flex min-w-0 items-center justify-end gap-4 max-lg:hidden">
        <WorkspaceStepper phase={phase} blocked={blocked} />
        {actions}
      </div>

      <PhoneStepTabs
        className="lg:hidden max-lg:group-has-[textarea:focus]/ws:hidden max-lg:group-has-[input:focus]/ws:hidden"
        view={view}
        phase={phase}
        deliverLocked={deliverLocked}
        onSelect={onSelectView}
      />
    </header>
  );
}
