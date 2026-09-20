import { z } from "zod";
import { userPersonalDetailsSchema } from "@/schemas/userSchema";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(blankToUndefined, z.coerce.number().pipe(schema).optional());

export const complaintTagSchema = z.enum([
  "fever",
  "cough",
  "colds",
  "sore_throat",
  "headache",
  "dizziness",
  "chest_discomfort",
  "breathing_concern",
  "abdominal_pain",
  "nausea_or_vomiting",
  "diarrhea",
  "urinary_concern",
  "skin_concern",
  "musculoskeletal_pain",
  "fatigue",
  "reproductive_health",
  "mental_health",
  "medication_request",
  "other",
]);

export const structuredMedicalHistorySchema = z
  .object({
    knownConditions: z
      .array(
        z.enum([
          "hypertension",
          "diabetes",
          "asthma",
          "heart_disease",
          "stroke",
          "kidney_disease",
          "liver_disease",
          "cancer",
          "thyroid_disorder",
          "seizure_disorder",
          "bleeding_disorder",
          "mental_health_condition",
          "other",
        ]),
      )
      .max(16)
      .refine(
        (conditions) => new Set(conditions).size === conditions.length,
        "Known conditions must be unique",
      )
      .default([]),
    noneReported: z.boolean().default(false),
    other: z.string().max(500).optional(),
    details: z.string().max(4000).optional(),
    currentMedications: z.string().max(4000).optional(),
  })
  .superRefine((history, context) => {
    if (history.noneReported && history.knownConditions.length > 0) {
      context.addIssue({
        code: "custom",
        message: "No conditions can be selected when none are reported",
        path: ["knownConditions"],
      });
    }
    if (history.noneReported && history.other) {
      context.addIssue({
        code: "custom",
        message: "Other condition must be blank when none are reported",
        path: ["other"],
      });
    }
    if (history.knownConditions.includes("other") !== Boolean(history.other?.trim())) {
      context.addIssue({
        code: "custom",
        message: "Specify the other condition only when Other is selected",
        path: ["other"],
      });
    }
  });

export const symptomReviewSchema = z.object({
  onset: z.string().max(1000).optional(),
  pattern: z.string().max(1000).optional(),
  location: z.string().max(1000).optional(),
  characteristics: z.string().max(2000).optional(),
  aggravatingFactors: z.string().max(2000).optional(),
  relievingFactors: z.string().max(2000).optional(),
  associatedSymptoms: z.string().max(2000).optional(),
  treatmentsTried: z.string().max(2000).optional(),
  painSeverity: optionalNumber(z.number().int().min(0).max(10)),
});

