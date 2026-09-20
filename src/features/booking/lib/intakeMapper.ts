/**
 * Faithful, lossless-as-text mapping from the rich dynamic intake form values
 * to the three contract section payloads (contracts/openapi.yaml IntakeSections).
 *
 * The backend intake model has three sections — purpose, details, review — that
 * are intentionally narrower than the patient-facing form. To avoid losing any
 * information the patient typed, everything that does not have a dedicated field
 * is folded into `details.medicalHistory` as readable text.
 */

import {
  mergeWithStoredData,
  type DynamicIntakeFormValues,
} from "@/features/booking/schemas/intakeSchema";
import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import type {
  IntakeBaselineMeasurements,
  IntakeComplaintTag,
  IntakeDemographics,
  IntakeDetailsSection,
  IntakeForm,
  IntakePurposeSection,
  IntakeReproductiveHealth,
  IntakeReviewSection,
  IntakeSafetyScreen,
  IntakeStructuredMedicalHistory,
  IntakeSymptomReview,
  IntakeTextField,
  IntakeVitals,
} from "@/features/booking/lib/api/intake";

export interface MappedIntakeSections {
  purpose: IntakePurposeSection;
  details: IntakeDetailsSection;
  review: IntakeReviewSection;
}

// Contract maxLength constraints.
const MAX_CHIEF_COMPLAINT = 2000;
const MAX_TEXT = 4000;

