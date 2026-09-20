"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  type ConsultationDocument,
  type ConsultationDocumentType,
  createConsultationDocument,
  type DocumentError,
  type ElectronicSignatureRequest,
  getConsultationDocument,
  isDocumentStateConflict,
  mapDocumentError,
  updateConsultationDocument,
} from "../lib/api/consultationDocuments";
import { useConsultationDocumentsCoordinator } from "./ConsultationDocumentsProvider";

/**
 * Discrete states of a single consultation document being authored
 * (Requirements 12.1–12.4).
 *
 * - `idle`       — no write attempted yet for this document.
 * - `saving`     — a draft create/update is in flight.
 * - `saved`      — a draft has been persisted; further edits are allowed.
 * - `finalizing` — a finalize request is in flight.
 * - `finalized`  — the document is finalized; its finalized state is shown
 *   (Requirement 12.3) and it is immutable.
 * - `error`      — the last write failed; an error indication is available and
 *   the entered content is retained (Requirement 12.2).
 */
export type DocumentStatus =
  | "idle"
  | "saving"
  | "saved"
  | "finalizing"
  | "finalized"
  | "error";

export interface DocumentFinalizeResult {
  ok: boolean;
  document?: ConsultationDocument;
  error?: DocumentError;
}

export interface UseConsultationDocument {
  /** Current document status. */
  status: DocumentStatus;
  /** The persisted document, present once a draft/finalized doc exists. */
  document: ConsultationDocument | null;
  /** Working title (retained across failed writes, Requirement 12.2). */
  title: string;
  /** Update the working title; clears any prior error. */
  setTitle: (value: string) => void;
  /** Working content (retained across failed writes, Requirement 12.2). */
  content: Record<string, unknown>;
  /** Update the working content; clears any prior error. */
  setContent: (value: Record<string, unknown>) => void;
  /** Persist (create or update) the draft. Returns `true` on success. */
  save: () => Promise<boolean>;
  /** Finalize the document and return the immediate document/error result. */
  finalize: (signature?: ElectronicSignatureRequest) => Promise<DocumentFinalizeResult>;
  /** True while the shared coordinator is hydrating existing documents. */
  isHydrating: boolean;
  /** Error indication, present only in the `error` state (Requirement 12.2). */
  error: DocumentError | null;
  /** Convenience flag: `true` only in the `finalized` state. */
  isFinalized: boolean;
}

interface UseConsultationDocumentArgs {
  /** The `con_*` consultation id the document belongs to. */
  consultationId: string;
  /** The category of document being authored (e.g. `prescription`). */
  documentType: ConsultationDocumentType;
  /** Optional initial title. */
  initialTitle?: string;
  /** Optional initial content. */
  initialContent?: Record<string, unknown>;
}

/**
 * Wire authoring of one consultation document to the contract-frozen
 * documents endpoints (Slice 7, task 13.1, Requirements 12.1–12.4).
 *
 * Behaviour:
 * - {@link UseConsultationDocument.save} creates the draft on first save
 *   (`POST`) and updates it thereafter (`PUT`). Each logical save reuses a
 *   single UUID v4 `Idempotency-Key` until it succeeds, so a retried save is
 *   not duplicated (Requirement 12.1). On failure the document moves to
 *   `error`, the error indication is exposed, and the entered title/content are
 *   retained (Requirement 12.2).
 * - {@link UseConsultationDocument.finalize} creates the draft first if needed,
 *   then finalizes it (`PUT { status: "finalized" }`). On success the document
 *   moves to `finalized` and its finalized state is exposed for display
 *   (Requirement 12.3).
 * - Finalizing a document that is already finalized fails the backend's
 *   conditional write (`STATE_CONFLICT`); the hook re-reads the existing
 *   document and surfaces its finalized state without producing a duplicate
 *   (Requirement 12.4).
 */
