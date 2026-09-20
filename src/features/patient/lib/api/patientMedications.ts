import { api, ApiError } from "@/lib/api";

/**
 * Released medication lines for the signed-in patient
 * (`GET /v1/patients/me/medications`).
 *
 * The backend aggregates these from released prescription artifacts — the same
 * per-consultation `getReleasedPrescription` data, gathered across the patient's
 * consultations. Each line is the physician's own text plus the date it was
 * released; there is no "days remaining" and no "active" flag because the source
 * carries neither. UI built on this must present it as "what was prescribed, and
 * when", never as a current list a pharmacy can act on.
 */
export interface PatientMedicationLine {
  genericName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  /** The consultation whose released prescription this line came from. */
  consultationId: string;
  /** ISO-8601 — when the physician released the prescription. */
  releasedAt: string;
}

export async function fetchMyMedications(
  idToken: string,
): Promise<PatientMedicationLine[]> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your medications.",
      401,
    );
  }

  const res = await api.get<{ patientId: string; medications?: unknown }>(
    "/v1/patients/me/medications",
    idToken,
  );

  // Guard the shape the panel walks — a malformed body is "no medications", not
  // a thrown render.
  const raw = res.data?.medications;
  if (!Array.isArray(raw)) return [];

  const lines: PatientMedicationLine[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    const genericName =
      typeof row.genericName === "string" ? row.genericName : "";
    if (!genericName.trim()) continue;
    lines.push({
      genericName,
      dose: str(row.dose),
      route: str(row.route),
      frequency: str(row.frequency),
      duration: str(row.duration),
      instructions: str(row.instructions),
      consultationId: str(row.consultationId),
      releasedAt: str(row.releasedAt),
    });
  }
  return lines;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
