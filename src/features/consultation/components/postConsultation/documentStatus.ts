import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleMinus,
  Clock,
  FileSignature,
  PenLine,
} from "lucide-react";
import type { ComponentType } from "react";

import type { StatusTone } from "@/components/ui/status-text";
import type { CdsProtectedArtifact } from "@/types/cds-contract";

/**
 * The one vocabulary for a document's state, everywhere in the workspace.
 *
 * Before this, a single unsigned draft was "To sign", "Ready to sign",
 * "Draft · Needs review", "Edited · Ready to sign", "awaiting your signature",
 * "drafted · ready to sign" or "Drafted but not signed" depending on which
 * corner of the page the physician looked at. Seven statuses, adjectives,
 * sentence case, as the NHS and GOV.UK task-list patterns recommend. Who wrote
 * a draft is a separate, quieter fact (`provenanceLabel`), not a seventh status.
 */
export type DocumentStatus =
  | "not_needed"
  | "not_started"
  | "drafting"
  | "needs_review"
  | "signed"
  | "released"
  | "stale";

export const DOCUMENT_STATUS: Record<
  DocumentStatus,
  { label: string; tone: StatusTone; icon: ComponentType<{ className?: string }> }
> = {
  // The physician removed a draft or said this consultation does not need the
  // document. Kept as a row so it can be added back, and left out of the
  // "not started" warning at Finish.
  not_needed: { label: "Not needed", tone: "neutral", icon: CircleMinus },
  not_started: { label: "Not started", tone: "neutral", icon: CircleDashed },
  drafting: { label: "Drafting", tone: "ai", icon: PenLine },
  needs_review: { label: "Needs review", tone: "attention", icon: Clock },
  signed: { label: "Signed", tone: "info", icon: FileSignature },
  released: { label: "Released", tone: "success", icon: CheckCircle2 },
  stale: { label: "Out of date", tone: "attention", icon: AlertTriangle },
};

/** The status of a current artifact. */
export function documentStatusOf(artifact: CdsProtectedArtifact): DocumentStatus {
  if (artifact.effectiveStale) return "stale";
  if (artifact.lifecycleStatus === "released") return "released";
  if (artifact.lifecycleStatus === "finalized") return "signed";
  return "needs_review";
}

/**
 * Who wrote the text the physician is about to sign. Shown as plain meta text
 * beside the status, never as another colored chip.
 */
export function provenanceLabel(artifact: CdsProtectedArtifact): string {
  if (artifact.source === "physician") return "Written by you";
  return artifact.physicianEdited ? "AI draft, edited by you" : "AI draft";
}
