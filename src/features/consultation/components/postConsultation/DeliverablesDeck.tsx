"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  FileBadge,
  FilePlus2,
  FlaskConical,
  Hash,
  Info,
  PenLine,
  Pill,
  Plus,
  Scan,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CdsProtectedArtifact, CdsProtectedOutputType } from "@/types/cds-contract";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";

import {
  AiProvenanceChip,
  ArtifactCard,
  computeArtifactProvenance,
  type ArtifactSignatureInput,
} from "./ArtifactCard";
import { OUTPUT_LABELS } from "./workspacePhase";
import { isPatientReadableOutput, patientVisibilityCopy } from "../../lib/cdsCopy";
import type { CdsProtectedArtifactPayload } from "@/types/cds-contract";

const TOOL_ICONS: Record<CdsProtectedOutputType, React.ComponentType<{ className?: string }>> = {
  plan: ClipboardList,
  prescription: Pill,
  final_icd: Hash,
  medical_certificate: FileBadge,
  lab_request: FlaskConical,
  imaging_request: Scan,
  patient_education: BookOpen,
};

const OUTPUT_DESCRIPTIONS: Record<CdsProtectedOutputType, string> = {
  plan: "Clinical goals, interventions & specialist referral",
  prescription: "Official electronic Rx with medications & dosage directions",
  medical_certificate: "Work/school clearance with diagnosis & excused rest dates",
  lab_request: "Diagnostic laboratory workup order (blood, urine, etc.)",
  imaging_request: "Diagnostic imaging order (X-ray, ultrasound, CT)",
  patient_education: "Personalized Tagalog/English home care guide & red flags",
  final_icd: "Authoritative ICD-10 diagnostic coding classification",
};

/**
 * The drafted documents, as a deck rather than a stack.
 *
 * Documents used to render as a vertical list of full cards. With four or five
 * drafted — the ordinary case for a consultation that produces a plan, a
 * prescription, an ICD code, a certificate and patient education — reviewing the
 * last one meant scrolling past every earlier one, and there was no way to see
 * at a glance which still needed signing. Worse, pressing a tool in the right
 * rail scrolled the page to a card somewhere in that column, which reads as the
 * page jumping rather than as navigation.
 *
 * One tab strip, one document at a time. The strip is the review checklist: each
 * tab states its document's state, so "what is left to do" is answerable without
 * scrolling anything. A generation in flight gets its own tab immediately, which
 * is what makes pressing a second tool while the first is still drafting do
 * something visible instead of nothing.
 */

export type DeckStatus = "generating" | "draft" | "edited" | "signed" | "released" | "stale";

export interface DeckEntry {
  outputType: CdsProtectedOutputType;
  status: DeckStatus;
  /** Absent while a first draft of this type is still generating. */
  artifact?: CdsProtectedArtifact;
}

/**
 * Build the deck's entries from current artifacts plus whatever is generating.
 *
 * Kept pure and exported so the tab set is testable without a rendered tree, and
 * so the workspace and the deck cannot disagree about which documents exist.
 */
const PREFERRED_DECK_ORDER: readonly CdsProtectedOutputType[] = [
  "plan",
  "prescription",
  "medical_certificate",
  "patient_education",
  "lab_request",
  "imaging_request",
];

