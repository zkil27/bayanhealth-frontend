import { ApiError } from "@/lib/api";

import { DEMO_SEED_VERSIONS, demoPatientKey, isDemoHistoryBooking } from "./demo";
import type {
  HistorySectionId,
  HistoryVersion,
  PatientHistoryData,
  PatientHistoryRecord,
  VersionSectionState,
} from "./types";

/**
 * The patient chart's ONE backend seam.
 *
 * There is no history API yet (see CHANGELOG_UI_V5, "Backend dependencies").
 * Until it ships:
 * - demo bookings read seeded versions and save to this browser's storage;
 * - real bookings return `availability: "unavailable"` with no versions, so
 *   the UI pre-fills from the intake and disables saving with a plain reason.
 *
 * When the backend lands, only this file changes. Proposed contract:
 *   GET  /v1/bookings/{bookingId}/patient-history          → { versions }
 *   POST /v1/bookings/{bookingId}/patient-history/versions → HistoryVersion
 *   GET  /v1/patients/me/history                           → { versions }
 * Keyed by booking so the doctor surfaces, none of which hold a `patientId`
 * today, need nothing new; the backend resolves the patient and enforces that
 * the caller is the assigned doctor.
 */

const DEMO_STORAGE_PREFIX = "bh:pmh-demo:";

function readDemoSaved(patientKey: string): HistoryVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_PREFIX + patientKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryVersion[]) : [];
  } catch {
    return [];
  }
}

function demoVersions(bookingId: string): HistoryVersion[] {
  const key = demoPatientKey(bookingId);
  return [...(DEMO_SEED_VERSIONS[key] ?? []), ...readDemoSaved(key)].sort(
    (a, b) => a.version - b.version,
  );
}

/** Read the chart for the patient on a booking, as the assigned doctor. */
export async function fetchPatientHistory(
  _idToken: string,
  bookingId: string,
): Promise<PatientHistoryRecord> {
  if (isDemoHistoryBooking(bookingId)) {
    return { availability: "demo", versions: demoVersions(bookingId) };
  }
  return { availability: "unavailable", versions: [] };
}

export interface SaveHistoryInput {
  data: PatientHistoryData;
  sections: Record<HistorySectionId, VersionSectionState>;
  savedBy: string;
}

/** Save the doctor's draft as the next version. Versions are append-only. */
export async function savePatientHistoryVersion(
  _idToken: string,
  bookingId: string,
  input: SaveHistoryInput,
): Promise<HistoryVersion> {
  if (!isDemoHistoryBooking(bookingId)) {
    throw new ApiError(
      "NOT_AVAILABLE",
      "Saving the chart needs a server update.",
      501,
    );
  }
  const key = demoPatientKey(bookingId);
  const existing = demoVersions(bookingId);
  const version: HistoryVersion = {
    version: (existing.at(-1)?.version ?? 0) + 1,
    savedAt: new Date().toISOString(),
    savedBy: input.savedBy,
    bookingId,
    data: input.data,
    sections: input.sections,
  };
  try {
    window.localStorage.setItem(
      DEMO_STORAGE_PREFIX + key,
      JSON.stringify([...readDemoSaved(key), version]),
    );
  } catch {
    throw new ApiError("STORAGE", "This browser could not keep the demo chart.", 500);
  }
  return version;
}

/**
 * The signed-in patient's own chart (read-only).
 *
 * `previewPatient` is a development-only hook (`/patient/health?chartPreview=ramon`)
 * so the patient card can be reviewed with a demo chart; production ignores it.
 */
export async function fetchMyPatientHistory(
  _idToken: string,
  previewPatient?: string | null,
): Promise<PatientHistoryRecord> {
  if (process.env.NODE_ENV !== "production" && previewPatient) {
    const key = previewPatient.toLowerCase();
    return {
      availability: "demo",
      versions: [...(DEMO_SEED_VERSIONS[key] ?? []), ...readDemoSaved(key)].sort(
        (a, b) => a.version - b.version,
      ),
    };
  }
  return { availability: "unavailable", versions: [] };
}
