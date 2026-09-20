"use client";

import { AlertCircleIcon, CheckCircle2, FileCheck2, Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import {
  useConsultationDocument,
  type DocumentStatus,
} from "../../hooks/useConsultationDocument";
import type { ConsultationDocumentType } from "../../lib/api/consultationDocuments";

/**
 * Backend-wired consultation document panel (Slice 7, task 13.1,
 * Requirements 12.1–12.4).
 *
 * Lets the assigned doctor author one consultation document, save it as a draft,
 * and finalize it against the contract-frozen documents endpoints. All write
 * behaviour (idempotent save/finalize, error retention, already-finalized
 * de-duplication) lives in {@link useConsultationDocument}; this component is
 * presentational.
 *
 * - On a save/finalize error the entered title and notes are kept and an error
 *   indication is shown (Requirement 12.2).
 * - On a successful finalize the finalized state is displayed (Requirement 12.3),
 *   and the document becomes read-only.
 */
export function ConsultationDocumentPanel({
  consultationId,
  documentType,
  heading,
  notesLabel = "Notes",
  notesPlaceholder,
}: {
  consultationId: string;
  documentType: ConsultationDocumentType;
  heading: string;
  notesLabel?: string;
  notesPlaceholder?: string;
}) {
  const {
    status,
    document,
    title,
    setTitle,
    content,
    setContent,
    save,
    error,
    isFinalized,
    isHydrating,
  } = useConsultationDocument({ consultationId, documentType });

  const notes = typeof content.notes === "string" ? content.notes : "";
  const busy = status === "saving" || isHydrating;

  return (
    <section
      data-slot="consultation-document"
      data-document-type={documentType}
      data-status={status}
      className="flex flex-col gap-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
      aria-label={heading}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <FileCheck2 className="size-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{heading}</h3>
        </div>
        <StatusBadge status={status} />
      </header>

      {isFinalized ? (
        <FinalizedView title={document?.title ?? title} notes={notes} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${documentType}-title`}>Title</Label>
            <Input
              id={`${documentType}-title`}
              data-slot="document-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={heading}
              maxLength={160}
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${documentType}-notes`}>{notesLabel}</Label>
            <Textarea
              id={`${documentType}-notes`}
              data-slot="document-notes"
              value={notes}
              onChange={(e) => setContent({ ...content, notes: e.target.value })}
              placeholder={notesPlaceholder}
              rows={5}
              disabled={busy}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Save here, then finalize with your signature in Review &amp; Sign.
            </p>
            <Button
              type="button"
              variant="outline"
              data-slot="document-save"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? (
                <Spinner className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              Save draft
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <Alert variant="destructive" data-slot="document-error">
          <AlertCircleIcon />
          <AlertTitle>Could not save the document</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  if (status === "finalized") {
    return (
      <Badge data-slot="document-status" variant="outline" data-tone="success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Finalized
      </Badge>
    );
  }
  if (status === "saved") {
    return (
      <Badge data-slot="document-status" variant="outline">
        Draft saved
      </Badge>
    );
  }
  if (status === "saving" || status === "finalizing") {
    return (
      <Badge data-slot="document-status" variant="outline">
        <Spinner className="size-3.5" />
        {status === "saving" ? "Saving…" : "Finalizing…"}
      </Badge>
    );
  }
  return null;
}

function FinalizedView({ title, notes }: { title: string; notes: string }) {
  return (
    <div
      data-slot="document-finalized"
      className="flex flex-col gap-3 rounded-md bg-muted/50 p-4"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Title</span>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      {notes ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
            {notes}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        This document is finalized and can no longer be edited.
      </p>
    </div>
  );
}
