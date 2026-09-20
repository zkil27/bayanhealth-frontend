/**
 * Real backend client for the PUBLIC patient intake-link endpoints.
 *
 * These endpoints are declared `security: []` in contracts/openapi.yaml — they
 * are authenticated solely by the one-time intake link token in the path, so we
 * deliberately call them WITHOUT an Authorization header. This is intentionally
 * separate from the authenticated client in `src/lib/api.ts`.
 *
 * NOTE: There is no mock here. All requests hit the deployed backend at
 * `NEXT_PUBLIC_API_BASE_URL`.
 */

import { ApiError } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

/** Triage step discriminator (contract: IntakeStep). */
export type IntakeStep = "purpose" | "details" | "review";

/** Intake link lifecycle (contract: IntakeLinkStatus). */
export type IntakeLinkStatus = "active" | "expired" | "consumed";

/** Intake form lifecycle (contract: IntakeFormStatus). */
export type IntakeFormStatus = "draft" | "submitted" | "acknowledged";

/** contract: IntakePurposeSection */
export interface IntakePurposeSection {
  chiefComplaint?: string;
  patientVerbatim?: string;
  complaintTags?: IntakeComplaintTag[];
}

export type IntakeComplaintTag =
  | "fever"
  | "cough"
  | "colds"
  | "sore_throat"
  | "headache"
  | "dizziness"
  | "chest_discomfort"
  | "breathing_concern"
  | "abdominal_pain"
  | "nausea_or_vomiting"
  | "diarrhea"
  | "urinary_concern"
  | "skin_concern"
  | "musculoskeletal_pain"
  | "fatigue"
  | "reproductive_health"
  | "mental_health"
  | "medication_request"
  | "other";

/** contract: IntakeTextField */
export interface IntakeTextField {
  text: string;
}

/**
 * contract: IntakeSafetyScreen
 *
 * Structured red-flag answers. Every field is optional and `undefined` means
 * "not answered" — never "no". The backend's deterministic router cannot tell a
 * defaulted negative from a real one, so the distinction has to be preserved
 * here rather than filled in.
 */
export interface IntakeSafetyScreen {
  chestPain?: boolean;
  dyspnea?: boolean;
  feverDays?: number;
}

/**
 * contract: IntakeVitals
 *
 * Structured vital signs. Every field is optional and `undefined` means "not
 * recorded" — never a value. Out-of-range input is dropped by the backend
 * rather than clamped.
 */
export interface IntakeVitals {
  temperatureC?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  spo2Percent?: number;
}

/** contract: IntakeDemographics — age is derived from `dateOfBirth`, not stored. */
export interface IntakeDemographics {
  dateOfBirth?: string;
  sex?: "male" | "female" | "prefer_not_to_say";
}

export interface IntakeBaselineMeasurements {
  heightCm: number;
  weightKg: number;
  selfReported?: boolean;
  vitals?: IntakeVitals;
}

export type IntakeKnownCondition =
  | "hypertension"
  | "diabetes"
  | "asthma"
  | "heart_disease"
  | "stroke"
  | "kidney_disease"
  | "liver_disease"
  | "cancer"
  | "thyroid_disorder"
  | "seizure_disorder"
  | "bleeding_disorder"
  | "mental_health_condition"
  | "other";

export interface IntakeStructuredMedicalHistory {
  knownConditions: IntakeKnownCondition[];
  noneReported: boolean;
  other?: string;
  details?: string;
  currentMedications?: string;
}

export interface IntakeSymptomReview {
  onset?: string;
  pattern?: string;
  location?: string;
  characteristics?: string;
  aggravatingFactors?: string;
  relievingFactors?: string;
  associatedSymptoms?: string;
  treatmentsTried?: string;
  painSeverity?: number;
}

export interface IntakeReproductiveHealth {
  pregnancyPossibility:
    | "possible"
    | "not_possible"
    | "not_applicable"
    | "unsure"
    | "prefer_not_to_say";
  lastMenstrualPeriod?: string;
  cyclePattern?:
    | "regular"
    | "irregular"
    | "absent"
    | "not_applicable"
    | "unsure"
    | "prefer_not_to_say";
}

