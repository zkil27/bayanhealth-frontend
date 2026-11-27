import { emptyHistory } from "./model";
import type { HistoryVersion, PatientHistoryData } from "./types";

/**
 * Demo charts for the demo bookings, so the versioned chart can be reviewed
 * end to end before the backend exists.
 *
 * - Ramon Dela Cruz (`demo-sch-ramon`): returning patient with two versions.
 *   v2 adds an amlodipine allergy and changes metformin, so the
 *   "changes since v1" view has something to show.
 * - Maria Santos (`demo`, `preview`, `demo-active-encounter`): returning, one
 *   version, female, so the gynecologic section is populated.
 * - Manuel Tan (`demo-req-manuel`) and any other demo id: first consult, no chart.
 */

const DEMO_PATIENT_BY_BOOKING: Record<string, string> = {
  "demo-sch-ramon": "ramon",
  demo: "maria",
  preview: "maria",
  "demo-active-encounter": "maria",
  "demo-req-manuel": "manuel",
};

export function isDemoHistoryBooking(bookingId: string): boolean {
  return bookingId === "demo" || bookingId === "preview" || bookingId.startsWith("demo");
}

/** The demo patient a demo booking belongs to; unknown demo ids are their own patient. */
export function demoPatientKey(bookingId: string): string {
  return DEMO_PATIENT_BY_BOOKING[bookingId] ?? bookingId;
}

function build(patch: (data: PatientHistoryData) => void): PatientHistoryData {
  const data = emptyHistory();
  patch(data);
  return data;
}

const RAMON_V1 = build((d) => {
  d.allergies.noneKnown = true;
  d.allergies.latex = "no";
  d.demographics.dateOfBirth = "1968-11-04";
  d.demographics.sex = "male";
  d.demographics.occupation = "Jeepney operator";
  d.demographics.maritalStatus = "Married";
  d.demographics.nationality = "Filipino";
  d.medical.conditions = ["diabetes", "hypertension"];
  d.medical.maintenanceMeds = "Metformin 500 mg BID; Amlodipine 5 mg OD";
  d.surgical.entries = [
    { id: "s1", procedure: "Appendectomy", year: "1994", complication: "" },
  ];
  d.family.conditions = { diabetes: ["mother"], hypertension: ["father", "sibling"], stroke: ["father"] };
  d.social.tobacco = "former";
  d.social.packsPerDay = "1";
  d.social.tobaccoYears = "15";
  d.social.alcohol = "occasional";
  d.social.livesAlone = "no";
});

const RAMON_V2 = build((d) => {
  Object.assign(d, JSON.parse(JSON.stringify(RAMON_V1)) as PatientHistoryData);
  d.allergies.noneKnown = false;
  d.allergies.drug = "Amlodipine (peripheral edema)";
  d.medical.maintenanceMeds = "Metformin 850 mg BID; Losartan 50 mg OD";
  d.medical.conditions = ["diabetes", "hypertension", "high_cholesterol"];
});

const MARIA_V1 = build((d) => {
  d.allergies.noneKnown = true;
  d.allergies.latex = "no";
  d.demographics.dateOfBirth = "1992-05-14";
  d.demographics.sex = "female";
  d.demographics.occupation = "Call-centre agent (night shift)";
  d.demographics.maritalStatus = "Married";
  d.demographics.nationality = "Filipino";
  d.medical.conditions = ["seasonal_allergies", "asthma"];
  d.medical.maintenanceMeds = "Salbutamol inhaler as needed";
  d.surgical.noneReported = true;
  d.family.conditions = { asthma: ["mother"], diabetes: ["grandparent"] };
  d.obgyn.gravida = "2";
  d.obgyn.term = "2";
  d.obgyn.preterm = "0";
  d.obgyn.abortion = "0";
  d.obgyn.living = "2";
  d.obgyn.lastMenstrualPeriod = "2026-06-02";
  d.obgyn.intervalDays = "28";
  d.obgyn.durationDays = "5";
  d.obgyn.contraception = "Combined oral pill";
  d.social.tobacco = "never";
  d.social.alcohol = "occasional";
  d.social.sexuallyActive = "yes";
  d.social.partners = "1";
  d.social.livesAlone = "no";
});

const DOCTOR = "Dr. Andrea Reyes";

export const DEMO_SEED_VERSIONS: Record<string, HistoryVersion[]> = {
  ramon: [
    {
      version: 1,
      savedAt: "2026-03-12T02:30:00.000Z",
      savedBy: DOCTOR,
      bookingId: "demo-ramon-2026-03",
      data: RAMON_V1,
      sections: {
        allergies: "updated",
        demographics: "updated",
        medical: "updated",
        surgical: "updated",
        family: "updated",
        obgyn: "not_recorded",
        social: "updated",
      },
    },
    {
      version: 2,
      savedAt: "2026-08-14T03:10:00.000Z",
      savedBy: DOCTOR,
      bookingId: "demo-ramon-2026-08",
      data: RAMON_V2,
      sections: {
        allergies: "updated",
        demographics: "reviewed",
        medical: "updated",
        surgical: "reviewed",
        family: "carried",
        obgyn: "not_recorded",
        social: "reviewed",
      },
    },
  ],
  maria: [
    {
      version: 1,
      savedAt: "2026-06-20T06:45:00.000Z",
      savedBy: DOCTOR,
      bookingId: "demo-maria-2026-06",
      data: MARIA_V1,
      sections: {
        allergies: "updated",
        demographics: "updated",
        medical: "updated",
        surgical: "updated",
        family: "updated",
        obgyn: "updated",
        social: "updated",
      },
    },
  ],
};
