import { api, ApiError } from "@/lib/api";
import type {
  IntakeDetailsSection,
  IntakeForm,
  IntakePurposeSection,
  IntakeReviewSection,
  IntakeStep,
} from "./intake";

/**
 * Authenticated, patient-owned intake data access (ADR-20260805-01).
 *
 * These are the booking-scoped intake endpoints under
 * `/v1/bookings/{bookingId}/intake`, which let the patient complete triage
 * inline during booking — before any doctor is assigned and without a
 * doctor-issued one-time link. They write the same `intake_form` item as the
 * public link flow in `intake.ts`, so doctor read/acknowledge is unchanged.
 *
 * Unlike `intake.ts` (whose endpoints are `security: []` and are authorized by
 * the link token in the path), every call here is authenticated with the
 * patient's Cognito IdToken through the shared client in `src/lib/api.ts`.
 *
 * Ownership failures are returned by the backend as **404**, not 403, so the API
 * does not disclose that a booking exists. Callers must not treat 404 on a write
 * as "no intake yet".
 */

/** Questionnaire-v2 optimistic-concurrency metadata for authenticated saves. */
export interface SavePatientIntakeStepOptions {
  questionnaireVersion: 2;
  expectedRevision: number;
  idempotencyKey?: string;
}

/** Section payload accepted for one {@link IntakeStep}. */
export type PatientIntakeStepData =
  | IntakePurposeSection
  | IntakeDetailsSection
  | IntakeReviewSection;

/**
 * Save one step of the patient's own intake form
 * (`PUT /v1/bookings/{bookingId}/intake`).
 *
 * Creates the form on the first call. Editable while the booking is
 * `pending_payment`, `payment_submitted`, or `confirmed`.
 *
 * @param token          - Cognito IdToken of the booking-owning patient.
 * @param bookingId      - Booking identifier (contract pattern `^bk_[a-z0-9]+$`).
 * @param step           - Which section is being saved.
 * @param data           - The section payload for `step`.
 * @param options         - Legacy idempotency key, or questionnaire-v2
 *                          revision metadata plus an optional idempotency key.
 * @returns The updated {@link IntakeForm}.
 * @throws {ApiError} 404 when not the owner, 409 when already submitted or the
 *   booking is terminal, 422 on an invalid step/payload.
 */
export async function savePatientIntakeStep(
  token: string,
  bookingId: string,
  step: IntakeStep,
  data: PatientIntakeStepData,
  options?: string | SavePatientIntakeStepOptions,
): Promise<IntakeForm> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to save your intake form.",
      401,
    );
  }

  const metadata = typeof options === "string" ? undefined : options;
  const body = {
    step,
    data,
    ...(metadata
      ? {
          questionnaireVersion: metadata.questionnaireVersion,
          expectedRevision: metadata.expectedRevision,
        }
      : {}),
  };
  const res = await api.put<IntakeForm>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/intake`,
    token,
    body,
    typeof options === "string" ? options : options?.idempotencyKey,
  );

  return res.data;
}

/**
 * Finalize the patient's own intake form
 * (`POST /v1/bookings/{bookingId}/intake/submissions`).
 *
 * Requires a non-empty chief complaint and a confirmed review section — the
 * same validation the link flow applies — so all three steps must be saved
 * first.
 *
 * @param token          - Cognito IdToken of the booking-owning patient.
 * @param bookingId      - Booking identifier.
 * @param idempotencyKey - Optional key reused across retries of one logical
 *                         submission; auto-generated when omitted.
 * @returns The submitted {@link IntakeForm} (`status: "submitted"`).
 * @throws {ApiError} 409 on a double submit, 422 when the form is incomplete.
 */
export async function submitPatientIntake(
  token: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<IntakeForm> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to submit your intake form.",
      401,
    );
  }

  const res = await api.post<IntakeForm>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/intake/submissions`,
    token,
    {},
    idempotencyKey,
  );

  return res.data;
}

/**
 * Read the intake form for a booking (`GET /v1/bookings/{bookingId}/intake`).
 *
 * A booking with no intake form yet returns 404, which is a normal state rather
 * than an error, so it is mapped to `null`. Every other failure is rethrown so
 * an auth or server problem is not silently read as "not started".
 *
 * @param token     - Cognito IdToken of the booking-owning patient.
 * @param bookingId - Booking identifier.
 * @returns The {@link IntakeForm}, or `null` when none exists yet.
 */
export async function fetchPatientIntake(
  token: string,
  bookingId: string,
): Promise<IntakeForm | null> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view this intake form.",
      401,
    );
  }

  try {
    const res = await api.get<IntakeForm>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/intake`,
      token,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export type { IntakeForm, IntakeStep };
export { ApiError };
