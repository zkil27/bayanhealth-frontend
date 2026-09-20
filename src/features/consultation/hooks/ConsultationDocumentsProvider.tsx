"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  type ConsultationDocument,
  type ConsultationDocumentType,
  listConsultationDocuments,
  mapDocumentError,
} from "../lib/api/consultationDocuments";

interface ConsultationDocumentsContextValue {
  isLoading: boolean;
  error: string | null;
  getCanonical: (type: ConsultationDocumentType) => ConsultationDocument | null;
  upsert: (document: ConsultationDocument) => void;
}

const ConsultationDocumentsContext =
  createContext<ConsultationDocumentsContextValue | null>(null);

export function ConsultationDocumentsProvider({
  consultationId,
  children,
}: {
  consultationId: string;
  children?: ReactNode;
}) {
  const idToken = useAuthStore((state) => state.session?.idToken ?? null);
  const [documents, setDocuments] = useState<ConsultationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      // Defer state changes to the asynchronous load path so an effect does not
      // synchronously cascade renders when the consultation identity changes.
      await Promise.resolve();
      if (!active) return;

      setDocuments([]);
      setError(null);
      if (!idToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await listConsultationDocuments(consultationId, idToken);
        if (active) setDocuments(result.documents);
      } catch (reason: unknown) {
        if (active) setError(mapDocumentError(reason).message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDocuments();
    return () => {
      active = false;
    };
  }, [consultationId, idToken]);

  const getCanonical = useCallback(
    (type: ConsultationDocumentType) => {
      const matching = documents
        .filter((document) => document.documentType === type && document.status !== "voided")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      return matching.find((document) => document.status === "finalized") ?? matching[0] ?? null;
    },
    [documents],
  );

  const upsert = useCallback((next: ConsultationDocument) => {
    setDocuments((current) => {
      const withoutNext = current.filter((item) => item.documentId !== next.documentId);
      return [next, ...withoutNext];
    });
  }, []);

  const value = useMemo(
    () => ({ isLoading, error, getCanonical, upsert }),
    [error, getCanonical, isLoading, upsert],
  );
  return (
    <ConsultationDocumentsContext.Provider value={value}>
      {children}
    </ConsultationDocumentsContext.Provider>
  );
}

export function useConsultationDocumentsCoordinator() {
  return useContext(ConsultationDocumentsContext);
}
