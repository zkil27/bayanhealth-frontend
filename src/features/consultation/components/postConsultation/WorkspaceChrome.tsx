"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Lock, ShieldAlert, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";

import type { WorkspacePhase } from "./workspacePhase";

const PHASES: ReadonlyArray<{ id: WorkspacePhase; label: string }> = [
  { id: "review", label: "Review" },
  { id: "assess", label: "Assess" },
  { id: "deliver", label: "Deliver" },
];

/** Up to two uppercase initials for the header avatar. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Review → Assess → Deliver, as W1's header draws it.
 *
 * The workspace previously had no notion of progress at all: the assessment
 * editor, the generation controls, and the drafted-document list were three
 * sections of one scroll, all rendered at all times, so "what have I done and
 * what is left" had to be inferred from which buttons happened to be disabled.
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
      className="flex items-center gap-1.5"
      aria-label="Post-consultation progress"
    >
      {PHASES.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        // Deliver is drawn as unreachable rather than merely pending when a red
        // flag is active: for W2 there is no later step to get to.
        const unreachable = Boolean(blocked) && step.id === "deliver";

        return (
          <li key={step.id} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px w-6",
                  done || current ? "bg-(--action-primary)" : "bg-(--border-default)",
                )}
              />
            ) : null}
            <span
              data-step={step.id}
              data-state={
                unreachable ? "unreachable" : done ? "done" : current ? "current" : "pending"
              }
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-colors",
                done && "text-(--status-available-fg)",
                current && "bg-(--surface-accent-soft) text-(--status-available-fg)",
                !done && !current && "text-(--text-subtle)",
                unreachable && "text-(--danger-fg)",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                  done && "border-(--action-primary) bg-(--action-primary) text-white",
                  current && "border-(--action-primary) text-(--status-available-fg)",
                  !done && !current && "border-(--border-default)",
                  unreachable && "border-(--danger-border) text-(--danger-fg)",
                )}
              >
                {done ? (
                  <Check className="size-3" />
                ) : unreachable ? (
                  <Lock className="size-3" />
                ) : (
                  index + 1
                )}
              </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The workspace header: who this consultation is for, where it is, and the one
 * action that ends it.
 *
 * Identity now comes from the structured intake demographics (ADR follow-up to
 * the vitals work): `patientName` when the booking carries one, plus an age
 * derived from the recorded birth date and the recorded sex. Each piece is
 * shown only when the patient actually supplied it — with no name the header
 * falls back to the chief complaint and the consultation reference, exactly as
 * it did before those fields existed on the contract.
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
  statusLabel,
  statusTone,
  actions,
}: {
  consultationId: string;
  chiefComplaint?: string;
  /** Patient display name, present only when the booking intake carries one. */
  patientName?: string;
  /** Whole years, derived from the recorded birth date. */
  age?: number;
  /** Human-readable sex label, e.g. "Male". */
  sex?: string;
  /**
   * The patient's recorded allergies, as free text, when it is something a
   * physician should be warned about rather than an asserted "None". Shown as
   * a persistent high-priority tag so it stays visible no matter which SOAP
   * card or patient-rail tab is in view — it previously lived inside the
   * Objective vitals card, where it read as one more reading rather than a
   * standing warning.
   */
  allergies?: string;
  phase: WorkspacePhase;
  blocked?: boolean;
  statusLabel: string;
  statusTone: "active" | "danger" | "done";
  actions?: React.ReactNode;
}) {
  const name = patientName?.trim();
  const heading = name || chiefComplaint?.trim() || "Post-consultation";
  const identityParts = [
    typeof age === "number" ? String(age) : null,
    sex?.trim() || null,
    `Konsulta #${consultationId}`,
  ].filter(Boolean);

  return (
    <header
      data-slot="workspace-header"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-(--border-subtle) bg-(--surface-page) px-4 py-4 md:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/doctor/history"
          aria-label="Back to consultation history"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-(--text-body) transition-colors hover:bg-(--surface-warm-soft)"
        >
          <ArrowLeft className="size-4.5" />
        </Link>
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--surface-brand) text-sm font-bold text-(--text-on-brand)"
        >
          {name ? initials(name) : <Stethoscope className="size-5" />}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-xl font-bold text-(--text-heading)">
            {heading}
          </h1>
          <p className="truncate text-sm text-(--text-muted)">
            {name ? identityParts.join(" · ") : `#${consultationId}`}
          </p>
        </div>
        <span
          data-slot="workspace-status"
          className={cn(
            "ml-1 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
            statusTone === "active" && "bg-(--status-available-bg) text-(--status-available-fg)",
            statusTone === "danger" && "bg-(--danger-bg) text-(--danger-fg)",
            statusTone === "done" && "bg-(--gray-bg) text-(--gray-fg)",
          )}
        >
          {statusTone === "danger" ? (
            <ShieldAlert className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          {statusLabel}
        </span>
        {allergies ? (
          <span
            data-slot="header-allergy-tag"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-(--danger-border) bg-(--danger-bg) px-3 py-1 text-sm font-semibold text-(--danger-fg)"
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            Allergies: {allergies}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <WorkspaceStepper phase={phase} blocked={blocked} />
        {actions}
      </div>
    </header>
  );
}
