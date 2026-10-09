"use client";

import { memo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CircleMinus,
  ClipboardList,
  FileBadge,
  FileSignature,
  Hash,
  History,
  PenLine,
  Pill,
  RefreshCw,
  TestTube2,
  Undo2,
  UserCheck,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { StatusText } from "@/components/ui/status-text";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  CdsProtectedArtifact,
  CdsProtectedArtifactPayload,
  CdsProtectedOutputType,
} from "@/types/cds-contract";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";

import {
  ArtifactCard,
  computeArtifactProvenance,
  type ArtifactCommand,
  type ArtifactSignatureInput,
} from "./ArtifactCard";
import { AuthorizedArtifactHistory } from "./AuthorizedArtifactHistory";
import { CareContinuityPanel, followUpStatus, type FollowUpRecommendation } from "./CareContinuityPanel";
import { DOCUMENT_STATUS, provenanceLabel, type DocumentStatus } from "./documentStatus";
import { PhysicianAuthoringForm } from "./PhysicianAuthoringPanel";
import { OUTPUT_LABELS } from "./workspacePhase";
import { isPatientReadableOutput } from "../../lib/cdsCopy";

const TOOL_ICONS: Record<CdsProtectedOutputType, React.ComponentType<{ className?: string }>> = {
  plan: ClipboardList,
  prescription: Pill,
  final_icd: Hash,
  medical_certificate: FileBadge,
  diagnostic_request: TestTube2,
  clinical_referral: UserCheck,
  patient_education: BookOpen,
};

const OUTPUT_DESCRIPTIONS: Record<CdsProtectedOutputType, string> = {
  plan: "Your goals, interventions and follow-up for this encounter. Kept in your records.",
  prescription: "Electronic prescription with medications, doses and directions.",
  medical_certificate: "Work or school certificate with diagnosis and rest dates.",
  diagnostic_request: "Laboratory, urinalysis and imaging orders in one request.",
  clinical_referral: "Referral letter to a specialist or receiving facility.",
  patient_education: "Home-care guide and warning signs, in English or Filipino.",
  final_icd: "ICD-10 coding for the confirmed diagnosis.",
};

/** Every document row, in the order a consultation usually produces them. */
export const CHECKLIST_TYPES: readonly CdsProtectedOutputType[] = [
  "plan",
  "prescription",
  "medical_certificate",
  "diagnostic_request",
  "clinical_referral",
  "patient_education",
];

/** A row in the checklist: a document type, or one of the two extra rows. */
export type ChecklistKey = CdsProtectedOutputType | "follow_up" | "history";

export type DeckStatus = "generating" | "draft" | "edited" | "signed" | "released" | "stale";

export interface DeckEntry {
  outputType: CdsProtectedOutputType;
  status: DeckStatus;
  /** Absent while a first draft of this type is still generating. */
  artifact?: CdsProtectedArtifact;
}

/**
 * Build the started documents from current artifacts plus whatever is
 * generating. Kept pure and exported so the workspace (next-step bar, finish
 * readiness) and the checklist cannot disagree about which documents exist.
 */
export function deriveDeckEntries(input: {
  artifacts: readonly CdsProtectedArtifact[];
  generating: ReadonlySet<CdsProtectedOutputType>;
  /** Types rendered elsewhere on the page (Final ICD lives in the Assessment). */
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
    // A redraft of something already started keeps its content visible; only
    // a first draft gets a placeholder of its own.
    if (entries.some((entry) => entry.outputType === outputType)) continue;
    entries.push({ outputType, status: "generating" });
  }

  return entries;
}

/** The single vocabulary status for a started document. */
export function entryStatus(entry: DeckEntry | undefined): DocumentStatus {
  if (!entry) return "not_started";
  switch (entry.status) {
    case "generating":
      return "drafting";
    case "draft":
    case "edited":
      return "needs_review";
    default:
      return entry.status;
  }
}

