import { api, ApiError } from "@/lib/api";

/**
 * Patient chart (longitudinal timeline) data access (PatientChart slice).
 *
 * Backed by the contract-frozen, authenticated `GET /v1/patients/me/chart`
 * endpoint, which returns the signed-in patient's aggregated health timeline in
 * the `{ data, meta }` envelope.
 *
 * Mirrors the auth guard pattern in
 * `src/features/booking/lib/api/bookingDetail.ts`: when no IdToken is present we
 * throw an {@link ApiError} with `status === 401` BEFORE touching the network so
 * the calling component drives its error state without a wasted request.
 */

/** Discriminator for a single timeline entry (backend `PatientChartEntry.type`). */
export type ChartEntryType =
  | "booking"
  | "intake"
  | "session"
  | "document"
  | "lab_result";

/**
 * A single event on the patient's longitudinal timeline
 * (contracts/openapi.yaml#PatientChartEntry). Optional id fields point back to
 * the originating resource; `status` and `summary` are presentational extras.
 */
export interface PatientChartEntry {
  type: ChartEntryType;
  /** ISO-8601 timestamp the event occurred at; used for DESC sorting. */
  occurredAt: string;
  bookingId?: string;
  consultationId?: string;
  documentId?: string;
  title: string;
  summary?: string;
  status?: string;
}

/** The aggregated chart for a single patient (contracts/openapi.yaml#PatientChart). */
export interface PatientChart {
  patientId: string;
  timeline: PatientChartEntry[];
}

/**
 * Fetch the authenticated patient's longitudinal chart timeline.
 *
 * Throws an {@link ApiError} when no auth token is available (guard, 401) or
 * when the request fails; the calling component surfaces these through
 * `AsyncView`'s error state with a retry control.
 *
 * @param idToken - Cognito IdToken used to authenticate the request.
 * @returns The patient chart with its timeline entries.
 */
export async function fetchMyPatientChart(
  idToken: string,
): Promise<PatientChart> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your health chart.",
      401,
    );
  }

  const res = await api.get<PatientChart>("/v1/patients/me/chart", idToken);

  return res.data;
}