export function deriveDeckEntries(input: {
  artifacts: readonly CdsProtectedArtifact[];
  generating: ReadonlySet<CdsProtectedOutputType>;
  /** Types rendered elsewhere on the page — Plan lives under the Assessment. */
  exclude?: ReadonlySet<CdsProtectedOutputType>;
}): DeckEntry[] {
  const entries: DeckEntry[] = [];
  const seen = new Set<CdsProtectedOutputType>();

  for (const artifact of input.artifacts) {
    if (input.exclude?.has(artifact.outputType)) continue;
    if (seen.has(artifact.outputType)) continue;
    seen.add(artifact.outputType);
    entries.push({
      outputType: artifact.outputType,
      artifact,
      status: artifact.effectiveStale
        ? "stale"
        : artifact.lifecycleStatus === "released"
          ? "released"
          : artifact.lifecycleStatus === "finalized"
            ? "signed"
            : artifact.physicianEdited
              ? "edited"
              : "draft",
    });
  }

  for (const outputType of input.generating) {
    if (input.exclude?.has(outputType)) continue;
    const existing = entries.find((entry) => entry.outputType === outputType);
    // A redraft of something already on the deck keeps its tab and its content
    // visible; only a first draft gets a placeholder tab of its own.
    if (existing) continue;
    entries.push({ outputType, status: "generating" });
  }

  entries.sort((a, b) => {
    const indexA = PREFERRED_DECK_ORDER.indexOf(a.outputType);
    const indexB = PREFERRED_DECK_ORDER.indexOf(b.outputType);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  return entries;
}

/**
 * The line shown above the active document, for states that need one.
 *
 * `draft` and `edited` are deliberately absent: that used to duplicate the
 * card's own "AI draft · you own it" / "AI draft · you edited it" badge, and
 * now duplicates the card's "Needs your review" / "Reviewed" status badge too
 * — two sentences above the fold saying what one badge inside it already
 * says. The remaining four states are not shown anywhere else on the card.
 */
const STATUS_COPY: Partial<Record<DeckStatus, string>> = {
  generating: "Drafting…",
  signed: "Signed · ready to release",
  released: "Released",
  stale: "Out of date",
};

const ALL_DRAFT_TYPES: readonly CdsProtectedOutputType[] = [
  "prescription",
  "medical_certificate",
  "patient_education",
  "lab_request",
  "imaging_request",
  "plan",
];

export function DeliverablesDeck({
  entries,
  active,
  onActiveChange,
  busy,
  generating,
  specimen,
  defaultSignerName,
  canRegenerate,
  onAmend,
  onFinalize,
  onRelease,
  onRegenerate,
  onDraft,
  onDiscard,
  intake,
  gateStatusLabel,
}: {
  entries: readonly DeckEntry[];
  active: CdsProtectedOutputType | null;
  onActiveChange: (outputType: CdsProtectedOutputType) => void;
  busy: boolean;
  generating: ReadonlySet<CdsProtectedOutputType>;
  specimen?: DoctorSignatureSpecimen | undefined;
  defaultSignerName?: string;
  canRegenerate: boolean;
  onAmend: (artifact: CdsProtectedArtifact, payload: CdsProtectedArtifactPayload) => Promise<void>;
  onFinalize: (artifact: CdsProtectedArtifact, signature: ArtifactSignatureInput) => Promise<void>;
  onRelease: (artifact: CdsProtectedArtifact) => void;
  onRegenerate: (outputType: CdsProtectedOutputType) => void;
  onDraft?: (outputType: CdsProtectedOutputType) => void;
  onDiscard?: (outputType: CdsProtectedOutputType) => void;
  intake?: BookingIntakeForm | null;
  gateStatusLabel?: string;
}) {
  if (entries.length === 0) {
    return (
      <section
        data-slot="deliverables-deck-empty"
        className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-(--border-subtle) bg-(--surface-card) p-8 text-center"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-(--surface-brand-soft) text-(--teal-800) dark:text-(--teal-300)">
          <ClipboardList className="size-6" />
        </span>
        <h3 className="mt-3 text-base font-bold text-(--text-heading)">No clinical documents drafted yet</h3>
        <p className="mt-1 max-w-md text-xs text-(--text-muted) leading-relaxed">
          Generate official patient-facing documents, electronic prescriptions, or medical certificates below:
        </p>
        {onDraft ? (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {ALL_DRAFT_TYPES.map((type) => {
              const Icon = TOOL_ICONS[type];
              return (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5 text-xs border-(--border-subtle) hover:border-(--teal-600) hover:bg-(--surface-accent-soft)"
                  disabled={busy || !canRegenerate}
                  onClick={() => onDraft(type)}
                >
                  <Icon className="size-3.5 text-teal-700" />
                  + {OUTPUT_LABELS[type]}
                </Button>
              );
            })}
          </div>
        ) : null}
      </section>
    );
  }

  // An `active` naming a document that has since gone (a redraft that changed
  // type set, a stale sweep) falls back to the first tab rather than rendering
  // an empty panel.
  const current = entries.find((entry) => entry.outputType === active) ?? entries[0];
  const outstanding = entries.filter(
    (entry) => entry.status === "draft" || entry.status === "edited",
  ).length;

  const undraftedTypes = ALL_DRAFT_TYPES.filter(
    (type) => !entries.some((e) => e.outputType === type),
  );

  const [batchSigningOpen, setBatchSigningOpen] = useState(false);
  const [batchSigningInProgress, setBatchSigningInProgress] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<CdsProtectedOutputType | null>(null);

  const unsignedEntries = entries.filter(
    (entry) => (entry.status === "draft" || entry.status === "edited") && entry.artifact,
  );

  const currentIndex = entries.findIndex((entry) => entry.outputType === current.outputType);
  const nextUnsigned = entries.find(
    (entry) =>
      (entry.status === "draft" || entry.status === "edited") &&
      entry.outputType !== current.outputType,
  );
  const nextEntry =
    currentIndex >= 0 && currentIndex < entries.length - 1
      ? entries[currentIndex + 1]
      : null;

  const handleDiscardWithFallback = (outputType: CdsProtectedOutputType) => {
    if (!onDiscard) return;
    if (current.outputType === outputType) {
      const remaining = entries.filter((e) => e.outputType !== outputType);
      if (remaining.length > 0) {
        const idx = entries.findIndex((e) => e.outputType === outputType);
        const fallback = idx > 0 ? entries[idx - 1] : remaining[0];
        onActiveChange(fallback.outputType);
      }
    }
    onDiscard(outputType);
  };

  const handleFinalize = async (signature: ArtifactSignatureInput) => {
    if (!current.artifact) return;
    await onFinalize(current.artifact, signature);
    if (nextUnsigned) {
      onActiveChange(nextUnsigned.outputType);
    } else if (nextEntry) {
      onActiveChange(nextEntry.outputType);
    }
  };

  const handleBatchSign = async () => {
    if (!specimen) return;
    setBatchSigningInProgress(true);
    try {
      for (const entry of unsignedEntries) {
        if (entry.artifact) {
          await onFinalize(entry.artifact, {
            signerName: specimen.signerName,
            strokes: specimen.strokes,
          });
        }
      }
      setBatchSigningOpen(false);
      if (unsignedEntries.length > 1) {
        toast.success(
          `Signed all ${unsignedEntries.length} documents. The patient cannot see them until released.`,
          { id: "finalize-signature" },
        );
      }
    } finally {
      setBatchSigningInProgress(false);
    }
  };

  return (
    <section
      data-slot="deliverables-deck"
      aria-labelledby="deliverables-heading"
      className="flex min-w-0 flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="deliverables-heading" className="text-[15px] font-bold text-(--text-heading)">
            Plan &amp; deliverables
          </h2>
          {outstanding > 0 ? (
            <span className="flex items-center gap-1 rounded-full border border-(--status-soon-fg)/30 bg-(--status-soon-bg) px-2.5 py-0.5 text-xs font-bold text-(--status-soon-fg)">
              <Clock className="size-3" />
              {outstanding} awaiting your signature
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-(--teal-500)/30 bg-(--status-available-bg) px-2.5 py-0.5 text-xs font-bold text-(--status-available-fg)">
              <CheckCircle2 className="size-3" /> All reviewed &amp; signed
            </span>
          )}

          {gateStatusLabel ? (
            <span className="rounded-full bg-(--surface-accent-soft) px-2.5 py-0.5 text-xs font-bold text-(--teal-800) dark:text-(--teal-300)">
              {gateStatusLabel}
            </span>
          ) : null}

          {/* Quick jump to next unsigned document */}
          {nextUnsigned ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-(--status-soon-fg) border-(--status-soon-fg)/30 bg-(--status-soon-bg)/40 hover:bg-(--status-soon-bg)"
              onClick={() => onActiveChange(nextUnsigned.outputType)}
            >
              <Clock className="size-3 text-(--status-soon-fg)" />
              <span>Next to sign: {OUTPUT_LABELS[nextUnsigned.outputType]}</span>
              <ArrowRight className="size-3" />
            </Button>
          ) : null}

          {/* Batch sign action if doctor has registered specimen and multiple drafts exist */}
          {specimen && unsignedEntries.length > 1 ? (
            <Button
              type="button"
              size="sm"
              className="h-6 gap-1.5 rounded-full px-2.5 text-[11px] font-bold bg-(--action-primary) text-white shadow-2xs hover:bg-(--action-primary-hover)"
              onClick={() => setBatchSigningOpen(true)}
              disabled={busy}
            >
              <PenLine className="size-3" />
              <span>Sign all ({unsignedEntries.length})</span>
            </Button>
          ) : null}
        </div>

        {onDraft && undraftedTypes.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={busy || !canRegenerate}
              className={cn(
                "group flex items-center gap-2 rounded-xl border border-(--teal-600)/30 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-(--teal-800) dark:text-teal-300 shadow-2xs hover:bg-(--teal-50)/80 dark:hover:bg-slate-800 hover:border-(--teal-600)/50 disabled:opacity-50 transition-all cursor-pointer select-none",
              )}
            >
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-(--teal-50) text-(--teal-700) dark:bg-teal-950/60 dark:text-teal-300 border border-(--teal-500)/25 group-hover:bg-(--teal-700) group-hover:text-white transition-colors">
                <Plus className="size-3.5 stroke-[2.5]" />
              </div>
              <span className="font-bold tracking-tight">Add Document</span>
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/80 text-[10px] font-bold text-(--teal-800) dark:text-teal-200">
                {undraftedTypes.length}
              </span>
              <ChevronDown className="size-3.5 text-(--teal-700)/70 group-hover:text-(--teal-700) transition-transform duration-200" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-80 sm:w-88 rounded-2xl border border-(--border-subtle) bg-white dark:bg-slate-900 p-2 shadow-xl"
            >
              {/* Menu Header */}
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-(--navy-800) dark:text-slate-100 uppercase tracking-wider">
                  <FilePlus2 className="size-4 text-(--teal-700)" />
                  <span>Add Clinical Deliverable</span>
                </div>
                <p className="text-[11px] font-normal text-(--text-muted) mt-0.5 leading-snug">
                  Select a document template to draft for this patient encounter:
                </p>
              </div>

              <DropdownMenuSeparator className="my-1 border-t border-slate-100 dark:border-slate-800" />

              {/* Document Items List */}
              <div className="flex flex-col gap-1 py-1">
                {undraftedTypes.map((type) => {
                  const Icon = TOOL_ICONS[type];
                  const label = OUTPUT_LABELS[type];
                  const desc = OUTPUT_DESCRIPTIONS[type];

                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => onDraft(type)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 cursor-pointer text-left transition-colors hover:bg-(--teal-50)/80 dark:hover:bg-slate-800 focus:bg-(--teal-50)/80 dark:focus:bg-slate-800"
                    >
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-(--teal-50) text-(--teal-700) border border-(--teal-500)/25 group-hover:bg-(--teal-700) group-hover:text-white dark:bg-teal-950/60 dark:text-teal-300 dark:group-hover:bg-teal-600 transition-colors shadow-2xs mt-0.5">
                        <Icon className="size-5" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-(--text-heading) group-hover:text-(--navy-800) dark:group-hover:text-white leading-tight">
                          {label}
                        </span>
                        <span className="text-[11px] text-(--text-muted) leading-snug mt-0.5">
                          {desc}
                        </span>
                      </div>

                      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--teal-50) text-(--teal-700) group-hover:bg-(--teal-700) group-hover:text-white dark:bg-teal-950/60 dark:text-teal-300 dark:group-hover:bg-teal-600 dark:group-hover:text-white transition-colors self-center">
                        <Plus className="size-3.5 stroke-[2.5]" />
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <DropdownMenuSeparator className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <div className="px-2.5 py-1.5 text-[10px] text-(--text-muted) flex items-center gap-1.5 leading-snug">
                <Info className="size-3 text-(--teal-700) shrink-0" />
                <span>Documents generate as editable drafts for clinical review and attestation.</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/*
        One unified card -- teal border, white body -- rather than tabs
        floating above a separate card. Its own top section doubles as the
        tab strip, on a muted teal wash. The active tab is pulled down by one
        border-width with its bottom border removed, and its background and
        border color are set to match the card exactly (the same
        `--status-available-*` teal this app already uses for an accented
        card elsewhere), so the strip's own divider line disappears exactly
        where the active tab sits and the two shapes read as one continuous
        outline. Inactive tabs carry no border of their own and sit flat on
        the strip -- there is nothing for them to visually attach to, which
        is the point.
      */}
      <div className="overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-xs">
        <div className="flex items-end gap-2 border-b border-(--border-subtle) bg-(--surface-warm-soft)/40 px-2 pt-2">
          {/*
            A horizontal, scrollable strip rather than a wrapping row: with
            seven possible documents a wrapping strip reflows the whole panel
            every time a draft lands, and the tab under the physician's
            cursor moves.
          */}
          <div
            role="tablist"
            aria-label="Drafted documents"
            className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden"
          >
            {entries.map((entry) => {
              const Icon = TOOL_ICONS[entry.outputType];
              const selected = entry.outputType === current.outputType;
              const provenance = entry.artifact ? computeArtifactProvenance(entry.artifact) : null;
              const isDraft = entry.status === "draft" || entry.status === "edited";
              const isSigned = entry.status === "signed";
              const isReleased = entry.status === "released";
              const isStale = entry.status === "stale";
              const isGenerating = entry.status === "generating";

              return (
                <button
                  key={entry.outputType}
                  type="button"
                  role="tab"
                  id={`deck-tab-${entry.outputType}`}
                  aria-selected={selected}
                  aria-controls={`deck-panel-${entry.outputType}`}
                  data-status={entry.status}
                  onClick={() => onActiveChange(entry.outputType)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-2 text-xs sm:text-sm transition-all select-none",
                    selected
                      ? "z-10 -mb-px border border-(--border-subtle) border-b-0 bg-(--surface-card) font-bold text-(--text-heading) shadow-[0_-2px_6px_rgba(0,0,0,0.03)]"
                      : "border border-transparent bg-transparent text-(--text-muted) hover:text-(--text-heading) hover:bg-(--surface-card)/50 font-medium",
                  )}
                >
                  {/* Semantic Icon Avatar Tile */}
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border transition-all",
                      isDraft
                        ? "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border-amber-500/25"
                        : isSigned
                          ? "bg-sky-500/12 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300 border-sky-500/25"
                          : isReleased
                            ? "bg-teal-500/12 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300 border-teal-500/25"
                            : isStale
                              ? "bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-300 border-red-500/25"
                              : "bg-purple-500/12 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300 border-purple-500/25",
                      selected ? "ring-1.5 ring-current/20 shadow-2xs" : "opacity-85 group-hover:opacity-100",
                    )}
                  >
                    {isGenerating ? (
                      <Spinner className="size-3 text-inherit" />
                    ) : (
                      <Icon className="size-3.5 text-inherit" />
                    )}
                  </span>

                  <span className="whitespace-nowrap font-bold text-inherit">{OUTPUT_LABELS[entry.outputType]}</span>

                  {/* High-visibility Status Badge */}
                  {isSigned ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/80 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-900 dark:border-sky-700/50 dark:bg-sky-950/50 dark:text-sky-200">
                      <PenLine className="size-2.5" /> Signed
                    </span>
                  ) : isReleased ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/80 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900 dark:border-teal-700/50 dark:bg-teal-950/50 dark:text-teal-200">
                      <Check className="size-2.5" /> Released
                    </span>
                  ) : isDraft ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/50 dark:text-amber-200">
                      <Clock className="size-2.5" /> {provenance === "edited" ? "Ready to sign" : "To sign"}
                    </span>
                  ) : isStale ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300/80 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-900 dark:border-red-700/50 dark:bg-red-950/50 dark:text-red-200">
                      <AlertCircle className="size-2.5" /> Outdated
                    </span>
                  ) : null}

                  {/* AI provenance badge on active tab if relevant */}
                  {selected && provenance && provenance !== "neutral" ? (
                    <AiProvenanceChip />
                  ) : null}

                  {/* Discrete Close / Discard trigger on active tab for non-plan, non-released deliverables */}
                  {selected && entry.outputType !== "plan" && entry.status !== "released" && onDiscard ? (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Discard ${OUTPUT_LABELS[entry.outputType]} draft`}
                      title={`Discard ${OUTPUT_LABELS[entry.outputType]}`}
                      className="ml-0.5 flex size-4.5 items-center justify-center rounded-full text-(--text-muted) hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiscardTarget(entry.outputType);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          setDiscardTarget(entry.outputType);
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* The active document's patient-visibility badge, pinned to the
              strip's far right rather than scrolling with the tabs. */}
          <span
            data-slot="artifact-patient-visibility"
            data-patient-readable={isPatientReadableOutput(current.outputType)}
            className={cn(
              "mb-2 shrink-0 rounded-full px-2 py-0.5 text-xs",
              isPatientReadableOutput(current.outputType)
                ? "bg-(--surface-accent-soft) font-bold text-(--status-available-fg)"
                : "bg-(--gray-bg) text-(--gray-fg)",
            )}
          >
            {patientVisibilityCopy(current.outputType).badge}
          </span>
        </div>

        {/*
          The active tab's own bottom edge overlaps this panel's top border by
          one pixel (see `-mb-px` above), so the seam between them disappears
          exactly where the tab sits. `ArtifactCard` renders `embedded` here
          -- no border, no rounded corners, no header of its own -- since this
          panel is that chrome now.
        */}
        <div
          key={current.outputType}
          role="tabpanel"
          id={`deck-panel-${current.outputType}`}
          aria-labelledby={`deck-tab-${current.outputType}`}
          className="min-w-0 max-h-[min(640px,calc(100dvh-16rem))] overflow-y-auto animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
          {STATUS_COPY[current.status] ? (
            <p className="px-4 pt-3 text-sm text-(--text-muted)">{STATUS_COPY[current.status]}</p>
          ) : null}
          {current.artifact ? (
            <ArtifactCard
              embedded
              artifact={current.artifact}
              intake={intake}
              busy={busy}
              regenerating={generating.has(current.outputType)}
              specimen={specimen}
              defaultSignerName={defaultSignerName}
              canRegenerate={canRegenerate}
              onAmend={(payload) => onAmend(current.artifact!, payload)}
              onFinalize={handleFinalize}
              onRelease={() => onRelease(current.artifact!)}
              onRegenerate={() => onRegenerate(current.outputType)}
              onDiscard={onDiscard ? () => handleDiscardWithFallback(current.outputType) : undefined}
              canDiscard={current.outputType !== "plan" && current.status !== "released"}
              onNext={() => {
                if (nextUnsigned) {
                  onActiveChange(nextUnsigned.outputType);
                } else if (nextEntry) {
                  onActiveChange(nextEntry.outputType);
                }
              }}
              hasNext={Boolean(nextUnsigned || nextEntry)}
            />
          ) : (
            <GeneratingPlaceholder
              outputType={current.outputType}
              onCancel={onDiscard ? () => handleDiscardWithFallback(current.outputType) : undefined}
            />
          )}
        </div>
      </div>

      {/* Tab-triggered discard confirmation modal */}
      {discardTarget && onDiscard ? (
        <AlertDialog open={Boolean(discardTarget)} onOpenChange={(open) => !open && setDiscardTarget(null)}>
          <AlertDialogContent className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-6 shadow-xl">
            <AlertDialogHeader className="space-y-1.5 text-left">
              <AlertDialogTitle className="text-base font-bold text-(--text-heading)">
                Discard {OUTPUT_LABELS[discardTarget]} draft?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-(--text-muted) leading-relaxed">
                Are you sure you want to remove this unreviewed {OUTPUT_LABELS[discardTarget].toLowerCase()} draft? It has not been signed or released, and the patient cannot see it. You can re-add it at any time from &ldquo;+ Add Document&rdquo;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
              <AlertDialogCancel className="rounded-full text-xs">
                Keep draft
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs hover:bg-rose-700"
                onClick={() => {
                  const target = discardTarget;
                  setDiscardTarget(null);
                  handleDiscardWithFallback(target);
                }}
              >
                <Trash2 className="size-3.5 mr-1" />
                Discard draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {/* Batch sign confirmation modal */}
      {specimen && unsignedEntries.length > 1 ? (
        <AlertDialog open={batchSigningOpen} onOpenChange={setBatchSigningOpen}>
          <AlertDialogContent className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-6 shadow-xl">
            <AlertDialogHeader className="space-y-1.5 text-left">
              <AlertDialogTitle className="text-base font-bold text-(--text-heading)">
                Sign all {unsignedEntries.length} reviewed documents?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-(--text-muted) leading-relaxed">
                This will finalize and apply your registered digital signature ({specimen.signerName}) to all currently drafted deliverables:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <ul className="space-y-1.5 py-2 text-xs font-semibold text-(--text-body)">
              {unsignedEntries.map((e) => (
                <li key={e.outputType} className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-warm-soft) p-2">
                  <Clock className="size-3.5 text-(--status-soon-fg)" />
                  <span>{OUTPUT_LABELS[e.outputType]}</span>
                  <span className="ml-auto rounded-full border border-(--status-soon-fg)/30 bg-(--status-soon-bg) px-2 py-0.5 text-[10px] font-bold text-(--status-soon-fg)">
                    Draft · To sign
                  </span>
                </li>
              ))}
            </ul>

            <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
              <AlertDialogCancel
                disabled={batchSigningInProgress}
                className="rounded-full text-xs"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={batchSigningInProgress}
                onClick={handleBatchSign}
                className="rounded-full bg-(--action-primary) text-xs font-bold text-white shadow-2xs hover:bg-(--action-primary-hover)"
              >
                {batchSigningInProgress ? (
                  <>
                    <Spinner className="size-3.5 mr-1" />
                    Signing documents…
                  </>
                ) : (
                  <>
                    <PenLine className="size-3.5 mr-1" />
                    Sign all {unsignedEntries.length} documents
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </section>
  );
}

/**
 * What a document looks like while the server is still writing it.

/**
 * What a document looks like while the server is still writing it.
 *
 * Generation previously produced no visible change at all until the artifact
 * arrived — the button simply went quiet — so a physician could not tell a slow
 * draft from a press that had not registered, and pressed again. This occupies
 * the space the document will fill, in the violet that says what is filling it.
 */
function GeneratingPlaceholder({
  outputType,
  onCancel,
}: {
  outputType: CdsProtectedOutputType;
  onCancel?: () => void;
}) {
  return (
    <div
      data-slot="artifact-generating"
      data-output-type={outputType}
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-3 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-(--ai-fg)">
          <PenLine className="size-4" />
          Drafting {OUTPUT_LABELS[outputType].toLowerCase()}…
        </p>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-(--text-muted) hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 h-7 cursor-pointer"
            onClick={onCancel}
          >
            <X className="size-3 text-rose-600" />
            <span>Cancel drafting</span>
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-(--text-muted)">
        You can start another document while this one finishes — nothing is lost by
        moving on.
      </p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
