"use client";

import { useMemo } from "react";
import { BookOpenCheck, Check, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type {
  CdsAssessment,
  CdsCandidateEvaluation,
  CdsDiagnosisCandidatePreview,
} from "@/types/cds-contract";

import { routingOutcomeLabel } from "../../lib/cdsCopy";

/**
 * Diagnosis candidates beside their CPG preview.
 *
 * The CPG preview is clinical decision support — the thing that makes picking a
 * diagnosis here better than typing one. It used to render *below* a scrolling
 * candidate list, inside a card that was itself below the fold, so a physician
 * choosing a diagnosis saw the list, clicked, and never saw the guideline at
 * all. Support that has to be hunted for is not support.
 *
 * Three changes fix that:
 *
 * **The preview sits next to the list**, sticky, on any screen wide enough for
 * two columns. On a narrow screen it renders *above* the list instead, so the
 * thing that just appeared in response to a tap is the thing in view.
 *
 * **Choosing is separate from looking.** Clicking a candidate used to select it
 * outright — committing to a diagnosis was the same gesture as asking about one,
 * which is why the preview was unreadable in practice. A click now previews;
 * a distinct button in the preview commits.
 *
 * **There is one text box, not two.** This used to carry its own "Search
 * diagnosis names" field beside the Assessment card's actual diagnosis field —
 * two boxes doing overlapping jobs, and typing in the real one did nothing
 * until the physician noticed the other and used it instead. The list below now
 * filters live off what the physician types into the Assessment field itself
 * (debounced in the workspace); this component owns no text input of its own.
 */

export interface CandidatePickerProps {
  assessment: CdsAssessment;
  evaluation: CdsCandidateEvaluation | null;
  preview: CdsDiagnosisCandidatePreview | null;
  /** Which candidate's preview is showing (or loading). */
  focused: string | null;
  previewLoading: boolean;
  /** A live refinement of the list, triggered by typing in the Assessment field, is in flight. */
  searching: boolean;
  cursor?: string;
  busy: boolean;
  suppressed: boolean;
  onStart: () => void;
  onMore: () => void;
  onFocus: (diagnosisName: string) => void;
  onSelect: (diagnosisName: string) => void;
}

export function CandidatePicker(props: CandidatePickerProps) {
  const source = useMemo(() => {
    const value = props.preview?.sourceReference;
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (typeof item.title !== "string" || typeof item.publisher !== "string")
      return null;
    return {
      title: item.title,
      publisher: item.publisher,
      date:
        typeof item.year === "number"
          ? String(item.year)
          : typeof item.effectiveDate === "string"
            ? item.effectiveDate
            : "Current reviewed edition",
      reviewStatus:
        item.reviewStatus === "reviewed" ? "Reviewed" : "Unavailable",
    };
  }, [props.preview]);

  return (
    <section
      data-slot="candidate-picker"
      aria-labelledby="candidate-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="candidate-heading"
            className="text-[15px] font-bold text-(--text-heading)"
          >
            Diagnosis suggestions
          </h3>
          <p className="text-xs text-(--text-muted)">
            Keep typing above to filter this list, or pick one to read its
            guideline summary — choosing is a separate step, and typing your
            own diagnosis instead remains available.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={props.busy || Boolean(props.assessment.confirmed)}
          onClick={props.onStart}
        >
          <RefreshCw className="size-4" /> Start fresh
        </Button>
      </div>

      {props.evaluation?.routing &&
      props.evaluation.routing.outcome !== "ROUTINE" ? (
        <div
          role="alert"
          className="rounded-[12px] border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--text-body)"
        >
          <strong className="text-(--danger-fg)">
            {routingOutcomeLabel(props.evaluation.routing.outcome)}
          </strong>
          {props.evaluation.routing.safetyMessage
            ? ` · ${props.evaluation.routing.safetyMessage}`
            : ""}
          {props.evaluation.routing.matchedRuleIds.length ? (
            <p>
              Safety rules: {props.evaluation.routing.matchedRuleIds.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {!props.evaluation ? (
        <p className="rounded-[12px] bg-(--surface-warm-soft) p-3 text-sm text-(--text-muted)">
          No suggestions loaded yet. Focus the diagnosis field above, or press{" "}
          <span className="font-medium text-(--text-heading)">Start fresh</span>
          .
        </p>
      ) : props.suppressed ? (
        <p className="rounded-[12px] bg-(--surface-warm-soft) p-3 text-sm font-medium text-(--text-body)">
          Routine candidates and the CPG preview are suppressed by current
          safety routing.
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          {/*
            The list is second in source order and second on a wide screen, but
            drops below the preview on one column — with a single column the
            preview is what the physician just asked for, so it belongs above the
            scrolling box rather than past it.
          */}
          <div className="order-2 flex min-w-0 flex-col gap-2 lg:order-1">
            {/*
              No search box here — this list filters off what the physician
              already typed into the Assessment field above. A quiet inline
              indicator, not a spinner over the list, so the existing rows stay
              readable while a refinement is in flight.
            */}
            {props.searching ? (
              <p className="flex items-center gap-1.5 text-xs text-(--text-subtle)">
                <Spinner className="size-3" /> Updating suggestions…
              </p>
            ) : null}

            <ul
              aria-label="Diagnosis candidates"
              className="flex max-h-72 min-w-0 flex-col gap-1 overflow-y-auto rounded-[12px] border border-(--border-subtle) p-1"
            >
              {props.evaluation.candidates.map((candidate) => {
                const active = candidate.diagnosisName === props.focused;
                return (
                  <li key={candidate.diagnosisName}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => props.onFocus(candidate.diagnosisName)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-(--surface-accent-soft) font-medium text-(--text-heading)"
                          : "text-(--text-body) hover:bg-(--surface-warm-soft)",
                        "focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {candidate.diagnosisName}
                      </span>
                      {active && props.previewLoading ? (
                        <Spinner className="size-4 shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {props.cursor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start rounded-full"
                onClick={props.onMore}
                disabled={props.busy}
              >
                Load more names
              </Button>
            ) : null}
          </div>

          {/*
            Sticky so the guideline stays put while the physician scans the list
            next to it — the panel is the reference, the list is the thing being
            scanned past it.
          */}
          <aside
            data-slot="cpg-preview"
            aria-live="polite"
            className="order-1 min-w-0 self-start rounded-[12px] border border-(--ai-border) bg-(--ai-bg) p-3 lg:sticky lg:top-4 lg:order-2"
          >
            {props.previewLoading && !props.preview ? (
              <p className="flex items-center gap-2 text-sm text-(--ai-fg)">
                <Spinner className="size-4" /> Loading guideline summary…
              </p>
            ) : props.preview ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <BookOpenCheck className="size-4 shrink-0 text-(--ai-fg)" />
                  <h4 className="min-w-0 flex-1 text-[15px] font-bold text-(--text-heading)">
                    {props.preview.diagnosisName}
                  </h4>
                  <span className="flex items-center gap-1 rounded-full bg-(--ai-bg-strong) px-2 py-0.5 text-xs font-bold text-(--ai-fg)">
                    <FileText className="size-3" /> Guideline preview
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-(--danger-fg)">
                  {props.preview.instruction}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <h5 className="text-xs font-bold tracking-wide text-(--text-subtle) uppercase">
                      Support facts
                    </h5>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-(--text-body)">
                      {props.preview.patientFacts.slice(0, 3).map((fact) => (
                        <li key={`${fact.label}-${fact.value}`}>
                          {fact.label}: {fact.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold tracking-wide text-(--text-subtle) uppercase">
                      Confirmation questions
                    </h5>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-(--text-body)">
                      {props.preview.confirmationQuestions
                        .slice(0, 3)
                        .map((question) => (
                          <li key={question.questionId}>{question.question}</li>
                        ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-3 text-xs text-(--text-muted)">
                  {source
                    ? `Approved source: ${source.title} · ${source.publisher} · ${source.date} · ${source.reviewStatus}`
                    : "Approved source metadata unavailable."}
                </p>

                {/*
                  Committing to the diagnosis is here, in the panel that
                  justifies it, rather than back in the list — the physician
                  decides after reading, which is the whole point of separating
                  the two gestures.
                */}
                <Button
                  type="button"
                  className="mt-3 w-full rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover) sm:w-auto"
                  disabled={props.busy}
                  onClick={() => props.onSelect(props.preview!.diagnosisName)}
                >
                  <Check className="size-4" /> Use {props.preview.diagnosisName}
                </Button>
              </>
            ) : (
              <p className="text-sm text-(--text-muted)">
                Select a suggestion to read its guideline summary, supporting
                facts from this patient&apos;s intake, and the questions worth
                confirming before you commit.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