/** Whether a started document still needs something from the physician. */
function needsAction(entry: DeckEntry): boolean {
  const status = entryStatus(entry);
  if (status === "needs_review" || status === "stale") return true;
  // Signed patient documents still need releasing; Plan's last step is signing.
  return status === "signed" && isPatientReadableOutput(entry.outputType);
}

export interface ChecklistProgress {
  /** Documents with nothing left to do. */
  done: number;
  /** Documents started (drafted, written, or drafting). */
  started: number;
  /** The first document that needs the physician, and what it needs. */
  next: { outputType: CdsProtectedOutputType; verb: string } | null;
}

/**
 * Progress for the next-step bar, from the same entries the checklist shows.
 * `prefer` is the open row: when it still needs something, it is the next
 * step, so the bar never points away from the document already in front of
 * the physician.
 */
export function checklistProgress(
  entries: readonly DeckEntry[],
  prefer?: ChecklistKey | null,
): ChecklistProgress {
  const ordered = CHECKLIST_TYPES.map((type) => entries.find((entry) => entry.outputType === type)).filter(
    (entry): entry is DeckEntry => Boolean(entry),
  );
  const preferred = ordered.find((entry) => entry.outputType === prefer);
  const pending = preferred && needsAction(preferred) ? preferred : ordered.find(needsAction);
  const verbFor = (entry: DeckEntry) => {
    const status = entryStatus(entry);
    if (status === "stale") return "Redraft";
    if (status === "signed") return "Release";
    return "Review";
  };
  return {
    done: ordered.filter((entry) => entryStatus(entry) !== "drafting" && !needsAction(entry)).length,
    started: ordered.length,
    next: pending ? { outputType: pending.outputType, verb: verbFor(pending) } : null,
  };
}

/**
 * Plan and documents, as a checklist.
 *
 * Every document type is always a row with one status, as in the NHS and
 * GOV.UK task-list pattern. A doctor seeing this for the first time can tell
 * what exists, what is left, and where to start without reading anything else.
 * It replaces three things that grew up separately:
 *
 * - a tab strip that only showed documents already drafted, cut off mid-word
 *   past four tabs, and carried four badges per tab;
 * - an "Add Document" menu and a row of "+ Prescription" chips that drafted
 *   with AI; and
 * - a "Write a document yourself" card whose chips, also "+ Prescription",
 *   opened a blank form.
 *
 * Now an unstarted row offers both choices side by side: Draft with AI, or
 * Write it myself. Follow-up and earlier versions are rows in the same list,
 * because they are part of the Plan too.
 *
 * Keyboard (desktop): ↑ / ↓ move between rows, E edits the open draft, S opens
 * its Sign dialog. Signing still needs the attestation tick, and releasing
 * still needs the two-second hold.
 */
