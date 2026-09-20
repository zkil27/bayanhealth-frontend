"use client";

import { useCallback } from "react";
import { BrainCircuit, Cpu, Microscope } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  fetchCdsDrafts,
  isCdsGenerationInProgress,
  type CdsDraft,
  type CdsDraftList,
  type CdsDraftLayer,
  type CdsGenerationStatus,
} from "../../lib/api/cdsDrafts";

interface CdsDraftsPanelProps {
  /** Consultation whose CDS drafts to display. */
  consultationId: string;
  /** Optional layer filter passed through to the backend (`soap` | `patient-card`). */
  layer?: CdsDraftLayer;
  /**
   * Latest known status of the asynchronous CDS generation job, if any. When it
   * is `queued`/`running`, an in-progress indicator is shown distinct from the
   * generic loading state (Requirement 12.8).
   */
  generationStatus?: CdsGenerationStatus | null;
}

/**
 * Backend-wired CDS draft display (Slice 7, task 13.3).
 *
 * Renders `GET /v1/cds/consultations/{consultationId}/drafts` through
 * {@link AsyncView}, which standardises the loading → (data | empty | error)
 * states with a 10s timeout:
 * - data:    the returned drafts are displayed (Requirement 12.7);
 * - empty:   when no drafts exist yet, either the in-progress indicator (if
 *            generation is still running) or a defined empty state is shown;
 * - error:   a defined error state with a retry control on failure/timeout.
 *
 * While CDS drafts are still being generated (the generation job is
 * `queued`/`running`), a distinct in-progress indicator is rendered — separate
 * from the generic loading spinner — so the doctor knows more output is coming
 * (Requirement 12.8).
 */
export function CdsDraftsPanel({
  consultationId,
  layer,
  generationStatus,
}: CdsDraftsPanelProps) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const generating = isCdsGenerationInProgress(generationStatus);

  const fetcher = useCallback(
    () => fetchCdsDrafts(consultationId, idToken ?? "", layer),
    [consultationId, idToken, layer],
  );

  return (
    <div data-slot="cds-drafts-panel" className="flex w-full flex-col gap-2 rounded-xl p-4">
      <div className="flex w-full items-center justify-between gap-1">
        <span className="flex items-center gap-2 text-lg font-bold">
          <BrainCircuit className="size-5 text-primary" />
          Clinical Decision Support
        </span>
        {generating ? <CdsGeneratingBadge /> : null}
      </div>

      <AsyncView<CdsDraftList>
        fetcher={fetcher}
        deps={[consultationId, idToken, layer]}
        isEmpty={(list) => list.drafts.length === 0}
        empty={generating ? <CdsDraftsGenerating /> : <CdsDraftsEmpty />}
      >
        {(list) => (
          <div data-slot="cds-drafts-list" className="flex flex-col gap-3">
            {list.drafts.map((draft) => (
              <CdsDraftCard key={draft.draftId} draft={draft} />
            ))}
            {generating ? <CdsDraftsGenerating /> : null}
          </div>
        )}
      </AsyncView>
    </div>
  );
}

/** A single CDS draft rendered as a reviewable card (Requirement 12.7). */
function CdsDraftCard({ draft }: { draft: CdsDraft }) {
  const status = displayDraftStatus(draft.status);
  return (
    <Card data-slot="cds-draft-item" size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Microscope className="size-4 text-muted-foreground" />
          {displayLayer(draft.layer)}
        </CardTitle>
        <CardDescription>Draft #{draft.draftId}</CardDescription>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Badge
            data-slot="cds-draft-status"
            variant="outline"
            data-tone={status.tone}
          >
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CdsProvenance source={draft.source} modelUsed={draft.modelUsed} />
        <CdsDraftContent content={draft.content} />
      </CardContent>
    </Card>
  );
}

