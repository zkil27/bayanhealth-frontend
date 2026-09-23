import { api, ApiError } from "@/lib/api";

/**
 * Doctor-side read of a booking's patient intake (ADR-20260806-01).
 *
 * `GET /v1/bookings/{bookingId}/intake` is already readable by the assigned
 * doctor, but nothing on the doctor surface called it — the intake panel in the
 * dashboard drawer rendered a fixed migraine case with a fixed phone number,
 * address, OLDCART set, and attachment list, regardless of which booking was
 * open. This is the client that replaces it with what the patient submitted.
 */

import type {
  IntakeBaselineMeasurements,
  IntakeComplaintTag,
  IntakeDemographics,
  IntakeDetailsSection,
  IntakeFormStatus,
  IntakeKnownCondition,
  IntakePurposeSection,
  IntakeReproductiveHealth,
  IntakeReviewSection,
  IntakeSafetyScreen,
  IntakeStep,
  IntakeStructuredMedicalHistory,
  IntakeSymptomReview,
  IntakeTextField,
  IntakeVitals,
} from "../../../booking/lib/api/intake";

export type {
  IntakeBaselineMeasurements,
  IntakeComplaintTag,
  IntakeDemographics,
  IntakeKnownCondition,
  IntakeReproductiveHealth,
  IntakeSafetyScreen,
  IntakeStructuredMedicalHistory,
  IntakeSymptomReview,
  IntakeTextField,
  IntakeVitals,
};

/** Doctor-facing response sections, derived from the questionnaire contract. */
export interface IntakeSections {
  purpose?: IntakePurposeSection;
  details?: IntakeDetailsSection;
  review?: IntakeReviewSection;
}

export interface BookingIntakeForm {
  questionnaireVersion?: 1 | 2;
  revision?: number;
  bookingId: string;
  status: IntakeFormStatus;
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  sections: IntakeSections;
  submittedAt?: string;
  acknowledgedAt?: string;
  /**
   * The patient's saved display name, present only when the caller is the
   * assigned doctor or an admin — the backend never sends a patient their own
   * name back on their own read. Absent when they have not saved one.
   */
  patientName?: string;
}

const NEGATIVE_ALLERGY_PATTERNS = [
  /^none$/i,
  /^nkda$/i,
  /^nka$/i,
  /^n\/?a$/i,
  /^denied$/i,
  /^negative$/i,
  /no known/i,
];

