import { KNOWN_CONDITION_LABELS } from "../intakeDisplay";
import type {
  AlcoholUse,
  DraftSectionState,
  HistorySectionId,
  Relative,
  TobaccoUse,
  VersionSectionState,
} from "./types";

/** Section titles, in chart order. `short` is for phone tabs and chips. */
export const SECTION_LABELS: Record<HistorySectionId, { title: string; short: string }> = {
  allergies: { title: "Allergies", short: "Allergies" },
  demographics: { title: "Demographics", short: "About" },
  medical: { title: "Past medical history", short: "Medical" },
  surgical: { title: "Surgical history", short: "Surgical" },
  family: { title: "Family history", short: "Family" },
  obgyn: { title: "Gynecologic history", short: "OB/GYN" },
  social: { title: "Social history", short: "Social" },
};

/** Patient-facing section titles: plain English, no clinical shorthand. */
export const PATIENT_SECTION_LABELS: Record<HistorySectionId, string> = {
  allergies: "Allergies",
  demographics: "About you",
  medical: "Health conditions",
  surgical: "Operations",
  family: "Family health",
  obgyn: "Women's health",
  social: "Lifestyle",
};

export interface ConditionOption {
  id: string;
  label: string;
  group: ConditionGroup;
}

export type ConditionGroup =
  | "Heart & blood"
  | "Lungs"
  | "Metabolic"
  | "Organs"
  | "Infection"
  | "Bones & joints"
  | "Other";

/** Contract enum label first, so the chart and the intake never name a condition two ways. */
const contract = (id: string) => KNOWN_CONDITION_LABELS[id] ?? id;

/**
 * The sheet's checklist, merged with the intake contract's 12 known conditions.
 * Ids that match `IntakeKnownCondition` keep the contract's id so the intake
 * prefill lands on the same box.
 */
export const CONDITION_OPTIONS: ReadonlyArray<ConditionOption> = [
  { id: "hypertension", label: contract("hypertension"), group: "Heart & blood" },
  { id: "high_cholesterol", label: "High cholesterol", group: "Heart & blood" },
  { id: "heart_disease", label: contract("heart_disease"), group: "Heart & blood" },
  { id: "stroke", label: contract("stroke"), group: "Heart & blood" },
  { id: "dvt", label: "DVT", group: "Heart & blood" },
  { id: "pulmonary_embolism", label: "Pulmonary embolism", group: "Heart & blood" },
  { id: "vein_trouble", label: "Vein trouble", group: "Heart & blood" },
  { id: "bleeding_disorder", label: contract("bleeding_disorder"), group: "Heart & blood" },
  { id: "asthma", label: contract("asthma"), group: "Lungs" },
  { id: "lung_disease", label: "Lung disease", group: "Lungs" },
  { id: "pneumonia", label: "Pneumonia", group: "Lungs" },
  { id: "tuberculosis", label: "Tuberculosis", group: "Lungs" },
  { id: "seasonal_allergies", label: "Seasonal allergies", group: "Lungs" },
  { id: "sinus", label: "Sinus problems", group: "Lungs" },
  { id: "diabetes", label: contract("diabetes"), group: "Metabolic" },
  { id: "thyroid_disorder", label: contract("thyroid_disorder"), group: "Metabolic" },
  { id: "kidney_disease", label: contract("kidney_disease"), group: "Organs" },
  { id: "liver_disease", label: contract("liver_disease"), group: "Organs" },
  { id: "gastrointestinal", label: "Gastrointestinal", group: "Organs" },
  { id: "seizure_disorder", label: contract("seizure_disorder"), group: "Organs" },
  { id: "hepatitis", label: "Hepatitis", group: "Infection" },
  { id: "hiv", label: "HIV", group: "Infection" },
  { id: "tonsillitis", label: "Tonsillitis", group: "Infection" },
  { id: "arthritis", label: "Arthritis", group: "Bones & joints" },
  { id: "osteoporosis", label: "Osteoporosis", group: "Bones & joints" },
  { id: "joint_replacement", label: "Joint replacement", group: "Bones & joints" },
  { id: "cancer", label: contract("cancer"), group: "Other" },
  { id: "mental_health_condition", label: contract("mental_health_condition"), group: "Other" },
  { id: "substance_use", label: "Drug or alcohol dependence", group: "Other" },
];

/** The sheet's family-history column: the conditions worth asking about relatives. */
export const FAMILY_CONDITION_IDS: ReadonlyArray<string> = [
  "hypertension",
  "high_cholesterol",
  "heart_disease",
  "stroke",
  "diabetes",
  "cancer",
  "kidney_disease",
  "asthma",
  "lung_disease",
  "thyroid_disorder",
  "seizure_disorder",
  "bleeding_disorder",
  "dvt",
  "tuberculosis",
  "hepatitis",
  "arthritis",
  "osteoporosis",
  "mental_health_condition",
  "substance_use",
];

const CONDITION_LABEL_BY_ID = new Map(CONDITION_OPTIONS.map((o) => [o.id, o.label]));

export function conditionLabel(id: string): string {
  return CONDITION_LABEL_BY_ID.get(id) ?? id.replaceAll("_", " ");
}

export const RELATIVE_OPTIONS: ReadonlyArray<{ id: Relative; label: string; short: string }> = [
  { id: "mother", label: "Mother", short: "Mo" },
  { id: "father", label: "Father", short: "Fa" },
  { id: "sibling", label: "Sibling", short: "Sib" },
  { id: "child", label: "Child", short: "Ch" },
  { id: "grandparent", label: "Grandparent", short: "GP" },
  { id: "other", label: "Other relative", short: "Oth" },
];

export function relativeLabel(id: Relative): string {
  return RELATIVE_OPTIONS.find((r) => r.id === id)?.label ?? id;
}

export const TOBACCO_LABELS: Record<Exclude<TobaccoUse, "">, string> = {
  never: "Never smoked",
  former: "Former smoker",
  current: "Current smoker",
};

export const ALCOHOL_LABELS: Record<Exclude<AlcoholUse, "">, string> = {
  none: "None",
  occasional: "Occasional",
  daily: "Daily",
};

export const SEX_OPTION_LABELS = {
  male: "Male",
  female: "Female",
  prefer_not_to_say: "Not disclosed",
} as const;

/** Wording and tone for a section's status. Words always carry the meaning; tone only supports it. */
export const DRAFT_STATE_TEXT: Record<
  DraftSectionState,
  { label: string; tone: "neutral" | "attention" | "info" | "success" }
> = {
  from_intake: { label: "From intake · confirm", tone: "attention" },
  carried: { label: "Not reviewed today", tone: "neutral" },
  reviewed: { label: "Reviewed today", tone: "success" },
  updated: { label: "Updated today", tone: "info" },
  not_recorded: { label: "Not recorded", tone: "neutral" },
};

export const VERSION_STATE_TEXT: Record<
  VersionSectionState,
  { label: string; tone: "neutral" | "attention" | "info" | "success" }
> = {
  updated: { label: "Updated", tone: "info" },
  reviewed: { label: "Reviewed", tone: "success" },
  carried: { label: "Carried forward", tone: "neutral" },
  patient_reported: { label: "Patient-reported", tone: "attention" },
  not_recorded: { label: "Not recorded", tone: "neutral" },
};