/** contract: IntakeDetailsSection */
export interface IntakeDetailsSection {
  oldcart?: Record<string, IntakeTextField>;
  medications?: string;
  allergies?: string;
  medicalHistory?: string;
  baselineMeasurements?: IntakeBaselineMeasurements;
  structuredMedicalHistory?: IntakeStructuredMedicalHistory;
  symptomReview?: IntakeSymptomReview;
  reproductiveHealth?: IntakeReproductiveHealth;
  safetyScreen?: IntakeSafetyScreen;
  vitals?: IntakeVitals;
  demographics?: IntakeDemographics;
}

/** contract: IntakeReviewSection */
export interface IntakeReviewSection {
  confirmed?: boolean;
}

/** contract: IntakeSections */
export interface IntakeSections {
  purpose?: IntakePurposeSection;
  details?: IntakeDetailsSection;
  review?: IntakeReviewSection;
}

/** contract: ActiveIntakeLinkStatusResponse */
export interface ActiveIntakeLinkStatusResponse {
  bookingId: string;
  linkStatus: "active";
  expiresAt: string;
  consumedAt?: string;
  formStatus: IntakeFormStatus;
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  serviceType?: "general" | "specialist" | "follow_up" | "emergency";
  scheduledAt?: string;
  channel?: "video" | "audio" | "chat";
}

/** contract: InactiveIntakeLinkStatusResponse */
export interface InactiveIntakeLinkStatusResponse {
  linkStatus: Exclude<IntakeLinkStatus, "active">;
}

/** contract: IntakeLinkStatusResponse */
export type IntakeLinkStatusResponse =
  | ActiveIntakeLinkStatusResponse
  | InactiveIntakeLinkStatusResponse;

/** contract: IntakeDraftResponse */
export interface IntakeDraftResponse {
  bookingId: string;
  formStatus: IntakeFormStatus;
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  sections: IntakeSections;
}

/** contract: IntakeForm */
export interface IntakeForm {
  questionnaireVersion?: 1 | 2;
  revision?: number;
  bookingId: string;
  patientId: string;
  doctorId: string;
  status: IntakeFormStatus;
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  sections: IntakeSections;
  submittedAt?: string;
  acknowledgedAt?: string;
}

/** Backend success envelope: { data, meta }. */
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
  };
}

/**
 * Unauthenticated fetch against a public intake-link endpoint.
 * Parses the `{ data, meta }` success envelope and throws an {@link ApiError}
 * mirroring the `{ error: { code, message } }` failure envelope.
 */
async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? "API_ERROR",
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }

  return (body as ApiResponse<T>).data;
}

/** GET /v1/intake-links/{token} — inspect a public intake link. */
export function inspectIntakeLink(
  token: string,
): Promise<IntakeLinkStatusResponse> {
  return publicRequest<IntakeLinkStatusResponse>(
    `/v1/intake-links/${encodeURIComponent(token)}`,
    { method: "GET" },
  );
}

/** PUT /v1/intake-links/{token}/draft — save one step's section payload. */
export function saveIntakeDraft(
  token: string,
  step: IntakeStep,
  data: IntakePurposeSection | IntakeDetailsSection | IntakeReviewSection,
): Promise<IntakeDraftResponse> {
  return publicRequest<IntakeDraftResponse>(
    `/v1/intake-links/${encodeURIComponent(token)}/draft`,
    {
      method: "PUT",
      body: JSON.stringify({ step, data }),
    },
  );
}

/** POST /v1/intake-links/{token}/submit — finalize and consume the link. */
export function submitIntakeForm(token: string): Promise<IntakeForm> {
  return publicRequest<IntakeForm>(
    `/v1/intake-links/${encodeURIComponent(token)}/submit`,
    { method: "POST" },
  );
}
