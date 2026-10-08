"use client";

import { Eye, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusText } from "@/components/ui/status-text";
import type { CdsProtectedArtifact } from "@/types/cds-contract";
import { staleReasonLabel } from "../../lib/cdsCopy";
import { OUTPUT_LABELS } from "./workspacePhase";
import { DOCUMENT_STATUS, documentStatusOf, provenanceLabel } from "./documentStatus";

interface AuthorizedArtifactHistoryProps {
  history: readonly CdsProtectedArtifact[];
  cursor?: string;
  busy?: boolean;
  onLoadMore?: () => void;
  onInspectArtifact?: (artifact: CdsProtectedArtifact) => void;
}

/**
 * Earlier versions of this consultation's documents: superseded and
 * out-of-date drafts, kept for the medical record and never editable.
 *
 * Shown in the document checklist's pane as "Earlier versions". It used to be
 * a collapsible "Authorized Artifact History" card at the bottom of the page,
 * labelled with internal terms ("Active Baseline", "Audit §4.6", the raw
 * lifecycle enum) a physician should not have to translate.
 */
export function AuthorizedArtifactHistory({
  history,
  cursor,
  busy = false,
  onLoadMore,
  onInspectArtifact,
}: AuthorizedArtifactHistoryProps) {
  return (
    <div data-slot="artifact-history" className="flex flex-col gap-3 p-4 sm:p-5">
      <p className="text-sm text-(--text-muted)">
        Kept for the medical record. Earlier versions cannot be edited, signed, or released.
      </p>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-(--border-default) p-6 text-center">
          <History className="size-5 text-(--text-subtle)" aria-hidden />
          <p className="text-sm text-(--text-muted)">No earlier versions yet. Redrafting or revising the Assessment adds them here.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-(--border-subtle) rounded-xl border border-(--border-subtle)">
          {history.map((artifact) => {
            const status = DOCUMENT_STATUS[documentStatusOf(artifact)];
            const staleReason = artifact.effectiveStale ? staleReasonLabel(artifact.staleReason) : undefined;
            return (
              <li
                key={`${artifact.artifactId}-${artifact.artifactRevision}`}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-(--text-heading)">
                      {OUTPUT_LABELS[artifact.outputType] ?? artifact.outputType}
                    </span>
                    <StatusText tone={status.tone} icon={status.icon} size="sm">
                      {status.label}
                    </StatusText>
                  </div>
                  <p className="text-xs text-(--text-muted)">
                    {provenanceLabel(artifact)} · Assessment v{artifact.assessmentVersion} · version{" "}
                    {artifact.artifactRevision}
                    {staleReason ? ` · ${staleReason}` : ""}
                  </p>
                </div>
                {onInspectArtifact ? (
                  <Button
                    type="button"
                    variant="outline"
                    shape="pill"
                    className="shrink-0 border-(--border-default) max-lg:h-11"
                    onClick={() => onInspectArtifact(artifact)}
                  >
                    <Eye className="size-4" /> View
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {cursor && onLoadMore ? (
        <Button
          type="button"
          variant="outline"
          shape="pill"
          className="self-center border-(--border-default)"
          disabled={busy}
          onClick={onLoadMore}
        >
          {busy ? <Spinner className="size-4" /> : <History className="size-4" />}
          Load older versions
        </Button>
      ) : null}
    </div>
  );
}
