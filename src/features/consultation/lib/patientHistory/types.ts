/**
 * Patient chart: the versioned "Past medical history" record.
 *
 * Shape follows the clinic's two paper templates (Medical History Information
 * Sheet and the I–VIII Medical History Template), merged into the order a
 * clinician reads them. Only part of it maps onto today's API (intake
 * `structuredMedicalHistory`, `allergies`, `demographics`,
 * `reproductiveHealth`); the rest exists only behind the seam in `./api.ts`
 * until the backend contract in CHANGELOG_UI_V5 ships.
 *
 * Numeric clinical inputs (TPAL counts, pack-years inputs, cycle days) are kept
 * as strings exactly as typed, so an empty box stays empty rather than becoming
 * 0. `./diff.ts` and `packYears()` parse them where a number is needed.
 */

export const HISTORY_SECTION_IDS = [
  "allergies",
  "demographics",
  "medical",
  "surgical",
  "family",
  "obgyn",
  "social",
] as const;

export type HistorySectionId = (typeof HISTORY_SECTION_IDS)[number];

/** Yes / No / not asked. "" means the question has not been answered. */
export type TriState = "yes" | "no" | "";

export interface AllergiesSection {
  /** Drug and other allergies with the reaction, free text as the doctor writes it. */
  drug: string;
  /** The patient states no known allergies (NKDA). Mutually exclusive with `drug`. */
  noneKnown: boolean;
  latex: TriState;
}

export interface DemographicsSection {
  dateOfBirth: string;
  sex: "" | "male" | "female" | "prefer_not_to_say";
  address: string;
  nationality: string;
  occupation: string;
  maritalStatus: string;
}

export interface MedicalSection {
  /** Condition ids from `CONDITION_OPTIONS` in `./labels.ts`. */
  conditions: string[];
  noneReported: boolean;
  cancerType: string;
  other: string;
  /** Chronic diseases' maintenance medicines (pilot item: PMH with maintenance meds). */
  maintenanceMeds: string;
  /** "History of serious injuries / illnesses" from the sheet. */
  seriousIllness: string;
}

export interface SurgicalEntry {
  id: string;
  procedure: string;
  year: string;
  complication: string;
}

export interface SurgicalSection {
  entries: SurgicalEntry[];
  noneReported: boolean;
}

export type Relative = "mother" | "father" | "sibling" | "child" | "grandparent" | "other";

export interface FamilySection {
  /** Condition id → relatives who have had it. A condition with no relatives is absent. */
  conditions: Record<string, Relative[]>;
  noneReported: boolean;
  other: string;
}

export interface ObGynSection {
  gravida: string;
  term: string;
  preterm: string;
  abortion: string;
  living: string;
  /** ISO calendar date of the first day of the last menstrual period. */
  lastMenstrualPeriod: string;
  /** Cycle interval in days, e.g. "28". */
  intervalDays: string;
  /** Bleeding duration in days, e.g. "5". */
  durationDays: string;
  contraception: string;
}

export type TobaccoUse = "" | "never" | "former" | "current";
export type AlcoholUse = "" | "none" | "occasional" | "daily";

export interface SocialSection {
  tobacco: TobaccoUse;
  packsPerDay: string;
  tobaccoYears: string;
  alcohol: AlcoholUse;
  /** Other substance use, free text. */
  substances: string;
  sexuallyActive: TriState;
  partners: string;
  sexualContraception: string;
  livesAlone: TriState;
}

export interface PatientHistoryData {
  allergies: AllergiesSection;
  demographics: DemographicsSection;
  medical: MedicalSection;
  surgical: SurgicalSection;
  family: FamilySection;
  obgyn: ObGynSection;
  social: SocialSection;
}

/**
 * How a section stands in a saved version.
 * - `updated`: the doctor changed it at that visit.
 * - `reviewed`: the doctor confirmed it unchanged ("Mark as reviewed").
 * - `carried`: copied forward from the previous version without review.
 * - `patient_reported`: saved from the intake without the doctor confirming it.
 * - `not_recorded`: empty.
 */
export type VersionSectionState =
  | "updated"
  | "reviewed"
  | "carried"
  | "patient_reported"
  | "not_recorded";

/** One saved, immutable snapshot of the chart. */
export interface HistoryVersion {
  /** 1-based, ascending. */
  version: number;
  savedAt: string;
  savedBy: string;
  /** The consultation the version was saved from. */
  bookingId: string;
  data: PatientHistoryData;
  sections: Record<HistorySectionId, VersionSectionState>;
}

/**
 * How a section stands in the doctor's working draft.
 * - `from_intake`: filled from today's intake, not yet confirmed by the doctor.
 * - `carried`: unchanged from the latest version and not yet reviewed today.
 * - `reviewed` / `updated` / `not_recorded`: as in {@link VersionSectionState}.
 */
export type DraftSectionState =
  | "from_intake"
  | "carried"
  | "reviewed"
  | "updated"
  | "not_recorded";

/** The doctor's unsaved working copy for one consultation. */
export interface HistoryDraft {
  bookingId: string;
  /** The version this draft started from, or null on a first consult. */
  baseVersion: number | null;
  data: PatientHistoryData;
  /** Sections the doctor confirmed unchanged. */
  reviewed: HistorySectionId[];
  /** Sections the doctor edited. */
  edited: HistorySectionId[];
  updatedAt: string;
}

/**
 * - `demo`: demo bookings; reads and saves are client-side.
 * - `unavailable`: a real booking, but the backend has no history API yet.
 */
export type HistoryAvailability = "demo" | "unavailable";

export interface PatientHistoryRecord {
  availability: HistoryAvailability;
  /** Ascending by version; empty on a first consult. */
  versions: HistoryVersion[];
}
