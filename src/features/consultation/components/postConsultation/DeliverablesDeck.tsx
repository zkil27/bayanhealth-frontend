"use client";

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileBadge,
  FlaskConical,
  Hash,
  PenLine,
  Pill,
  Plus,
  Scan,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ReviewStatusChip,
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
            <span className="rounded-full bg-(--ai-bg-strong) px-2.5 py-0.5 text-xs font-bold text-(--ai-fg)">
              {outstanding} awaiting your signature
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-(--status-available-bg) px-2.5 py-0.5 text-xs font-bold text-(--status-available-fg)">
              <CheckCircle2 className="size-3" /> All reviewed
            </span>
          )}

          {gateStatusLabel ? (
            <span className="rounded-full bg-(--surface-accent-soft) px-2.5 py-0.5 text-xs font-bold text-(--teal-800) dark:text-(--teal-300)">
              {gateStatusLabel}
            </span>
          ) : null}
        </div>

        {onDraft && undraftedTypes.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={busy || !canRegenerate}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-teal-600/40 bg-teal-50/40 px-3 py-1 text-xs font-bold text-(--teal-800) hover:bg-teal-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add Document
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {undraftedTypes.map((type) => {
                const Icon = TOOL_ICONS[type];
                return (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => onDraft(type)}
                    className="flex items-center gap-2 cursor-pointer text-xs py-2"
                  >
                    <Icon className="size-3.5 text-teal-700" />
                    <span>+ {OUTPUT_LABELS[type]}</span>
                  </DropdownMenuItem>
                );
              })}
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

        The two provenance chips ("AI draft (dot) you own it", "Needs your
        review") and the patient-visibility badge used to live inside the
        document's own card header, repeating its name a second time right
        below the tab that already states it. They ride on the tab strip now
        instead -- the chips on the active tab itself, the visibility badge
        pinned to the strip's far right -- so `ArtifactCard` embedded below
        can drop its header entirely and its body can stay the plain white
        the unified card calls for.
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
            // `overflow-y-hidden` is load-bearing, not decorative: per the CSS
            // overflow spec, setting only `overflow-x` to a non-`visible`
            // value forces the browser to treat `overflow-y` as `auto` too, so
            // a stray sub-pixel height mismatch here (icon + chip + dot rows
            // do not all line-height identically) was enough to summon a
            // vertical scrollbar the row never actually needed.
            className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden"
          >
            {entries.map((entry) => {
              const Icon = TOOL_ICONS[entry.outputType];
              const selected = entry.outputType === current.outputType;
              const provenance = entry.artifact ? computeArtifactProvenance(entry.artifact) : null;
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
                    "relative flex shrink-0 items-center gap-2 rounded-t-lg border px-3.5 py-2 text-sm transition-colors",
                    selected
                      ? "z-10 -mb-px border-(--border-subtle) border-b-0 bg-(--surface-card) font-bold text-(--text-heading)"
                      : "border-transparent text-(--text-muted) hover:text-(--text-heading)",
                  )}
                >
                  {entry.status === "generating" ? (
                    <Spinner className="size-4 text-(--ai-fg)" />
                  ) : (
                    <Icon
                      className={cn(
                        "size-4",
                        entry.status === "released" || entry.status === "signed"
                          ? "text-(--status-available-fg)"
                          : entry.status === "stale"
                            ? "text-(--status-soon-fg)"
                            : "text-(--ai-fg)",
                      )}
                    />
                  )}
                  <span className="whitespace-nowrap">{OUTPUT_LABELS[entry.outputType]}</span>

                  {/* The provenance chips ride on the active tab only -- this
                      is what used to sit in this document's own card header,
                      moved up here so its name is not stated twice. */}
                  {selected && provenance && provenance !== "neutral" ? (
                    <>
                      <AiProvenanceChip />
                      {!entry.artifact!.effectiveStale ? (
                        <ReviewStatusChip provenance={provenance} />
                      ) : null}
                    </>
                  ) : null}

                  {/*
                    A dot, not a count, on an inactive tab only -- the active
                    tab already says the same thing with the chips above.
                    There is exactly one live document per type, so a number
                    here would always read "1" and mean nothing; the dot
                    answers the only question an inactive tab is asked -- is
                    this one done.
                  */}
                  {!selected && (entry.status === "draft" || entry.status === "edited") ? (
                    <span aria-hidden className="size-1.5 rounded-full bg-(--ai-accent)" />
                  ) : !selected && entry.status === "stale" ? (
                    <span aria-hidden className="size-1.5 rounded-full bg-(--status-soon-fg)" />
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
          // `key` forces a fresh mount on every switch, which is what makes
          // `animate-in` fire again each time rather than only on the deck's
          // own first render — CSS animation classes trigger on mount, not on
          // a prop changing underneath an element that stays mounted.
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
              onFinalize={(signature) => onFinalize(current.artifact!, signature)}
              onRelease={() => onRelease(current.artifact!)}
              onRegenerate={() => onRegenerate(current.outputType)}
            />
          ) : (
            <GeneratingPlaceholder outputType={current.outputType} />
          )}
        </div>
      </div>
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
function GeneratingPlaceholder({ outputType }: { outputType: CdsProtectedOutputType }) {
  return (
    <div
      data-slot="artifact-generating"
      data-output-type={outputType}
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-3 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-(--ai-fg)">
        <PenLine className="size-4" />
        Drafting {OUTPUT_LABELS[outputType].toLowerCase()}…
      </p>
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