/** Truncate `value` to `max` characters (contract maxLength enforcement). */
function cap(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

const SERVICE_LABELS: Record<string, string> = {
  "fit-for-work": "Fit for Work",
  "fit-for-school": "Fit for School",
  "fit-for-travel": "Fit for Travel",
  "fit-for-climb": "Fit for Climb",
  "sick-leave": "Sick Leave",
  teleconsult: "Teleconsult",
};

/** A subset of consultationSchema fields used to build the OLDCART map. */
interface SymptomSource {
  onset?: string;
  location?: string;
  duration?: string;
  characteristics?: string;
  aggravatingFactors?: string;
  alleviatingFactors?: string;
  radiation?: string;
  timing?: string;
  priorTreatment?: string;
}

/**
 * Resolve the symptom source for the OLDCART map:
 * - teleconsult: the requestDetails themselves carry the symptom fields;
 * - sick-leave: nested under requestDetails.symptomDetails;
 * - all other services: no structured symptom data.
 */
function getSymptomSource(
  values: DynamicIntakeFormValues,
): SymptomSource | null {
  const rd = values.requestDetails;
  if (rd.type === "teleconsult") {
    return rd;
  }
  if (rd.type === "sick-leave") {
    return rd.symptomDetails;
  }
  return null;
}

function getClinicalSymptomSource(values: DynamicIntakeFormValues) {
  const rd = values.requestDetails;
  if (rd.type === "teleconsult") return rd;
  if (rd.type === "sick-leave") return rd.symptomDetails;
  return undefined;
}

function buildComplaintTags(
  values: DynamicIntakeFormValues,
): IntakeComplaintTag[] | undefined {
  const tags = getClinicalSymptomSource(values)?.complaintTags;
  return tags && tags.length > 0 ? [...new Set(tags)].slice(0, 12) : undefined;
}

function finiteNumber(value: string | number | undefined): number | undefined {
  if (typeof value === "string" && value.trim() === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildBaselineMeasurements(
  values: DynamicIntakeFormValues,
): IntakeBaselineMeasurements | undefined {
  const heightCm = finiteNumber(values.personalDetails.height);
  const weightKg = finiteNumber(values.personalDetails.weight);
  if (
    heightCm === undefined ||
    heightCm < 30 ||
    heightCm > 250 ||
    weightKg === undefined ||
    weightKg < 1 ||
    weightKg > 500
  ) {
    return undefined;
  }

  const baseline: IntakeBaselineMeasurements = { heightCm, weightKg };
  if (typeof values.personalDetails.measurementsSelfReported === "boolean") {
    baseline.selfReported = values.personalDetails.measurementsSelfReported;
  }
  const vitals = values.personalDetails.baselineVitals;
  if (vitals) {
    const sanitized: IntakeVitals = {};
    for (const key of [
      "systolicBp",
      "diastolicBp",
      "heartRateBpm",
      "spo2Percent",
    ] as const) {
      const measurement = vitals[key];
      if (isValidVital(key, measurement)) {
        sanitized[key] = measurement;
      }
    }
    if (Object.keys(sanitized).length > 0) baseline.vitals = sanitized;
  }
  return baseline;
}

function cleanOptionalText(value: string | undefined, max = MAX_TEXT) {
  const text = value?.trim();
  return text ? cap(text, max) : undefined;
}

function buildStructuredMedicalHistory(
  values: DynamicIntakeFormValues,
): IntakeStructuredMedicalHistory | undefined {
  const history = values.personalDetails.structuredMedicalHistory;
  if (!history) return undefined;
  const knownConditions = [...new Set(history.knownConditions ?? [])];
  const other = cleanOptionalText(history.other, 500);
  const details = cleanOptionalText(history.details);
  const currentMedications = cleanOptionalText(history.currentMedications);
  const hasAnswer =
    history.noneReported ||
    knownConditions.length > 0 ||
    other !== undefined ||
    details !== undefined ||
    currentMedications !== undefined;
  if (!hasAnswer) return undefined;

  return {
    knownConditions,
    noneReported: history.noneReported,
    ...(other ? { other } : {}),
    ...(details ? { details } : {}),
    ...(currentMedications ? { currentMedications } : {}),
  };
}

function buildSymptomReview(
  values: DynamicIntakeFormValues,
): IntakeSymptomReview | undefined {
  const review = getClinicalSymptomSource(values)?.symptomReview;
  if (!review) return undefined;
  const out: IntakeSymptomReview = {};
  for (const [key, limit] of Object.entries({
    onset: 1000,
    pattern: 1000,
    location: 1000,
    characteristics: 2000,
    aggravatingFactors: 2000,
    relievingFactors: 2000,
    associatedSymptoms: 2000,
    treatmentsTried: 2000,
  }) as [keyof Omit<IntakeSymptomReview, "painSeverity">, number][]) {
    const text = cleanOptionalText(review[key], limit);
    if (text) out[key] = text;
  }
  if (
    typeof review.painSeverity === "number" &&
    Number.isInteger(review.painSeverity) &&
    review.painSeverity >= 0 &&
    review.painSeverity <= 10
  ) {
    out.painSeverity = review.painSeverity;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildReproductiveHealth(
  values: DynamicIntakeFormValues,
): IntakeReproductiveHealth | undefined {
  const health = getClinicalSymptomSource(values)?.reproductiveHealth;
  if (!health) return undefined;
  return {
    pregnancyPossibility: health.pregnancyPossibility,
    ...(cleanOptionalText(health.lastMenstrualPeriod)
      ? { lastMenstrualPeriod: health.lastMenstrualPeriod?.trim() }
      : {}),
    ...(health.cyclePattern ? { cyclePattern: health.cyclePattern } : {}),
  };
}

/** Build the contract `oldcart` map, omitting empty fields entirely. */
function buildOldcart(
  source: SymptomSource | null,
): Record<string, IntakeTextField> | undefined {
  if (!source) return undefined;

  // Keys are the canonical backend OLDCART vocabulary (`OldcartField` in
  // backend/src/lib/intake.ts). They used to be this file's own spellings —
  // `character`, `aggravating`, `alleviating`, `priorTreatment` — and because the
  // stored `oldcart` map is open, nothing rejected them: the doctor's subjective
  // panel and the CDS clinical-input bridge both read those four fields as empty,
  // silently. Forward and inverse mapping here must stay on the shared names.
  const mapping: Array<[string, string | undefined]> = [
    ["onset", source.onset],
    ["location", source.location],
    ["duration", source.duration],
    ["characteristics", source.characteristics],
    ["radiation", source.radiation],
    ["timing", source.timing],
    ["aggravating_factors", source.aggravatingFactors],
    ["alleviating_factors", source.alleviatingFactors],
    ["treatments_tried", source.priorTreatment],
  ];

  const oldcart: Record<string, IntakeTextField> = {};
  for (const [key, raw] of mapping) {
    const text = (raw ?? "").trim();
    if (text) {
      oldcart[key] = { text: cap(text, MAX_TEXT) };
    }
  }

  return Object.keys(oldcart).length > 0 ? oldcart : undefined;
}

/**
 * Project the form's red-flag screening answers onto the contract section.
 *
 * Only the teleconsult and sick-leave flows collect symptoms, so only they carry
 * a screen. Each field is copied only when the patient answered it — `undefined`
 * stays `undefined` all the way to the ingested clinical input, where it reads as
 * unscreened rather than as a negative.
 */
function buildSafetyScreen(
  values: DynamicIntakeFormValues,
): IntakeSafetyScreen | undefined {
  const rd = values.requestDetails;
  const screen =
    rd.type === "teleconsult"
      ? rd.safetyScreen
      : rd.type === "sick-leave"
        ? rd.symptomDetails?.safetyScreen
        : undefined;
  if (!screen) return undefined;

  const out: IntakeSafetyScreen = {};
  if (typeof screen.chestPain === "boolean") out.chestPain = screen.chestPain;
  if (typeof screen.dyspnea === "boolean") out.dyspnea = screen.dyspnea;
  if (
    typeof screen.feverDays === "number" &&
    Number.isInteger(screen.feverDays) &&
    screen.feverDays >= 0 &&
    screen.feverDays <= 60
  ) {
    out.feverDays = screen.feverDays;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const VITALS_KEYS = [
  "temperatureC",
  "systolicBp",
  "diastolicBp",
  "heartRateBpm",
  "spo2Percent",
] as const;

const VITALS_BOUNDS: Record<(typeof VITALS_KEYS)[number], readonly [number, number]> = {
  temperatureC: [30, 45],
  systolicBp: [40, 300],
  diastolicBp: [20, 200],
  heartRateBpm: [20, 300],
  spo2Percent: [50, 100],
};

function isValidVital(
  key: (typeof VITALS_KEYS)[number],
  value: unknown,
): value is number {
  const [min, max] = VITALS_BOUNDS[key];
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    (key === "temperatureC" || Number.isInteger(value))
  );
}

/**
 * Project the form's optional home vitals onto the contract section.
 *
 * Same source resolution as {@link buildSafetyScreen}: only teleconsult and
 * sick-leave carry symptom data. Each reading is copied only when it is a finite
 * number the patient actually entered — a blank field stays absent and reads
 * downstream as "not recorded". The backend still bounds-checks every value.
 */
function buildVitals(
  values: DynamicIntakeFormValues,
): IntakeVitals | undefined {
  const rd = values.requestDetails;
  const source =
    rd.type === "teleconsult"
      ? rd.vitals
      : rd.type === "sick-leave"
        ? rd.symptomDetails?.vitals
        : undefined;
  if (!source) return undefined;

  const out: IntakeVitals = {};
  for (const key of VITALS_KEYS) {
    const value = (source as Record<string, unknown>)[key];
    if (isValidVital(key, value)) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

type FormGender = DynamicIntakeFormValues["personalDetails"]["genderAtBirth"];

/** Map the form's `genderAtBirth` enum onto the contract `sex` enum. */
function toContractSex(
  genderAtBirth: string | undefined,
): IntakeDemographics["sex"] | undefined {
  if (genderAtBirth === "male" || genderAtBirth === "female") return genderAtBirth;
  if (genderAtBirth === "prefer not to say") return "prefer_not_to_say";
  return undefined;
}

/** Inverse of {@link toContractSex}: contract `sex` back onto the form enum. */
function fromContractSex(
  sex: IntakeDemographics["sex"] | undefined,
): FormGender | undefined {
  if (sex === "male" || sex === "female") return sex;
  if (sex === "prefer_not_to_say") return "prefer not to say";
  return undefined;
}

/**
 * Pull structured date of birth and sex out of the personal-details step.
 *
 * These also remain in the folded `medicalHistory` text for continuity; the
 * structured copy is what the reviewing physician's header reads. Age is derived
 * from `dateOfBirth` at display time, never stored.
 */
function buildDemographics(
  values: DynamicIntakeFormValues,
): IntakeDemographics | undefined {
  const pd = values.personalDetails;
  const out: IntakeDemographics = {};

  const dob = pd.dateOfBirth?.trim();
  if (dob) out.dateOfBirth = dob;

  const sex = toContractSex(pd.genderAtBirth);
  if (sex) out.sex = sex;

  return Object.keys(out).length > 0 ? out : undefined;
}

/** True when a multi-select carries only the explicit "None" assertion. */
function isNoneAssertion(selection: string[] | undefined): boolean {
  return selection?.length === 1 && selection[0] === NONE_OPTION;
}

/**
 * Comma-separate the patient's allergens (presets + free text).
 *
 * An asserted "None" is sent as the literal `"None"` rather than an empty
 * string, so the doctor reads an explicit negative instead of missing data.
 */
function buildAllergies(values: DynamicIntakeFormValues): string {
  const { allergens = [], otherAllergens } = values.personalDetails;
  if (isNoneAssertion(allergens)) {
    return NONE_OPTION;
  }
  const parts = (allergens ?? []).filter((a) => a !== NONE_OPTION);
  if (otherAllergens && otherAllergens.trim()) {
    parts.push(otherAllergens.trim());
  }
  return parts.filter(Boolean).join(", ");
}

/** Humanize a camelCase / kebab key into a readable label. */
function humanize(key: string): string {
  return key
    .replace(/-/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatScalar(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Compose a readable multi-line medical-history summary that preserves every
 * personal detail AND every service-specific field the patient entered, so no
 * information is lost in the narrower contract model. Capped at 4000 chars.
 */
function buildMedicalHistory(values: DynamicIntakeFormValues): string {
  const lines: string[] = [];
  const pd = values.personalDetails;

  if (pd.forWhom === "other") {
    lines.push(`For: Someone else${pd.relationship ? ` (${pd.relationship})` : ""}`);
  } else {
    lines.push("For: Self");
  }
  if (pd.name) lines.push(`Name: ${pd.name}`);
  if (pd.dateOfBirth) lines.push(`Date of birth: ${pd.dateOfBirth}`);
  if (pd.genderAtBirth) lines.push(`Sex at birth: ${pd.genderAtBirth}`);
  if (pd.height) lines.push(`Height: ${pd.height} cm`);
  if (pd.weight) lines.push(`Weight: ${pd.weight} kg`);
  if (pd.diet && pd.diet.length > 0) {
    // Spell out the asserted negative; "Diet: None" alone reads as missing data.
    lines.push(
      isNoneAssertion(pd.diet)
        ? "Diet: None — no dietary restrictions reported"
        : `Diet: ${pd.diet.join(", ")}`,
    );
  }

  const rd = values.requestDetails as Record<string, unknown>;
  const serviceLabel = SERVICE_LABELS[rd.type as string] ?? String(rd.type);
  lines.push("");
  lines.push(`Service requested: ${serviceLabel}`);

  const dedicatedClinicalKeys = new Set([
    "complaintTags",
    "symptomReview",
    "reproductiveHealth",
    "safetyScreen",
    "vitals",
  ]);
  for (const [key, raw] of Object.entries(rd)) {
    if (key === "type" || dedicatedClinicalKeys.has(key)) continue;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      // Nested object (e.g. sick-leave symptomDetails, climb healthConditions).
      for (const [subKey, subRaw] of Object.entries(
        raw as Record<string, unknown>,
      )) {
        if (dedicatedClinicalKeys.has(subKey)) continue;
        const formatted = formatScalar(subRaw);
        if (formatted) lines.push(`${humanize(subKey)}: ${formatted}`);
      }
      continue;
    }
    const formatted = formatScalar(raw);
    if (formatted) lines.push(`${humanize(key)}: ${formatted}`);
  }

  return cap(lines.join("\n"), MAX_TEXT);
}

/** Build the contract `purpose.chiefComplaint` for the requested service. */
function buildChiefComplaint(values: DynamicIntakeFormValues): string {
  const rd = values.requestDetails;
  let text: string;
  if (rd.type === "teleconsult") {
    text = rd.chiefComplaint ?? "";
  } else if (rd.type === "sick-leave") {
    text = rd.symptomDetails?.chiefComplaint ?? "";
  } else {
    const label = SERVICE_LABELS[rd.type] ?? rd.type;
    text = `Certificate request: ${label}`;
  }
  return cap(text, MAX_CHIEF_COMPLAINT);
}

/**
 * Map the dynamic intake form values into the three contract section payloads.
 */
export function mapIntakeFormToSections(
  values: DynamicIntakeFormValues,
): MappedIntakeSections {
  const purpose: IntakePurposeSection = {
    chiefComplaint: buildChiefComplaint(values),
    patientVerbatim: cap(
      values.additionalInfo.additionalConcerns ?? "",
      MAX_TEXT,
    ),
  };
  const complaintTags = buildComplaintTags(values);
  if (complaintTags) purpose.complaintTags = complaintTags;

  const structuredMedicalHistory = buildStructuredMedicalHistory(values);
  const details: IntakeDetailsSection = {
    medications:
      structuredMedicalHistory?.currentMedications ??
      values.personalDetails.legacyMedications ??
      "",
    allergies: cap(buildAllergies(values), MAX_TEXT),
    medicalHistory:
      values.personalDetails.legacyMedicalHistory ?? buildMedicalHistory(values),
  };

  const baselineMeasurements = buildBaselineMeasurements(values);
  if (baselineMeasurements) details.baselineMeasurements = baselineMeasurements;
  if (structuredMedicalHistory) {
    details.structuredMedicalHistory = structuredMedicalHistory;
  }
  const symptomReview = buildSymptomReview(values);
  if (symptomReview) details.symptomReview = symptomReview;
  const reproductiveHealth = buildReproductiveHealth(values);
  if (reproductiveHealth) details.reproductiveHealth = reproductiveHealth;

  const oldcart = buildOldcart(getSymptomSource(values));
  if (oldcart) {
    details.oldcart = oldcart;
  }

  // Only the answers the patient actually gave. An unanswered question must be
  // absent rather than `false`, because the backend's red-flag router cannot
  // distinguish the two and a defaulted negative would read as "screened".
  const safetyScreen = buildSafetyScreen(values);
  if (safetyScreen) {
    details.safetyScreen = safetyScreen;
  }

  const vitals = buildVitals(values);
  if (vitals) {
    details.vitals = vitals;
  }

  const demographics = buildDemographics(values);
  if (demographics) {
    details.demographics = demographics;
  }

  const review: IntakeReviewSection = {
    confirmed: values.additionalInfo.consent === true,
  };

  return { purpose, details, review };
}

// ─── Inverse mapping (contract sections -> form values) ───────────────────────

/**
 * Canonical `oldcart` key -> form symptom field.
 *
 * Exact inverse of the mapping table in {@link buildOldcart}. The two models use
 * different names for the same concepts (`characteristics`/`characteristics`,
 * `treatments_tried`/`priorTreatment`, …), which is why the table exists in both
 * directions and why both directions must be edited together.
 */
const OLDCART_TO_FORM_FIELD: Readonly<Record<string, keyof SymptomSource>> = {
  onset: "onset",
  location: "location",
  duration: "duration",
  characteristics: "characteristics",
  radiation: "radiation",
  timing: "timing",
  aggravating_factors: "aggravatingFactors",
  alleviating_factors: "alleviatingFactors",
  treatments_tried: "priorTreatment",
};

/** Rebuild the form's symptom fields from the contract `oldcart` map. */
function readOldcart(details: IntakeDetailsSection | undefined): SymptomSource {
  const symptoms: SymptomSource = {};
  for (const [contractKey, formKey] of Object.entries(OLDCART_TO_FORM_FIELD)) {
    const text = details?.oldcart?.[contractKey]?.text?.trim();
    if (text) {
      symptoms[formKey] = text;
    }
  }
  return symptoms;
}

/**
 * Split the comma-joined `details.allergies` string back into the form list.
 *
 * The forward mapper flattens presets and the free-text "other" allergens into
 * one string, so the split cannot tell them apart again — everything comes back
 * as `allergens` and `otherAllergens` is left empty. `"None"` round-trips as the
 * explicit {@link NONE_OPTION} assertion rather than as a blank field.
 */
function parseAllergies(allergies: string | undefined): string[] | undefined {
  const raw = (allergies ?? "").trim();
  if (!raw) return undefined;
  if (raw.toLowerCase() === NONE_OPTION.toLowerCase()) return [NONE_OPTION];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Rebuild form values from a submitted/draft {@link IntakeForm}.
 *
 * This is the inverse of {@link mapIntakeFormToSections}, as faithful as the
 * narrower contract model allows. What it does NOT do is un-parse
 * `details.medicalHistory`: the forward mapper folds several form fields
 * (name, date of birth, height, weight, diet, and every certificate-service
 * field) into that readable text block, and re-deriving individual fields from
 * prose would invent data. Those fields are therefore left as supplied by
 * `base`, or empty.
 *
 * @param form             - The intake form as held by the server.
 * @param serviceRequested - Which service this booking is for. The contract
 *   sections carry no service discriminator, so the caller must supply it to
 *   build the correct `requestDetails` variant.
 * @param base             - Locally known values (draft store / cached booking
 *   intake) used for everything the contract cannot carry. Server values always
 *   win where the server has them.
 */
export function mapSectionsToIntakeForm(
  form: IntakeForm,
  serviceRequested: DynamicIntakeFormValues["requestDetails"]["type"],
  base: Partial<DynamicIntakeFormValues> = {},
): DynamicIntakeFormValues {
  const values = mergeWithStoredData(base, serviceRequested);
  const { purpose, details, review } = form.sections ?? {};

  const allergens = parseAllergies(details?.allergies);
  if (allergens) {
    values.personalDetails = {
      ...values.personalDetails,
      allergens,
      // Already folded into `allergens` above; keeping the local value would
      // duplicate it on the next submit.
      otherAllergens: "",
    };
  }

  if (details?.medications !== undefined || details?.medicalHistory !== undefined) {
    values.personalDetails = {
      ...values.personalDetails,
      ...(details.medications !== undefined
        ? { legacyMedications: details.medications }
        : {}),
      ...(details.medicalHistory !== undefined
        ? { legacyMedicalHistory: details.medicalHistory }
        : {}),
    };
  }

  const baseline = details?.baselineMeasurements;
  const structuredMedicalHistory = details?.structuredMedicalHistory;
  if (baseline || structuredMedicalHistory) {
    values.personalDetails = {
      ...values.personalDetails,
      ...(baseline
        ? {
            height: String(baseline.heightCm),
            weight: String(baseline.weightKg),
            baselineVitals: baseline.vitals ?? {},
            ...(typeof baseline.selfReported === "boolean"
              ? { measurementsSelfReported: baseline.selfReported }
              : {}),
          }
        : {}),
      ...(structuredMedicalHistory ? { structuredMedicalHistory } : {}),
    };
  }

  // Structured demographics round-trip cleanly (unlike the folded history text),
  // so the server's copy wins where it has one.
  const demographics = details?.demographics;
  if (demographics?.dateOfBirth || demographics?.sex) {
    values.personalDetails = {
      ...values.personalDetails,
      ...(demographics.dateOfBirth
        ? { dateOfBirth: demographics.dateOfBirth }
        : {}),
      ...(fromContractSex(demographics.sex)
        ? { genderAtBirth: fromContractSex(demographics.sex)! }
        : {}),
    };
  }

  const symptoms = readOldcart(details);
  const chiefComplaint = purpose?.chiefComplaint?.trim();
  // Spread only when the server actually holds a value, so a stored answer is
  // never overwritten with `undefined` on rehydration.
  const safetyScreen = details?.safetyScreen;
  const vitals = details?.vitals;
  const complaintTags = purpose?.complaintTags;
  const symptomReview = details?.symptomReview;
  const reproductiveHealth = details?.reproductiveHealth;
  const requestDetails = values.requestDetails;

  if (requestDetails.type === "teleconsult") {
    values.requestDetails = {
      ...requestDetails,
      ...symptoms,
      ...(chiefComplaint ? { chiefComplaint } : {}),
      ...(complaintTags ? { complaintTags } : {}),
      ...(symptomReview ? { symptomReview } : {}),
      ...(reproductiveHealth ? { reproductiveHealth } : {}),
      ...(safetyScreen ? { safetyScreen } : {}),
      ...(vitals ? { vitals } : {}),
    };
  } else if (requestDetails.type === "sick-leave") {
    values.requestDetails = {
      ...requestDetails,
      symptomDetails: {
        ...requestDetails.symptomDetails,
        ...symptoms,
        ...(chiefComplaint ? { chiefComplaint } : {}),
        ...(complaintTags ? { complaintTags } : {}),
        ...(symptomReview ? { symptomReview } : {}),
        ...(reproductiveHealth ? { reproductiveHealth } : {}),
        ...(safetyScreen ? { safetyScreen } : {}),
        ...(vitals ? { vitals } : {}),
      },
    };
  }
  // Certificate services: their chief complaint is synthesized text
  // ("Certificate request: Fit for Work") and their fields live only in the
  // folded medical history, so nothing is recovered for them.

  const patientVerbatim = purpose?.patientVerbatim?.trim();
  values.additionalInfo = {
    ...values.additionalInfo,
    ...(patientVerbatim ? { additionalConcerns: patientVerbatim } : {}),
    consent:
      review?.confirmed === undefined
        ? values.additionalInfo.consent
        : review.confirmed,
  };

  return values;
}