export function useConsultationDocument({
  consultationId,
  documentType,
  initialTitle = "",
  initialContent = {},
}: UseConsultationDocumentArgs): UseConsultationDocument {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const coordinator = useConsultationDocumentsCoordinator();
  const canonicalDocument = coordinator?.getCanonical(documentType) ?? null;

  const [status, setStatus] = useState<DocumentStatus>("idle");
  const [document, setDocument] = useState<ConsultationDocument | null>(null);
  const [title, setTitleState] = useState<string>(initialTitle);
  const [content, setContentState] = useState<Record<string, unknown>>(
    initialContent,
  );
  const [error, setError] = useState<DocumentError | null>(null);

  // One idempotency key per logical save, reused on retry until it succeeds.
  const saveKeyManager = useRef(createIdempotencyKeyManager());
  // A separate key for the logical finalize write (reused on retry).
  const finalizeKeyManager = useRef(createIdempotencyKeyManager());
  // The current document id, tracked in a ref so finalize() sees the latest
  // value even when called immediately after save() within the same tick.
  const documentIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!canonicalDocument || isDirtyRef.current) return;
    documentIdRef.current = canonicalDocument.documentId;
    setDocument(canonicalDocument);
    setTitleState(canonicalDocument.title);
    setContentState(canonicalDocument.content);
    setStatus(canonicalDocument.status === "finalized" ? "finalized" : "saved");
    setError(null);
  }, [canonicalDocument]);

  const setTitle = useCallback((value: string) => {
    isDirtyRef.current = true;
    setTitleState(value);
    setError(null);
  }, []);

  const setContent = useCallback((value: Record<string, unknown>) => {
    isDirtyRef.current = true;
    setContentState(value);
    setError(null);
  }, []);

  /**
   * Persist the working draft: create it on first save, update it thereafter.
   * Returns the persisted document, or throws so callers can map the error.
   */
  const persistDraft = useCallback(async (): Promise<ConsultationDocument> => {
    if (coordinator?.isLoading) {
      throw new Error("Existing consultation documents are still loading");
    }
    const token = idToken ?? "";
    const key = saveKeyManager.current.current();
    const existingId = documentIdRef.current ?? canonicalDocument?.documentId ?? null;
    if (existingId && !documentIdRef.current) documentIdRef.current = existingId;

    const result = existingId
      ? await updateConsultationDocument(
          consultationId,
          existingId,
          token,
          { title, content },
          key,
        )
      : await createConsultationDocument(
          consultationId,
          token,
          { documentType, title, content },
          key,
        );

    // This logical save succeeded — the next save mints a fresh key.
    saveKeyManager.current.reset();
    documentIdRef.current = result.documentId;
    isDirtyRef.current = false;
    coordinator?.upsert(result);
    return result;
  }, [canonicalDocument, consultationId, content, coordinator, documentType, idToken, title]);

  const save = useCallback(async (): Promise<boolean> => {
    setStatus("saving");
    setError(null);
    try {
      const result = await persistDraft();
      setDocument(result);
      setStatus(result.status === "finalized" ? "finalized" : "saved");
      return true;
    } catch (err) {
      // Keep the save key so an immediate retry is treated as the same write;
      // retain the entered title/content for re-submission (Requirement 12.2).
      setError(mapDocumentError(err));
      setStatus("error");
      return false;
    }
  }, [persistDraft]);

  const finalize = useCallback(async (
    signature?: ElectronicSignatureRequest,
  ): Promise<DocumentFinalizeResult> => {
    setStatus("finalizing");
    setError(null);

    const failFinalize = (reason: unknown): DocumentFinalizeResult => {
      const mapped = mapDocumentError(reason);
      setError(mapped);
      setStatus("error");
      return { ok: false, error: mapped };
    };
    const token = idToken ?? "";

    // Ensure a draft exists to finalize. A failure here keeps content (Req 12.2).
    if (!documentIdRef.current) {
      try {
        const draft = await persistDraft();
        setDocument(draft);
      } catch (err) {
        return failFinalize(err);
      }
    }

    const documentId = documentIdRef.current;
    if (!documentId) {
      return failFinalize(new Error("No document to finalize"));
    }

    const key = finalizeKeyManager.current.current();
    try {
      const finalized = await updateConsultationDocument(
        consultationId,
        documentId,
        token,
        { status: "finalized", content, signature },
        key,
      );
      finalizeKeyManager.current.reset();
      setDocument(finalized);
      isDirtyRef.current = false;
      coordinator?.upsert(finalized);
      setStatus("finalized");
      return { ok: true, document: finalized };
    } catch (err) {
      // Already finalized: the conditional write fails with STATE_CONFLICT.
      // Re-read the existing document and show its finalized state without
      // producing a duplicate (Requirement 12.4).
      if (isDocumentStateConflict(err)) {
        try {
          const existing = await getConsultationDocument(
            consultationId,
            documentId,
            token,
          );
          finalizeKeyManager.current.reset();
          setDocument(existing);
          coordinator?.upsert(existing);
          if (existing.status === "finalized") {
            setStatus("finalized");
            return { ok: true, document: existing };
          }
          // Conflict for a non-finalized state (e.g. voided): surface as error.
          return failFinalize(err);
        } catch (refetchErr) {
          return failFinalize(refetchErr);
        }
      }
      // Other failures: keep the finalize key for retry and retain content.
      return failFinalize(err);
    }
  }, [consultationId, content, coordinator, idToken, persistDraft]);

  return {
    status,
    document,
    title,
    setTitle,
    content,
    setContent,
    save,
    finalize,
    isHydrating: coordinator?.isLoading ?? false,
    error,
    isFinalized: status === "finalized",
  };
}
