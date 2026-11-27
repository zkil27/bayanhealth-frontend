"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";
import {
  fetchBookingIntake,
  type BookingIntakeForm,
} from "@/features/doctor/lib/api/bookingIntake";

import { fetchPatientHistory, savePatientHistoryVersion } from "../lib/patientHistory/api";
import { isDemoHistoryBooking } from "../lib/patientHistory/demo";
import { clearDraft, readDraft, subscribeDrafts, writeDraft } from "../lib/patientHistory/draftStore";
import {
  cloneHistory,
  draftSectionState,
  intakeNotes,
  startDraft,
  versionSectionStates,
  visibleSections,
} from "../lib/patientHistory/model";
import {
  HISTORY_SECTION_IDS,
  type DraftSectionState,
  type HistoryDraft,
  type HistorySectionId,
  type PatientHistoryData,
} from "../lib/patientHistory/types";

export function patientHistoryQueryKey(bookingId: string) {
  return ["patient-history", bookingId] as const;
}

/**
 * Read-only: the saved versions for the patient on a booking. Used by the
 * queue chip and drawer, which never hold a draft.
 */
export function usePatientHistoryRecord(bookingId: string) {
  const idToken = useIdToken();
  const demo = isDemoHistoryBooking(bookingId);
  return useQuery({
    queryKey: patientHistoryQueryKey(bookingId),
    queryFn: () => fetchPatientHistory(idToken ?? "", bookingId),
    enabled: !!bookingId && (demo || !!idToken),
    staleTime: 1000 * 60,
    retry: false,
  });
}

/**
 * The chart a doctor works on during and after a consultation: saved versions,
 * today's intake, and the unsaved draft shared between the call room and the
 * post-consult workspace.
 *
 * The draft is only written once the doctor touches something; until then it
 * is derived (latest version, or the intake on a first consult), so opening the
 * tab never leaves a stray draft behind.
 */
export function usePatientHistory(bookingId: string, options?: { intake?: BookingIntakeForm | null }) {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const demo = isDemoHistoryBooking(bookingId);
  const recordQuery = usePatientHistoryRecord(bookingId);

  const intakeProvided = options?.intake !== undefined;
  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchBookingIntake(idToken ?? "", bookingId),
    enabled: !intakeProvided && !!bookingId && (demo || !!idToken),
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });
  const intake = intakeProvided ? options?.intake : intakeQuery.data;

  const versions = useMemo(() => recordQuery.data?.versions ?? [], [recordQuery.data]);
  const latest = versions.at(-1);

  const stored = useSyncExternalStore(
    subscribeDrafts,
    () => readDraft(bookingId),
    () => null,
  );
  // A draft started from an older version (another doctor saved since) is stale.
  const storedIsCurrent = !!stored && stored.baseVersion === (latest?.version ?? null);

  const fresh = useMemo(
    () => startDraft(bookingId, latest, intake),
    [bookingId, latest, intake],
  );
  const draft: HistoryDraft = storedIsCurrent && stored ? stored : fresh;
  const hasDraft = storedIsCurrent && !!stored && (stored.edited.length > 0 || stored.reviewed.length > 0);

  const states = useMemo(() => {
    const out = {} as Record<HistorySectionId, DraftSectionState>;
    for (const id of HISTORY_SECTION_IDS) out[id] = draftSectionState(draft, latest, id);
    return out;
  }, [draft, latest]);

  const notes = useMemo(() => intakeNotes(latest, intake), [latest, intake]);
  const sections = useMemo(() => visibleSections(draft.data), [draft.data]);

  const commit = useCallback(
    (next: HistoryDraft) => writeDraft({ ...next, updatedAt: new Date().toISOString() }),
    [],
  );

  const updateSection = useCallback(
    <K extends HistorySectionId>(id: K, value: PatientHistoryData[K]) => {
      const data = cloneHistory(draft.data);
      data[id] = value;
      commit({
        ...draft,
        data,
        edited: draft.edited.includes(id) ? draft.edited : [...draft.edited, id],
      });
    },
    [draft, commit],
  );

  const toggleReviewed = useCallback(
    (id: HistorySectionId) => {
      const reviewed = draft.reviewed.includes(id)
        ? draft.reviewed.filter((s) => s !== id)
        : [...draft.reviewed, id];
      commit({ ...draft, reviewed });
    },
    [draft, commit],
  );

  const discard = useCallback(() => clearDraft(bookingId), [bookingId]);

  const saveMutation = useMutation({
    mutationFn: (savedBy: string) =>
      savePatientHistoryVersion(idToken ?? "", bookingId, {
        data: draft.data,
        sections: versionSectionStates(draft, latest),
        savedBy,
      }),
    onSuccess: async () => {
      clearDraft(bookingId);
      await queryClient.invalidateQueries({ queryKey: patientHistoryQueryKey(bookingId) });
    },
  });

  const availability = recordQuery.data?.availability ?? (demo ? "demo" : "unavailable");

  return {
    status: recordQuery.isPending ? ("loading" as const) : recordQuery.isError ? ("error" as const) : ("ready" as const),
    refetch: recordQuery.refetch,
    availability,
    canSave: availability === "demo",
    versions,
    latest,
    intake,
    draft,
    hasDraft,
    states,
    notes,
    sections,
    updateSection,
    toggleReviewed,
    discard,
    save: saveMutation.mutateAsync,
    saving: saveMutation.isPending,
    saveError: saveMutation.error,
    nextVersion: (latest?.version ?? 0) + 1,
  };
}

export type PatientHistoryState = ReturnType<typeof usePatientHistory>;

/** Cheap check for an unsaved chart draft, for collapsed rails and header pills. */
export function useHasHistoryDraft(bookingId: string | undefined): boolean {
  const stored = useSyncExternalStore(
    subscribeDrafts,
    () => (bookingId ? readDraft(bookingId) : null),
    () => null,
  );
  return !!stored && (stored.edited.length > 0 || stored.reviewed.length > 0);
}
