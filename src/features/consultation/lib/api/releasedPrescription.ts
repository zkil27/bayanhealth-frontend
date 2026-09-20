import { api, ApiError } from "@/lib/api";

/**
 * Patient-readable released prescription (ADR-20260809-01).
 *
 * `GET /v1/cds/consultations/{consultationId}/prescription/released` is the
 * patient's only route to a prescription. Generation, finalization, and release
 * were all implemented and nothing read the result, so a released prescription
 * reached the physician's screen and stopped there. The legacy `prescription`
 * consultation-document path is permanently retired (410), so this is the only
 * prescription surface that exists.
 *
 * **Not a dispensable instrument.** The response carries no prescriber identity,
 * licence number, or signature, and nothing in it is verifiable by a pharmacy.
 * Any UI built on it must say so rather than implying the patient is holding a
 * script they can present at a counter.
 */

/** One prescribed medication, mirroring `CdsPrescriptionMedication`. */
export interface PrescriptionMedication {
  genericName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

/** The prescription payload, mirroring `CdsPrescriptionPayload`. */
export interface PrescriptionPayload {
  medications: PrescriptionMedication[];
  notes?: string;
}

export interface ReleasedPrescription {
  consultationId: string;
  releasedAt: string;
  payload: PrescriptionPayload;
}

/**
 * Narrow an unknown response body to a prescription, or null.
 *
 * The card must not trust the wire. A payload whose `medications` is missing or
 * not an array is treated as absent rather than rendered, because the alternative
 * is what the tests caught: reading `.medications.length` off an unexpected shape
 * threw during render and took down the patient's entire booking page — the
 * summary card, the video link, the chat entry, and the education card with it.
 * A prescription that cannot be displayed is a missing prescription; it is never
 * a reason to lose the rest of the page.
 *
 * Individual medication fields are coerced to strings rather than validated
 * field-by-field. The server already validates them closed (`validatePrescription`
 * in `protected-output-adapters.ts`), so duplicating that here would be a second
 * schema to keep in sync; this only guards the shape the render walks.
 */
function toReleasedPrescription(value: unknown): ReleasedPrescription | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;

  const consultationId = record.consultationId;
  const releasedAt = record.releasedAt;
  const payload = record.payload;
  if (typeof consultationId !== "string" || !consultationId) return null;
  if (typeof releasedAt !== "string" || !releasedAt) return null;
  if (typeof payload !== "object" || payload === null) return null;

  const payloadRecord = payload as Record<string, unknown>;
  const rawMedications = payloadRecord.medications;
  if (!Array.isArray(rawMedications)) return null;

  const medications: PrescriptionMedication[] = [];
  for (const entry of rawMedications) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    const genericName = typeof row.genericName === "string" ? row.genericName : "";
    if (!genericName.trim()) continue;
    medications.push({
      genericName,
      dose: typeof row.dose === "string" ? row.dose : "",
      route: typeof row.route === "string" ? row.route : "",
      frequency: typeof row.frequency === "string" ? row.frequency : "",
      duration: typeof row.duration === "string" ? row.duration : "",
      instructions: typeof row.instructions === "string" ? row.instructions : "",
    });
  }
  // A prescription with no usable medication line is nothing to show a patient.
  if (medications.length === 0) return null;

  const notes = typeof payloadRecord.notes === "string" ? payloadRecord.notes : undefined;
  return {
    consultationId,
    releasedAt,
    payload: { medications, ...(notes ? { notes } : {}) },
  };
}

/**
 * Read the released prescription for a consultation.
 *
 * Returns null on 404, which the backend uses for every negative outcome —
 * unknown consultation, non-participant caller, and "nothing released yet" are
 * deliberately indistinguishable. The caller renders nothing rather than an
 * error, because the common case is a consultation whose physician has not
 * released a prescription and may never need to. Also returns null for a response
 * that does not narrow to a prescription; see {@link toReleasedPrescription}.
 */
export async function fetchReleasedPrescription(
  idToken: string,
  consultationId: string,
): Promise<ReleasedPrescription | null> {
  if (!idToken || !consultationId) return null;
  try {
    const res = await api.get<unknown>(
      `/v1/cds/consultations/${encodeURIComponent(consultationId)}/prescription/released`,
      idToken,
    );
    return toReleasedPrescription(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Whether a medication row is the deterministic fallback placeholder rather than
 * a real prescription.
 *
 * `protected-generation.ts` emits `genericName: "physician selection required"`
 * with every other field `"not specified"` when the provider fails a gate, times
 * out, or returns an empty completion — and it returns HTTP 200 while doing so.
 * A patient must never be shown that as though it were their medicine, so the UI
 * needs to be able to recognise it. This is a presentation-layer guard, not a
 * substitute for the physician reviewing the artifact before releasing it.
 */
export function isPlaceholderMedication(
  medication: PrescriptionMedication,
): boolean {
  return (
    medication.genericName.trim().toLowerCase() === "physician selection required"
  );
}

/** True when every medication in the payload is a fallback placeholder. */
export function isPlaceholderPrescription(
  payload: PrescriptionPayload,
): boolean {
  return (
    payload.medications.length > 0 &&
    payload.medications.every(isPlaceholderMedication)
  );
}