/**
 * Show whether a draft came from live inference or the deterministic template,
 * and which model produced it.
 *
 * The backend already records both on every draft (`source`, `modelUsed`). They
 * are worth surfacing because a provider failure is not otherwise visible: the
 * pipeline degrades to the template on purpose, and without this the reader
 * cannot tell a model's output from a fallback, or attribute output to the
 * model actually configured at generation time.
 */
function CdsProvenance({
  source,
  modelUsed,
}: {
  source?: CdsDraft["source"];
  modelUsed?: string;
}) {
  if (!source && !modelUsed) return null;

  const isTemplate = source === "template";

  return (
    <div
      data-slot="cds-draft-provenance"
      className="flex flex-wrap items-center gap-2"
    >
      {source ? (
        <Badge
          data-slot="cds-draft-source"
          variant="outline"
          data-tone={isTemplate ? "warning" : "success"}
        >
          <Cpu className="size-3" />
          {isTemplate ? "Deterministic template" : "Live model"}
        </Badge>
      ) : null}
      {modelUsed && !isTemplate ? (
        <span
          data-slot="cds-draft-model"
          className="font-mono text-xs text-muted-foreground"
          title={modelUsed}
        >
          {modelUsed}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Render a draft's opaque `content` object in a readable, non-blank way. SOAP
 * sections are surfaced as labelled blocks; anything else is shown as
 * formatted key/value text so no draft renders empty.
 */
function CdsDraftContent({ content }: { content: CdsDraft["content"] }) {
  if (!content || typeof content !== "object") {
    return (
      <p className="text-sm text-muted-foreground">
        No draft content was provided.
      </p>
    );
  }

  const entries = Object.entries(content).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No draft content was provided.
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {humanizeKey(key)}
          </dt>
          <dd className="text-sm whitespace-pre-wrap text-foreground">
            {stringifyValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Distinct in-progress indicator shown while CDS generation is still running
 * (Requirement 12.8). Deliberately separate from the generic AsyncView loading
 * spinner so it is recognisable as "more drafts are on the way".
 */
function CdsDraftsGenerating() {
  return (
    <div
      data-slot="cds-drafts-generating"
      className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-5 text-primary" />
      <span className="text-sm font-medium">
        Generating clinical decision support drafts…
      </span>
      <span className="text-xs">
        This can take a few moments. Drafts will appear here as they&apos;re ready.
      </span>
    </div>
  );
}

/** Compact in-progress badge shown in the panel header during generation. */
function CdsGeneratingBadge() {
  return (
    <Badge data-slot="cds-generating-badge" variant="secondary" className="gap-1">
      <Spinner className="size-3" />
      Generating
    </Badge>
  );
}

/** Defined empty state when there are no drafts and none are being generated. */
function CdsDraftsEmpty() {
  return (
    <Empty data-slot="cds-drafts-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BrainCircuit />
        </EmptyMedia>
        <EmptyTitle>No CDS drafts yet</EmptyTitle>
        <EmptyDescription>
          Clinical decision support drafts for this consultation will appear here
          once they have been generated.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Map the draft layer enum to a readable label. */
function displayLayer(layer: CdsDraft["layer"]): string {
  switch (layer) {
    case "soap":
      return "SOAP Note";
    case "patient-card":
      return "Patient Card";
    default:
      return "Clinical Draft";
  }
}

/** Map a draft review status to a label + tone, with a defined fallback. */
function displayDraftStatus(status: CdsDraft["status"]): {
  label: string;
  tone: string;
} {
  switch (status) {
    case "pending_review":
      return { label: "Pending review", tone: "warning" };
    case "approved":
      return { label: "Approved", tone: "success" };
    case "rejected":
      return { label: "Rejected", tone: "danger" };
    default:
      return { label: "Unknown status", tone: "neutral" };
  }
}

/** Turn a content key like `chiefComplaint` / `chief_complaint` into a label. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (spaced.length === 0) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render an arbitrary content value as readable text. */
function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