export const DeliverablesDeck = memo(function DeliverablesDeck({
  entries,
  active,
  onActiveChange,
  busy,
  generating,
  specimen,
  defaultSignerName,
  draftingOpen,
  aiEligibleTypes,
  aiUnavailableReason,
  onAmend,
  onFinalize,
  onRelease,
  onDraft,
  onAuthor,
  onDiscard,
  cancellableTypes,
  onCancelDraft,
  intake,
  followUp,
  history,
  historyCursor,
  onLoadMoreHistory,
  onInspectHistory,
  mobileDetail,
  onCloseMobileDetail,
  notNeeded,
  removedDraftTypes,
  onNotNeeded,
  onRestore,
  onRefresh,
}: {
  entries: readonly DeckEntry[];
  active: ChecklistKey | null;
  onActiveChange: (key: ChecklistKey) => void;
  busy: boolean;
  generating: ReadonlySet<CdsProtectedOutputType>;
  specimen?: DoctorSignatureSpecimen | undefined;
  defaultSignerName?: string;
  /** No lock is holding drafting. */
  draftingOpen: boolean;
  /** Types the confirmed Assessment allows the AI to draft. */
  aiEligibleTypes: ReadonlySet<CdsProtectedOutputType>;
  /** Why AI drafting is closed, when it is closed for every type. */
  aiUnavailableReason?: string;
  onAmend: (artifact: CdsProtectedArtifact, payload: CdsProtectedArtifactPayload) => Promise<void>;
  onFinalize: (artifact: CdsProtectedArtifact, signature: ArtifactSignatureInput) => Promise<void>;
  onRelease: (artifact: CdsProtectedArtifact) => void;
  /** Draft (or redraft) with AI. */
  onDraft: (outputType: CdsProtectedOutputType) => void;
  /** Save a document the physician wrote. Rejects to keep the editor open. */
  onAuthor: (outputType: CdsProtectedOutputType, payload: CdsProtectedArtifactPayload) => Promise<void>;
  onDiscard: (outputType: CdsProtectedOutputType) => void;
  /** Types with a background job the physician can cancel. */
  cancellableTypes?: ReadonlySet<CdsProtectedOutputType>;
  onCancelDraft?: (outputType: CdsProtectedOutputType) => void;
  intake?: BookingIntakeForm | null;
  followUp: FollowUpRecommendation;
  history: readonly CdsProtectedArtifact[];
  historyCursor?: string;
  onLoadMoreHistory: () => void;
  onInspectHistory: (artifact: CdsProtectedArtifact) => void;
  /**
   * Phone only (below `lg`): whether the open row is shown as its own screen
   * instead of the list. Owned by the workspace, which keeps it in the URL so
   * the phone's back gesture returns to the list.
   */
  mobileDetail: boolean;
  onCloseMobileDetail: () => void;
  /** Documents the physician removed or marked not needed. */
  notNeeded: ReadonlySet<CdsProtectedOutputType>;
  /** Of those, the ones that had a draft (adding back restores it). */
  removedDraftTypes: ReadonlySet<CdsProtectedOutputType>;
  onNotNeeded: (outputType: CdsProtectedOutputType) => void;
  onRestore: (outputType: CdsProtectedOutputType) => void;
  /** Reload the server state (offered at the foot of the list on a phone). */
  onRefresh?: () => void;
}) {
  const [authoring, setAuthoring] = useState<CdsProtectedOutputType | null>(null);
  const [batchSigningOpen, setBatchSigningOpen] = useState(false);
  const [batchSigningInProgress, setBatchSigningInProgress] = useState(false);
  // Drafts whose pane has shown them, and the ones ticked in the batch-sign
  // dialog. Batch sign pre-ticks only drafts the physician has opened or
  // edited, so nothing is signed unseen without an explicit tick.
  const [openedTypes, setOpenedTypes] = useState<ReadonlySet<CdsProtectedOutputType>>(() => new Set());
  const [batchSelection, setBatchSelection] = useState<ReadonlySet<CdsProtectedOutputType>>(() => new Set());
  const [command, setCommand] = useState<ArtifactCommand | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const entryFor = (type: CdsProtectedOutputType) => entries.find((entry) => entry.outputType === type);
  const rowKeys: ChecklistKey[] = [...CHECKLIST_TYPES, "follow_up", "history"];

  // With nothing chosen, open the first document that needs the physician,
  // else the first row.
  const firstPending = CHECKLIST_TYPES.find((type) => {
    const entry = entryFor(type);
    return entry ? needsAction(entry) : false;
  });
  const selected: ChecklistKey = active ?? firstPending ?? "plan";
  const statusOf = (type: CdsProtectedOutputType): DocumentStatus =>
    notNeeded.has(type) ? "not_needed" : entryStatus(entryFor(type));
  const selectedIsDocument = selected !== "follow_up" && selected !== "history";
  const selectedNotNeeded = selectedIsDocument && notNeeded.has(selected);

  const selectedEntry = !selectedIsDocument || selectedNotNeeded ? undefined : entryFor(selected);
  if (
    selectedEntry?.artifact
    && entryStatus(selectedEntry) === "needs_review"
    && !openedTypes.has(selectedEntry.outputType)
  ) {
    setOpenedTypes((prev) => new Set(prev).add(selectedEntry.outputType));
  }

  const unsignedEntries = entries.filter(
    (entry) => entryStatus(entry) === "needs_review" && entry.artifact,
  );
  const isOpenedOrEdited = (entry: DeckEntry) =>
    openedTypes.has(entry.outputType)
    || (entry.artifact ? computeArtifactProvenance(entry.artifact) === "edited" : false);
  const batchEntries = unsignedEntries.filter((entry) => batchSelection.has(entry.outputType));

  const select = (key: ChecklistKey) => {
    if (key !== selected) setAuthoring(null);
    onActiveChange(key);
  };

  /** After signing or "Next document": the next document that still needs something. */
  const nextPendingAfter = (type: CdsProtectedOutputType) => {
    const index = CHECKLIST_TYPES.indexOf(type);
    const ordered = [...CHECKLIST_TYPES.slice(index + 1), ...CHECKLIST_TYPES.slice(0, index)];
    return ordered.find((candidate) => {
      const entry = entryFor(candidate);
      return entry ? needsAction(entry) : false;
    });
  };

  const handleFinalize = async (artifact: CdsProtectedArtifact, signature: ArtifactSignatureInput) => {
    await onFinalize(artifact, signature);
    // Patient documents stay open after signing, so Release is the next thing
    // in view; records-only documents are finished, so move on.
    if (!isPatientReadableOutput(artifact.outputType)) {
      const next = nextPendingAfter(artifact.outputType);
      if (next) onActiveChange(next);
    }
  };

  const handleDiscard = (outputType: CdsProtectedOutputType) => {
    onDiscard(outputType);
    onActiveChange(outputType);
  };

  const openBatchSigning = () => {
    setBatchSelection(new Set(unsignedEntries.filter(isOpenedOrEdited).map((entry) => entry.outputType)));
    setBatchSigningOpen(true);
  };

  const toggleBatchEntry = (outputType: CdsProtectedOutputType, checked: boolean) =>
    setBatchSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(outputType);
      else next.delete(outputType);
      return next;
    });

  const handleBatchSign = async () => {
    if (!specimen) return;
    setBatchSigningInProgress(true);
    try {
      for (const entry of batchEntries) {
        if (entry.artifact) {
          await onFinalize(entry.artifact, { signerName: specimen.signerName, strokes: specimen.strokes });
        }
      }
      setBatchSigningOpen(false);
      if (batchEntries.length > 1) {
        toast.success(`Signed ${batchEntries.length} documents. The patient sees them only after you release them.`, {
          id: "finalize-signature",
        });
      }
    } catch {
      // The workspace already showed which document failed. Stop there and
      // keep the sheet open; anything signed before it stays signed.
    } finally {
      setBatchSigningInProgress(false);
    }
  };

  /**
   * ↑ / ↓ inside the list move the selection; E and S anywhere in the
   * checklist (outside a text field) act on the open document.
   */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu']")) return;

    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && target.closest("[data-slot='checklist-rows']")) {
      event.preventDefault();
      const index = rowKeys.indexOf(selected);
      const nextIndex =
        event.key === "ArrowDown" ? Math.min(rowKeys.length - 1, index + 1) : Math.max(0, index - 1);
      const key = rowKeys[nextIndex]!;
      select(key);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-row='${key}']`)?.focus();
      return;
    }
    const key = event.key.toLowerCase();
    if ((key === "e" || key === "s") && selectedEntry?.artifact) {
      event.preventDefault();
      setCommand({ action: key === "e" ? "edit" : "sign", nonce: Date.now() });
    }
  };

  const followUpState = followUpStatus(followUp);

  return (
    <div
      data-slot="document-checklist"
      onKeyDown={handleKeyDown}
      className="grid min-w-0 lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      {/* The list */}
      <nav
        aria-label="Documents"
        className={cn(
          "flex min-w-0 flex-col gap-2 p-2 sm:p-3 lg:sticky lg:top-4 lg:self-start",
          mobileDetail && "max-lg:hidden",
        )}
      >
        {specimen && unsignedEntries.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            shape="pill"
            className="mx-1 justify-center border-(--border-default) max-lg:h-11"
            disabled={busy}
            onClick={openBatchSigning}
          >
            <FileSignature className="size-4" /> Sign several ({unsignedEntries.length})
          </Button>
        ) : null}

        <ul ref={listRef} data-slot="checklist-rows" className="flex flex-col gap-0.5">
          {CHECKLIST_TYPES.map((type) => {
            const Icon = TOOL_ICONS[type];
            const status = DOCUMENT_STATUS[statusOf(type)];
            return (
              <li key={type}>
                <ChecklistRow
                  rowKey={type}
                  muted={notNeeded.has(type)}
                  selected={selected === type}
                  onSelect={select}
                  icon={generating.has(type) ? undefined : Icon}
                  spinning={generating.has(type)}
                  label={OUTPUT_LABELS[type]}
                  status={
                    <StatusText tone={status.tone} icon={status.icon} size="sm">
                      {status.label}
                    </StatusText>
                  }
                />
              </li>
            );
          })}
          <li aria-hidden className="mx-3 my-1.5 border-t border-(--border-subtle)" />
          <li>
            <ChecklistRow
              rowKey="follow_up"
              selected={selected === "follow_up"}
              onSelect={select}
              icon={CalendarClock}
              label="Follow-up"
              status={
                <StatusText tone={followUpState.tone} size="sm">
                  {followUpState.label}
                </StatusText>
              }
            />
          </li>
          <li>
            <ChecklistRow
              rowKey="history"
              selected={selected === "history"}
              onSelect={select}
              icon={History}
              label="Earlier versions"
              status={
                history.length > 0 ? (
                  <span className="text-xs font-semibold text-(--text-muted) tabular-nums">{history.length}</span>
                ) : null
              }
            />
          </li>
        </ul>

        <p className="mx-3 mt-1 hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-(--text-muted) lg:flex">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move · <Kbd>E</Kbd> edit · <Kbd>S</Kbd> sign
        </p>
        {onRefresh ? (
          <Button
            type="button"
            variant="ghost"
            shape="pill"
            className="mx-1 h-11 justify-center gap-1.5 text-(--text-muted) lg:hidden"
            disabled={busy}
            onClick={onRefresh}
          >
            <RefreshCw className="size-4" /> Not seeing a document? Refresh
          </Button>
        ) : null}
      </nav>

      {/* The open row */}
      <div
        className={cn(
          "flex min-w-0 flex-col border-(--border-subtle) lg:border-l",
          !mobileDetail && "max-lg:hidden",
        )}
      >
        <PaneHeader
          selected={selected}
          entry={selectedEntry}
          notNeeded={selectedNotNeeded}
          onBack={onCloseMobileDetail}
        />

        <div key={selected} className="min-w-0">
          {selected === "follow_up" ? (
            <CareContinuityPanel followUp={followUp} />
          ) : selected === "history" ? (
            <AuthorizedArtifactHistory
              history={history}
              cursor={historyCursor}
              busy={busy}
              onLoadMore={onLoadMoreHistory}
              onInspectArtifact={onInspectHistory}
            />
          ) : selectedNotNeeded ? (
            <NotNeededPane
              outputType={selected}
              hasDraft={removedDraftTypes.has(selected)}
              onRestore={() => onRestore(selected)}
            />
          ) : authoring === selected && !selectedEntry ? (
            <div className="p-4 sm:p-5">
              <PhysicianAuthoringForm
                outputType={selected}
                busy={busy}
                onCancel={() => setAuthoring(null)}
                onSave={async (type, payload) => {
                  await onAuthor(type, payload);
                  setAuthoring(null);
                }}
              />
            </div>
          ) : selectedEntry?.artifact ? (
            <ArtifactCard
              artifact={selectedEntry.artifact}
              intake={intake}
              busy={busy}
              regenerating={generating.has(selected)}
              specimen={specimen}
              defaultSignerName={defaultSignerName}
              canRegenerate={draftingOpen && aiEligibleTypes.has(selected)}
              onAmend={(payload) => onAmend(selectedEntry.artifact!, payload)}
              onFinalize={(signature) => handleFinalize(selectedEntry.artifact!, signature)}
              onRelease={() => onRelease(selectedEntry.artifact!)}
              onRegenerate={() => onDraft(selected)}
              onDiscard={() => handleDiscard(selected)}
              canDiscard={entryStatus(selectedEntry) === "needs_review"}
              onNext={() => {
                const next = nextPendingAfter(selected);
                if (next) onActiveChange(next);
              }}
              hasNext={Boolean(nextPendingAfter(selected))}
              command={command}
            />
          ) : selectedEntry ? (
            <GeneratingPlaceholder
              outputType={selected}
              onCancel={cancellableTypes?.has(selected) && onCancelDraft ? () => onCancelDraft(selected) : undefined}
            />
          ) : (
            <StartDocument
              outputType={selected}
              busy={busy}
              aiAvailable={draftingOpen && aiEligibleTypes.has(selected)}
              aiUnavailableReason={
                !draftingOpen
                  ? aiUnavailableReason ?? "AI drafting is on hold. You can still write it yourself."
                  : "AI drafting isn't available for this diagnosis. You can write it yourself."
              }
              onDraft={() => onDraft(selected)}
              onWrite={() => setAuthoring(selected)}
              onNotNeeded={selected === "plan" ? undefined : () => onNotNeeded(selected)}
            />
          )}
        </div>
      </div>

      {specimen && unsignedEntries.length > 1 ? (
        <ResponsiveSheet
          open={batchSigningOpen}
          onOpenChange={(open) => !batchSigningInProgress && setBatchSigningOpen(open)}
          icon={FileSignature}
          title="Sign the documents you reviewed?"
          description={`Your saved signature (${specimen.signerName}) goes on each ticked document. Drafts you have not opened start unticked: open them first, or tick them to confirm you reviewed them.`}
          footer={
            <>
              <Button
                type="button"
                variant="primary"
                shape="pill"
                disabled={batchSigningInProgress || batchEntries.length === 0}
                onClick={handleBatchSign}
              >
                {batchSigningInProgress ? <Spinner className="size-4" /> : <FileSignature className="size-4" />}
                {batchSigningInProgress
                  ? "Signing…"
                  : `Sign ${batchEntries.length} ${batchEntries.length === 1 ? "document" : "documents"}`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                shape="pill"
                disabled={batchSigningInProgress}
                onClick={() => setBatchSigningOpen(false)}
              >
                Cancel
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-1.5">
            {unsignedEntries.map((entry) => {
              const edited = entry.artifact ? computeArtifactProvenance(entry.artifact) === "edited" : false;
              const opened = openedTypes.has(entry.outputType);
              return (
                <li key={entry.outputType}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-2 text-sm font-medium text-(--text-body)">
                    <Checkbox
                      aria-label={`Sign ${OUTPUT_LABELS[entry.outputType]}`}
                      checked={batchSelection.has(entry.outputType)}
                      disabled={batchSigningInProgress}
                      onCheckedChange={(checked) => toggleBatchEntry(entry.outputType, checked === true)}
                    />
                    <span>{OUTPUT_LABELS[entry.outputType]}</span>
                    <StatusText tone={edited || opened ? "neutral" : "attention"} size="sm" className="ml-auto">
                      {edited ? "Edited" : opened ? "Opened" : "Not opened yet"}
                    </StatusText>
                  </label>
                </li>
              );
            })}
          </ul>
        </ResponsiveSheet>
      ) : null}
    </div>
  );
});

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-card) px-1 font-sans text-xs font-semibold text-(--text-body)">
      {children}
    </kbd>
  );
}

function ChecklistRow({
  rowKey,
  muted = false,
  selected,
  onSelect,
  icon: Icon,
  spinning,
  label,
  status,
}: {
  rowKey: ChecklistKey;
  /** Not needed: still listed so it can be added back, but stepped back. */
  muted?: boolean;
  selected: boolean;
  onSelect: (key: ChecklistKey) => void;
  icon?: React.ComponentType<{ className?: string }>;
  spinning?: boolean;
  label: string;
  status: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-row={rowKey}
      aria-current={selected ? "true" : undefined}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(rowKey)}
      className={cn(
        "flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none lg:min-h-11",
        selected
          ? "bg-(--surface-accent-soft) font-semibold text-(--text-heading) ring-1 ring-(--action-primary)/25 ring-inset"
          : muted
            ? "font-medium text-(--text-muted) hover:bg-(--surface-warm-soft)"
            : "font-medium text-(--text-body) hover:bg-(--surface-warm-soft)",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-(--surface-card) text-(--action-primary-active)" : "bg-(--surface-warm-soft) text-(--text-muted)",
        )}
      >
        {spinning ? <Spinner className="size-3.5" /> : Icon ? <Icon className="size-4" /> : null}
      </span>
      {/* Wraps the status under the name instead of truncating the name in a narrow list. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 leading-snug">{label}</span>
        {status}
      </span>
    </button>
  );
}

/** Title, status and the facts about the open row: who wrote it, who can see it. */
function PaneHeader({
  selected,
  entry,
  notNeeded,
  onBack,
}: {
  selected: ChecklistKey;
  entry?: DeckEntry;
  notNeeded: boolean;
  onBack: () => void;
}) {
  const title =
    selected === "follow_up" ? "Follow-up" : selected === "history" ? "Earlier versions" : OUTPUT_LABELS[selected];
  const status =
    selected === "follow_up" || selected === "history"
      ? null
      : DOCUMENT_STATUS[notNeeded ? "not_needed" : entryStatus(entry)];
  const patientReadable = selected !== "follow_up" && selected !== "history" && isPatientReadableOutput(selected);
  const meta = [
    entry?.artifact ? provenanceLabel(entry.artifact) : null,
    selected === "follow_up"
      ? "Optional"
      : selected === "history"
        ? null
        : patientReadable
          ? "Patient sees it after release"
          : "Your records only",
    entry?.artifact ? `Assessment v${entry.artifact.assessmentVersion} · version ${entry.artifact.artifactRevision}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-(--border-subtle) px-4 py-3 sm:px-5 max-lg:pt-1.5">
      <Button
        type="button"
        variant="ghost"
        shape="pill"
        className="-ml-2 h-11 gap-1.5 px-2 text-(--text-link) lg:hidden"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" /> Documents
      </Button>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3 className="text-base font-bold text-(--text-heading)">{title}</h3>
        {status ? (
          <StatusText tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusText>
        ) : null}
        {meta.length > 0 ? (
          <p className="w-full text-xs text-(--text-muted) sm:ml-auto sm:w-auto">{meta.join(" · ")}</p>
        ) : null}
      </div>
    </div>
  );
}