export function isNegativeAllergy(allergies: string | undefined): boolean {
  const trimmed = allergies?.trim();
  if (!trimmed) return true;
  return NEGATIVE_ALLERGY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * The allergy string to surface as a warning, or `undefined`.
 *
 * Negative allergy statements (e.g. "None", "NKDA", "No known drug allergies")
 * are patient assertions of no allergies, so they must not be shown as a warning tag.
 */
export function usableAllergyLabel(allergies: string | undefined): string | undefined {
  const trimmed = allergies?.trim();
  if (!trimmed || isNegativeAllergy(trimmed)) return undefined;
  return trimmed;
}

/** Human-readable label for the contract's `sex` enum. */
export const SEX_LABELS: Record<NonNullable<IntakeDemographics["sex"]>, string> = {
  male: "Male",
  female: "Female",
  prefer_not_to_say: "Sex not disclosed",
};

/**
 * Whole years between `dateOfBirth` and today, or `undefined` when the date is
 * missing or unparseable. Age is derived for display only — the contract stores
 * the birth date, not the age, so this stays correct as time passes.
 */
export function ageFromDateOfBirth(dateOfBirth: string | undefined): number | undefined {
  if (!dateOfBirth) return undefined;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : undefined;
}

/**
 * Read the intake for a booking as the assigned doctor.
 *
 * Returns null on 404, which the backend uses both for "no intake form yet" and
 * for a booking the caller is not assigned to. The panel renders an explicit
 * "no intake submitted" state rather than treating either as an error.
 */
export async function fetchBookingIntake(
  idToken: string,
  bookingId: string,
): Promise<BookingIntakeForm | null> {
  if (bookingId === "demo" || bookingId.startsWith("demo")) {
    if (bookingId === "demo-sch-ramon") {
      return {
        bookingId: "demo-sch-ramon",
        status: "submitted",
        currentStep: "review",
        completedSteps: ["purpose", "details", "review"],
        patientName: "Ramon Dela Cruz",
        sections: {
          purpose: {
            chiefComplaint: "T2DM & Stage 1 HTN routine 3-month review. Blood pressure 142/88. Maintenance refill requested.",
          },
          details: {
            demographics: {
              sex: "male",
              dateOfBirth: "1968-11-04",
            },
            safetyScreen: {
              chestPain: false,
              dyspnea: false,
              feverDays: 0,
            },
            symptomReview: {
              onset: "3 months ago",
              location: "Cardiovascular / Endocrine",
              characteristics: "Occasional morning occipital heaviness",
            },
            allergies: "Amlodipine (peripheral edema)",
            structuredMedicalHistory: {
              knownConditions: ["diabetes", "hypertension"],
              noneReported: false,
            },
            vitals: {
              systolicBp: 142,
              diastolicBp: 88,
              heartRateBpm: 76,
              temperatureC: 36.6,
              spo2Percent: 99,
            },
          },
        },
        submittedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      };
    }
    if (bookingId === "demo-req-manuel") {
      return {
        bookingId: "demo-req-manuel",
        status: "submitted",
        currentStep: "review",
        completedSteps: ["purpose", "details", "review"],
        patientName: "Manuel Tan",
        sections: {
          purpose: {
            chiefComplaint: "Acute gastroenteritis x 5 diarrhea episodes, tolerating oral fluids.",
          },
          details: {
            demographics: {
              sex: "male",
              dateOfBirth: "1985-08-20",
            },
            safetyScreen: {
              chestPain: false,
              dyspnea: false,
              feverDays: 1,
            },
            symptomReview: {
              onset: "1 day ago",
              location: "Gastrointestinal",
              characteristics: "Watery stools, mild crampy abdominal pain",
            },
            allergies: "No known drug allergies (NKDA)",
            structuredMedicalHistory: {
              knownConditions: [],
              noneReported: true,
            },
            vitals: {
              systolicBp: 112,
              diastolicBp: 74,
              heartRateBpm: 84,
              temperatureC: 37.4,
              spo2Percent: 99,
            },
          },
        },
        submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      };
    }
    return {
      bookingId: bookingId || "demo",
      status: "submitted",
      currentStep: "review",
      completedSteps: ["purpose", "details", "review"],
      patientName: "Maria Santos",
      sections: {
        purpose: {
          chiefComplaint: "Fever and persistent productive cough for 3 days with mild dyspnea and fatigue.",
        },
        details: {
          demographics: {
            sex: "female",
            dateOfBirth: "1992-05-14",
          },
          safetyScreen: {
            chestPain: false,
            dyspnea: false,
            feverDays: 3,
          },
          symptomReview: {
            onset: "3 days ago",
            location: "Chest / Upper Respiratory",
            characteristics: "Productive cough with sputum",
          },
          allergies: "No known drug allergies (NKDA)",
          structuredMedicalHistory: {
            knownConditions: [],
            noneReported: true,
          },
          vitals: {
            temperatureC: 38.2,
            systolicBp: 118,
            diastolicBp: 76,
            heartRateBpm: 82,
            spo2Percent: 98,
          },
        },
      },
      submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    };
  }
  if (!idToken || !bookingId) return null;
  try {
    const res = await api.get<BookingIntakeForm>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/intake`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    console.warn("fetchBookingIntake network/CORS error, returning null:", err);
    return null;
  }
}

/** OLDCART keys in the order a clinician reads them, with display labels. */
/**
 * OLDCART keys in the order a clinician reads them.
 *
 * Must stay identical to the canonical `OldcartField` vocabulary in
 * `backend/src/lib/intake.ts` and to the mapping table in the patient form's
 * `intakeMapper.ts`. The stored map is open, so a key that drifts out of
 * agreement renders as "Not answered" rather than raising anything.
 */
export const OLDCART_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "onset", label: "Onset" },
  { key: "location", label: "Location" },
  { key: "duration", label: "Duration" },
  { key: "characteristics", label: "Characteristics" },
  { key: "radiation", label: "Radiation" },
  { key: "timing", label: "Timing" },
  { key: "aggravating_factors", label: "Aggravating factors" },
  { key: "alleviating_factors", label: "Alleviating factors" },
  { key: "related_symptoms", label: "Related symptoms" },
  { key: "treatments_tried", label: "Treatments tried" },
];
