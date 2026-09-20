import type {
  IntakeStructuredMedicalHistory,
  IntakeSymptomReview,
} from "@/features/doctor/lib/api/bookingIntake";

/**
 * Shared display vocabulary for the structured intake fields the updated
 * intake form collects (`structuredMedicalHistory`, `symptomReview`,
 * `reproductiveHealth`, `baselineMeasurements`). One copy, read by the
 * doctor's in-room Patient Intake tab, the patient's "What You Shared" tab,
 * and the post-consult workspace's patient rail — all three render the same
 * `IntakeDetailsSection` and had drifted into three near-identical label
 * maps before this file existed.
 */

export const KNOWN_CONDITION_LABELS: Record<string, string> = {
  hypertension: "Hypertension",
  diabetes: "Diabetes",
  asthma: "Asthma",
  heart_disease: "Heart disease",
  stroke: "Stroke",
  kidney_disease: "Kidney disease",
  liver_disease: "Liver disease",
  cancer: "Cancer",
  thyroid_disorder: "Thyroid disorder",
  seizure_disorder: "Seizure disorder",
  bleeding_disorder: "Bleeding disorder",
  mental_health_condition: "Mental health condition",
  other: "Other",
};

export const SYMPTOM_REVIEW_FIELDS: ReadonlyArray<{
  key: keyof IntakeSymptomReview;
  label: string;
}> = [
  { key: "onset", label: "Onset" },
  { key: "pattern", label: "Pattern" },
  { key: "location", label: "Location" },
  { key: "characteristics", label: "Characteristics" },
  { key: "aggravatingFactors", label: "Aggravating factors" },
  { key: "relievingFactors", label: "Relieving factors" },
  { key: "associatedSymptoms", label: "Associated symptoms" },
  { key: "treatmentsTried", label: "Treatments tried" },
];

export const CYCLE_PATTERN_LABELS: Record<string, string> = {
  regular: "Regular",
  irregular: "Irregular",
  absent: "Absent",
  not_applicable: "Not applicable",
  unsure: "Unsure",
  prefer_not_to_say: "Prefers not to say",
};

export const PREGNANCY_POSSIBILITY_LABELS: Record<string, string> = {
  possible: "Possible",
  not_possible: "Not possible",
  not_applicable: "Not applicable",
  unsure: "Unsure",
  prefer_not_to_say: "Prefers not to say",
};

/**
 * Labels the free-text `medicalHistory` block carries that a structured field
 * now renders instead — "Height" and "Weight" duplicate
 * `details.baselineMeasurements`, which is the value the updated intake form
 * actually submits as numbers rather than folded text. Callers that have a
 * `baselineMeasurements` value should filter these labels out of
 * `parseMedicalHistoryLines(...)` rather than show both.
 */
export const SUPPRESSED_BASELINE_HISTORY_LABELS = new Set(["Height", "Weight"]);

/** Readable labels for the known-conditions checklist, "Other" filtered out. */
export function knownConditionLabels(history: IntakeStructuredMedicalHistory): string[] {
  return history.knownConditions
    .map((condition) => KNOWN_CONDITION_LABELS[condition] ?? condition)
    .filter((label) => label !== "Other");
}