const optionalIsoCalendarDate = z.preprocess(
  blankToUndefined,
  z
    .string()
    .refine((value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, "Enter a valid calendar date")
    .optional(),
);

export const reproductiveHealthSchema = z.object({
  pregnancyPossibility: z.enum([
    "possible",
    "not_possible",
    "not_applicable",
    "unsure",
    "prefer_not_to_say",
  ]),
  lastMenstrualPeriod: optionalIsoCalendarDate,
  cyclePattern: z
    .enum([
      "regular",
      "irregular",
      "absent",
      "not_applicable",
      "unsure",
      "prefer_not_to_say",
    ])
    .optional(),
});

export const baselineVitalsSchema = z.object({
  systolicBp: optionalNumber(z.number().int().min(40).max(300)),
  diastolicBp: optionalNumber(z.number().int().min(20).max(200)),
  heartRateBpm: optionalNumber(z.number().int().min(20).max(300)),
  spo2Percent: optionalNumber(z.number().int().min(50).max(100)),
});

/**
 * Explicit red-flag screening answers.
 *
 * Asked directly rather than inferred from the free-text symptom fields. The
 * backend's deterministic red-flag router matches rules against named fields in
 * the normalized clinical input and treats an absent field as "no match", so a
 * question that is never asked is indistinguishable from a negative answer.
 * Text inference would not close that gap either — "tightness in my chest"
 * contains no occurrence of "chest pain".
 *
 * Optional on purpose: `undefined` travels through as "not answered", and both
 * the doctor's panel and the ingested clinical input show it as unscreened
 * rather than as "no".
 */
export const safetyScreenSchema = z.object({
  chestPain: z.boolean().optional(),
  dyspnea: z.boolean().optional(),
  feverDays: optionalNumber(z.number().int().min(0).max(60)),
});

/**
 * Structured vital signs, optionally measured at home before the consult.
 *
 * Every field is optional: a blank box travels through as `undefined` ("not
 * recorded") and the reviewing physician sees "Not recorded" rather than an
 * invented number. Bounds match `IntakeVitals` in contracts/openapi.yaml — a
 * value outside them is rejected here and dropped by the backend, never clamped.
 */
export const vitalsSchema = z.object({
  temperatureC: optionalNumber(z.number().min(30).max(45)),
  systolicBp: optionalNumber(z.number().int().min(40).max(300)),
  diastolicBp: optionalNumber(z.number().int().min(20).max(200)),
  heartRateBpm: optionalNumber(z.number().int().min(20).max(300)),
  spo2Percent: optionalNumber(z.number().int().min(50).max(100)),
});

export const consultationSchema = z.object({
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  complaintTags: z
    .array(complaintTagSchema)
    .max(12)
    .refine((tags) => new Set(tags).size === tags.length, "Complaint tags must be unique")
    .default([])
    .optional(),
  onset: z.string().optional(),
  location: z.string().optional(),
  duration: z.string().optional(),
  characteristics: z.string().optional(),
  aggravatingFactors: z.string().optional(),
  alleviatingFactors: z.string().optional(),
  radiation: z.string().default("None / Does not radiate").optional(),
  priorTreatment: z.string().optional(),
  timing: z.string().optional(),
  symptomReview: symptomReviewSchema.optional(),
  reproductiveHealth: reproductiveHealthSchema.optional(),
  safetyScreen: safetyScreenSchema.optional(),
  vitals: vitalsSchema.optional(),
});

/**
 * There is deliberately no `attachments` field.
 *
 * It held browser-only `File` objects that no submit path read —
 * `mapIntakeFormToSections` never projected them onto the contract sections, and
 * `contracts/openapi.yaml` has no intake-scoped attachment operation to send them
 * to (the only media routes are `/v1/consultations/{consultationId}/media/*`,
 * which need a consultation that does not exist at intake time). Keeping the
 * field would keep the door open for a UI that again claims a successful upload
 * (ADR-20260806-02).
 */
export const additionalInfoSchema = z.object({
  consent: z
    .boolean()
    .refine((val) => val === true, "You must consent to continue"),
  additionalConcerns: z.string().optional(),
  dateOfConsultation: z.string().min(1, "Consultation date is required"),
});

export const workflowUnionSchema = z.discriminatedUnion("type", [
  // Fit for Work
  z.object({
    type: z.literal("fit-for-work"),
    duration: z.string().optional(),
    companyName: z.string().min(1, "Company name is required"),
    position: z.string().min(1, "Position is required"),
    employerContact: z.string().min(1, "Employer contact info is required"),
    purpose: z.enum([
      "pre-employment",
      "annual-physical",
      "return-to-work",
      "ojt-requirement",
    ]),
  }),

  // Fit for Climb
  z.object({
    type: z.literal("fit-for-climb"),
    location: z.string().min(1, "Location is required"),
    date: z.string().min(1, "Date is required"),
    duration: z.string().optional(),
    mountainName: z
      .string()
      .min(1, "Target mountain or trail name is required"),
    peakElevation: z.string().optional(),
    hasAltitudeHistory: z.boolean(),
    cardiacHistoryNotes: z.string().optional(),
    emergencyContactName: z.string().min(1, "Emergency contact is required"),
    emergencyContactPhone: z
      .string()
      .min(1, "Emergency phone number is required"),
  }),

  // Fit for Travel
  z.object({
    type: z.literal("fit-for-travel"),
    duration: z.string().optional(),
    destinationCountry: z.string().min(1, "Destination country is required"),
    departureDate: z.string().min(1, "Departure date is required"),
    travelDurationDays: z.coerce
      .number("Must be a valid number")
      .min(1, "Duration must be at least 1 day"),
    modeOfTransport: z.enum(["flight", "sea-cruise", "land-bus", "other"]),
    requiresVaccineVerification: z.boolean(),
    medicationSupplyConfirmed: z.boolean(),
  }),

  // Fit for School
  z.object({
    type: z.literal("fit-for-school"),
    duration: z.string().optional(),
    schoolName: z.string().min(1, "School name is required"),
    studentIdNumber: z.string().optional(),
    academicLevel: z.enum([
      "preschool",
      "elementary",
      "high-school",
      "university",
      "post-grad",
    ]),
    purpose: z.enum(
      [
        "admission",
        "sports-varsity",
        "dormitory-clearance",
        "field-trip",
        "return-from-illness",
      ],
      "Purpose is Required",
    ),
  }),

  // Teleconsult
  consultationSchema.extend({
    type: z.literal("teleconsult"),
  }),

  // Sick Leave
  z.object({
    type: z.literal("sick-leave"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    companyOrSchoolName: z
      .string()
      .min(1, "Company or School name is required"),
    departmentOrGrade: z.string().optional(),
    unableToWork: z.boolean().refine((val) => val === true, {
      message:
        "You must confirm that your condition prevents you from working/studying",
    }),
    isFoodHandler: z.boolean(),
    symptomDetails: consultationSchema,
  }),
]);

export const personalDetailsSchema = userPersonalDetailsSchema.extend({
  baselineVitals: baselineVitalsSchema.optional(),
  measurementsSelfReported: z.boolean().optional(),
  structuredMedicalHistory: structuredMedicalHistorySchema.optional(),
  /** Opaque v1 fields retained only so a v2 full replacement cannot erase them. */
  legacyMedications: z.string().max(4000).optional(),
  legacyMedicalHistory: z.string().max(4000).optional(),
});

export const dynamicIntakeMasterSchema = z.object({
  personalDetails: personalDetailsSchema,
  requestDetails: workflowUnionSchema,
  additionalInfo: additionalInfoSchema,
});

export type DynamicIntakeFormValues = z.infer<typeof dynamicIntakeMasterSchema>;


export const getDefaultValues = (
  type: DynamicIntakeFormValues["requestDetails"]["type"],
): DynamicIntakeFormValues => {
  const basePersonal = {
    forWhom: "self" as const,
    relationship: "",
    name: "",
    preferredName: "",
    preferredPronoun: "",
    dateOfBirth: "",
    genderAtBirth: "prefer not to say" as const,
    weight: "",
    height: "",
    bloodType: "",
    allergens: [],
    otherAllergens: "",
    diet: [],
    baselineVitals: {},
    measurementsSelfReported: undefined,
    structuredMedicalHistory: {
      knownConditions: [],
      noneReported: false,
      other: "",
      details: "",
      currentMedications: "",
    },
  };

  const baseAdditional = {
    consent: false,
    additionalConcerns: "",
    dateOfConsultation: "",
  };

  switch (type) {
    case "fit-for-work":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          companyName: "",
          position: "",
          employerContact: "",
          purpose: "pre-employment",
        },
      };
    case "fit-for-climb":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          location: "",
          date: "",
          duration: "",
          mountainName: "",
          peakElevation: "",
          hasAltitudeHistory: false,
          cardiacHistoryNotes: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        },
      };
    case "fit-for-travel":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          duration: "",
          destinationCountry: "",
          departureDate: "",
          travelDurationDays: 1 as number,
          modeOfTransport: "flight",
          requiresVaccineVerification: false,
          medicationSupplyConfirmed: false,
        },
      };
    case "fit-for-school":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          duration: "",
          schoolName: "",
          studentIdNumber: "",
          academicLevel: "university",
          purpose: "admission",
        },
      };
    case "teleconsult":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          chiefComplaint: "",
          complaintTags: [],
          onset: "",
          location: "",
          duration: "",
          characteristics: "",
          aggravatingFactors: "",
          alleviatingFactors: "",
          radiation: "None / Does not radiate",
          priorTreatment: "",
          timing: "",
          symptomReview: {
            onset: "",
            pattern: "",
            location: "",
            characteristics: "",
            aggravatingFactors: "",
            relievingFactors: "",
            associatedSymptoms: "",
            treatmentsTried: "",
            painSeverity: undefined,
          },
          reproductiveHealth: undefined,
        },
      };
    case "sick-leave":
      return {
        personalDetails: basePersonal,
        additionalInfo: baseAdditional,
        requestDetails: {
          type,
          startDate: "",
          endDate: "",
          companyOrSchoolName: "",
          departmentOrGrade: "",
          unableToWork: false,
          isFoodHandler: false,
          symptomDetails: {
            chiefComplaint: "",
            onset: "",
            location: "",
            duration: "",
            characteristics: "",
            aggravatingFactors: "",
            alleviatingFactors: "",
            radiation: "None / Does not radiate",
            priorTreatment: "",
            timing: "",
          },
        },
      };
  }
};

export const mergeWithStoredData = (
  storedData: Partial<DynamicIntakeFormValues>,
  serviceType: DynamicIntakeFormValues["requestDetails"]["type"],
): DynamicIntakeFormValues => {
  const safeStoredData = storedData || {};
  const defaults = getDefaultValues(serviceType);

  if (!defaults) {
    console.error(`Failed to get defaults for service type: ${serviceType}`);
    // Return a safe fallback
    return getDefaultValues("teleconsult");
  }

  return {
    personalDetails: {
      ...defaults.personalDetails,
      ...safeStoredData.personalDetails,
    },
    requestDetails: {
      ...defaults.requestDetails,
      ...safeStoredData.requestDetails,
      type: serviceType,
    } as DynamicIntakeFormValues["requestDetails"],
    additionalInfo: {
      ...defaults.additionalInfo,
      ...safeStoredData.additionalInfo,
    },
  };
};