/** An unstarted document: what it is, and the two ways to start it. */
function StartDocument({
  outputType,
  busy,
  aiAvailable,
  aiUnavailableReason,
  onDraft,
  onWrite,
  onNotNeeded,
}: {
  outputType: CdsProtectedOutputType;
  busy: boolean;
  aiAvailable: boolean;
  aiUnavailableReason: string;
  onDraft: () => void;
  onWrite: () => void;
  /** Omitted for the Plan, which every consultation keeps. */
  onNotNeeded?: () => void;
}) {
  const label = OUTPUT_LABELS[outputType].toLowerCase();
  return (
    <div data-slot="start-document" className="flex flex-col gap-4 p-4 sm:p-5">
      <p className="text-sm text-(--text-body)">{OUTPUT_DESCRIPTIONS[outputType]}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <StartOption
          icon={FileText}
          title="Draft with AI"
          description={
            aiAvailable
              ? `A first draft from your confirmed Assessment. You review, edit and sign it.`
              : aiUnavailableReason
          }
          disabled={busy || !aiAvailable}
          onClick={onDraft}
          tone="ai"
        />
        <StartOption
          icon={PenLine}
          title="Write it myself"
          description={`Start from a blank ${label}. No AI involved.`}
          disabled={busy}
          onClick={onWrite}
        />
      </div>
      {onNotNeeded ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-(--border-subtle) pt-3">
          <Button
            type="button"
            variant="ghost"
            shape="pill"
            className="-ml-2 h-11 gap-1.5 px-3 text-(--text-muted) hover:text-(--text-heading) lg:h-9"
            disabled={busy}
            onClick={onNotNeeded}
          >
            <CircleMinus className="size-4" /> Not needed for this patient
          </Button>
          <span className="text-xs text-(--text-muted)">You can add it back any time.</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A document the physician removed or marked not needed. It stays in the
 * list so the decision is visible and reversible, and Finish stops counting
 * it as missing.
 */
function NotNeededPane({
  outputType,
  hasDraft,
  onRestore,
}: {
  outputType: CdsProtectedOutputType;
  /** A removed draft exists and comes back exactly as it was. */
  hasDraft: boolean;
  onRestore: () => void;
}) {
  const label = OUTPUT_LABELS[outputType].toLowerCase();
  return (
    <div data-slot="not-needed" className="flex flex-col items-start gap-3 p-4 sm:p-5">
      <p className="text-sm text-(--text-body)">
        {hasDraft
          ? `You removed this ${label} draft. The patient never saw it. Adding it back restores the draft as it was.`
          : `You marked the ${label} as not needed for this consultation. It won't be listed as missing when you finish.`}
      </p>
      <Button
        type="button"
        variant="outline"
        shape="pill"
        className="h-11 border-(--border-default) lg:h-9"
        onClick={onRestore}
      >
        <Undo2 className="size-4" /> Add it back
      </Button>
    </div>
  );
}

function StartOption({
  icon: Icon,
  title,
  description,
  disabled,
  onClick,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  tone?: "neutral" | "ai";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex min-h-24 items-start gap-3 rounded-xl border bg-(--surface-card) p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none disabled:cursor-not-allowed",
        disabled
          ? "border-dashed border-(--border-default)"
          : tone === "ai"
            ? "border-(--ai-border)/60 hover:bg-(--ai-bg)"
            : "border-(--border-default) hover:border-(--action-primary)/60 hover:bg-(--surface-warm-soft)",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          disabled
            ? "bg-(--gray-bg) text-(--text-subtle)"
            : tone === "ai"
              ? "bg-(--ai-bg) text-(--ai-fg)"
              : "bg-(--surface-accent-soft) text-(--action-primary-active)",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm font-semibold", disabled ? "text-(--text-muted)" : "text-(--text-heading)")}>
          {title}
        </span>
        <span className="text-sm leading-snug text-(--text-muted)">{description}</span>
      </span>
    </button>
  );
}

/**
 * What a document looks like while the server is still writing it, so a slow
 * draft never looks like a press that did not register.
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
      className="flex flex-col gap-3 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-(--ai-fg)">
          <Spinner className="size-4" />
          Drafting the {OUTPUT_LABELS[outputType].toLowerCase()}…
        </p>
        {onCancel ? (
          <Button type="button" variant="ghost" shape="pill" onClick={onCancel}>
            Cancel draft
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-(--text-muted)">
        You can open another document while this finishes. Nothing is lost by moving on.
      </p>
      <div className="flex flex-col gap-2 rounded-xl bg-(--surface-warm-soft) p-3.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
