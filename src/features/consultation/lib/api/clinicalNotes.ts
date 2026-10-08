import { api, ApiError } from "@/lib/api";

/**
 * The physician's own Subjective, Objective and Assessment notes
 * (contracts/openapi.yaml#ClinicalNotes).
 *
 * - `GET /v1/consultations/{id}/clinical-notes` (`404` → none written yet)
 * - `PUT /v1/consultations/{id}/clinical-notes` (compare-and-set on `revision`)
 *
 * Internal documentation: never patient-visible, never sent to the AI.
 */
export interface ClinicalNotes {
  consultationId: string;
  subjective: string;
  objective: string;
  assessmentNotes: string;
  revision: number;
  authoredByActorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalNotesDraft {
  subjective: string;
  objective: string;
  assessmentNotes: string;
}

export const CLINICAL_NOTE_MAX = 4000;

export async function fetchClinicalNotes(
  consultationId: string,
  idToken: string,
): Promise<ClinicalNotes | null> {
  if (!idToken || !consultationId) return null;
  try {
    const res = await api.get<ClinicalNotes>(
      `/v1/consultations/${encodeURIComponent(consultationId)}/clinical-notes`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveClinicalNotes(
  consultationId: string,
  idToken: string,
  draft: ClinicalNotesDraft,
  expectedRevision: number,
): Promise<ClinicalNotes> {
  const res = await api.put<ClinicalNotes>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/clinical-notes`,
    idToken,
    { ...draft, expectedRevision },
  );
  return res.data;
}
