"use client";

import { useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCheck,
  ChevronDown,
  Eye,
  FileText,
  FlaskConical,
  History,
  PenLine,
  Pill,
  Scan,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CdsProtectedArtifact,
  CdsProtectedOutputType,
} from "@/types/cds-contract";
import { staleReasonLabel } from "../../lib/cdsCopy";
import { OUTPUT_LABELS } from "./workspacePhase";
import { cn } from "@/lib/utils";

interface AuthorizedArtifactHistoryProps {
  history: readonly CdsProtectedArtifact[];
  cursor?: string;
  busy?: boolean;
  onLoadMore?: () => void;
  onInspectArtifact?: (artifact: CdsProtectedArtifact) => void;
  className?: string;
}

function ArtifactTypeIcon({
  outputType,
  className,
}: {
  outputType: CdsProtectedOutputType;
  className?: string;
}) {
  switch (outputType) {
    case "prescription":
      return <Pill className={className} />;
    case "medical_certificate":
      return <Award className={className} />;
    case "lab_request":
      return <FlaskConical className={className} />;
    case "imaging_request":
      return <Scan className={className} />;
    case "patient_education":
      return <BookOpen className={className} />;
    case "plan":
    default:
      return <FileText className={className} />;
  }
}

export function AuthorizedArtifactHistory({
  history,
  cursor,
  busy = false,
  onLoadMore,
  onInspectArtifact,
  className,
}: AuthorizedArtifactHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      data-slot="artifact-history"
      className={cn(
        "rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-2xs overflow-hidden transition-all",
        className,
      )}
    >
      {/* Clickable Header Accordion Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 bg-(--surface-card) hover:bg-(--surface-warm-soft)/60 transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-(--surface-accent-soft) text-(--teal-800) dark:text-(--teal-300) border border-(--teal-500)/25 shadow-2xs">
            <History className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-(--navy-800) dark:text-slate-100 tracking-tight truncate">
                Authorized Artifact History
              </h2>
              {history.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-(--surface-warm-soft) border border-(--border-subtle) px-2.5 py-0.5 text-xs font-bold text-(--text-muted)">
                  {history.length}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] sm:text-xs text-(--text-muted) truncate mt-0.5">
              Permanent audit trail of earlier &amp; superseded clinical drafts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            {open ? "Collapse" : "Review history"}
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--surface-canvas) text-(--text-muted)">
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      {/* Expanded Accordion Body */}
      {open ? (
        <div className="border-t border-(--border-subtle) p-4 sm:p-5 bg-(--surface-canvas)/50 space-y-3.5 animate-in duration-200 fade-in">
          <div className="flex items-center justify-between gap-3 text-xs text-(--text-muted) px-1">
            <p>
              Earlier drafts are preserved for the medicolegal record. They cannot be edited,
              signed, or released.
            </p>
            <span className="text-[11px] font-mono shrink-0 hidden md:inline">
              Audit §4.6 / Preserved
            </span>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-(--border-default) bg-(--surface-card) p-6 text-center">
              <History className="mx-auto size-6 text-(--text-subtle) mb-1.5" />
              <p className="text-xs font-medium text-(--text-muted)">
                No previous artifact revisions recorded for this consultation.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {history.map((artifact) => {
                const label = OUTPUT_LABELS[artifact.outputType] || artifact.outputType;
                const isStale = artifact.effectiveStale;
                const staleReason = staleReasonLabel(artifact.staleReason);

                return (
                  <li
                    key={`${artifact.artifactId}-${artifact.artifactRevision}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-2xs hover:border-(--border-strong) transition-colors"
                  >
                    {/* Left: Icon & Document Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--surface-accent-soft) text-(--teal-800) dark:text-(--teal-300) border border-(--teal-500)/20 mt-0.5">
                        <ArtifactTypeIcon outputType={artifact.outputType} className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-bold text-(--text-heading)">
                            {label}
                          </span>
                          <span className="text-[11px] font-medium text-(--text-muted)">
                            · Assessment v{artifact.assessmentVersion}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            rev {artifact.artifactRevision}
                          </span>
                        </div>

                        {/* Badges Row */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {isStale ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300 uppercase tracking-wide">
                              <AlertCircle className="size-3 text-amber-700 dark:text-amber-400" />
                              {staleReason ?? "Superseded"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:border-teal-700/50 dark:bg-teal-950/40 dark:text-teal-300 uppercase tracking-wide">
                              <CheckCheck className="size-3 text-teal-600 dark:text-teal-400" />
                              Active Baseline
                            </span>
                          )}

                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              artifact.lifecycleStatus === "finalized"
                                ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                                : artifact.lifecycleStatus === "released"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300",
                            )}
                          >
                            {artifact.lifecycleStatus}
                          </span>

                          {artifact.physicianEdited ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-(--text-muted)">
                              <PenLine className="size-3 text-slate-400" />
                              Physician edited
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Inspection CTA */}
                    <div className="flex items-center justify-end sm:justify-start shrink-0 pt-1 sm:pt-0 border-t border-(--border-subtle) sm:border-t-0">
                      {onInspectArtifact ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onInspectArtifact(artifact)}
                          className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-(--surface-warm-soft)"
                        >
                          <Eye className="size-3.5 text-(--teal-700)" />
                          <span>Inspect specimen</span>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {cursor && onLoadMore ? (
            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={onLoadMore}
                className="rounded-full px-4 text-xs font-semibold gap-2"
              >
                {busy ? <Spinner className="size-3.5" /> : <History className="size-3.5" />}
                Load earlier history
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
