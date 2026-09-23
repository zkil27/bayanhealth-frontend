import type { OnDemandRequest } from "./api/requestPool";
import type { patientBoardInfo } from "../types/bookingBoard.types";
import type { ReadyToStartItem } from "./readyToStart";
import type { DoctorKycBundle } from "./api/kyc";

/**
 * High-fidelity clinical mock datasets representing authentic Philippine
 * healthcare cases for visiting physician demonstrations.
 */

export interface DemoDoctorProfile {
  doctorId: string;
  fullName: string;
  specialty: string;
  subspecialty?: string;
  licenseNumber: string;
  ptrNumber: string;
  s2Number: string;
  onDemandAvailable: boolean;
}

export const DEMO_DOCTOR_PROFILE: DemoDoctorProfile = {
  doctorId: "demo-doc-01",
  fullName: "Dr. Angela Reyes, MD",
  specialty: "Internal Medicine & Adult Tele-Triage",
  subspecialty: "Cardiometabolic & Primary Care",
  licenseNumber: "PRC #0148922",
  ptrNumber: "PTR #8821940",
  s2Number: "S2 #9912048",
  onDemandAvailable: true,
};

export const DEMO_DOCTOR_KYC_BUNDLE: DoctorKycBundle = {
  profile: {
    doctorId: "demo-doc-01",
    fullName: "Dr. Angela Reyes, MD",
    licenseNumber: "PRC #0148922",
    specialty: "Internal Medicine & Adult Tele-Triage",
    subspecialty: "Cardiometabolic & Primary Care",
    phoneNumber: "+63 917 892 4012",
    bio: "Board-certified internist with 12+ years of experience in tertiary hospital and telemedicine practice across Metro Manila. Specializing in adult acute care, hypertension, and primary triage.",
    onDemandAvailable: true,
    verificationStatus: "approved",
    signature: {
      signerName: "Dr. Angela Reyes, MD",
      strokes: [
        [
          { x: 0.15, y: 0.5 },
          { x: 0.25, y: 0.25 },
          { x: 0.35, y: 0.6 },
          { x: 0.55, y: 0.3 },
          { x: 0.8, y: 0.5 },
        ],
        [
          { x: 0.2, y: 0.45 },
          { x: 0.85, y: 0.4 },
        ],
      ],
    },
  },
  documents: [
    {
      documentId: "demo-doc-prc",
      doctorId: "demo-doc-01",
      documentType: "professional_license",
      contentType: "image/png",
      status: "uploaded",
      uploadedAt: "2026-08-15T08:30:00.000Z",
      createdAt: "2026-08-15T08:30:00.000Z",
      updatedAt: "2026-08-15T08:30:00.000Z",
    },
    {
      documentId: "demo-doc-ptr",
      doctorId: "demo-doc-01",
      documentType: "supporting_document",
      contentType: "application/pdf",
      status: "uploaded",
      uploadedAt: "2026-08-15T08:35:00.000Z",
      createdAt: "2026-08-15T08:35:00.000Z",
      updatedAt: "2026-08-15T08:35:00.000Z",
    },
  ],
};

export const DEMO_SHIFT_METRICS = {
  completedToday: 4,
  liveQueue: 3,
  nextAppointment: "11:15 AM",
  pendingPayoutCents: 340000,
  pendingPayoutFormatted: "₱3,400.00",
};

export const DEMO_ACTIVE_ENCOUNTER: ReadyToStartItem = {
  bookingId: "demo-active-encounter",
  name: "Maria Santos",
  initials: "MS",
  serviceType: "follow_up",
  isInProgress: true,
  reasonExcerpt:
    "Follow-up for allergic rhinitis flare-up and persistent nasal congestion despite antihistamines.",
  intakeFormStatus: "submitted",
  bookingMode: "on_demand",
  acceptedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
};

export const DEMO_ON_DEMAND_REQUESTS: OnDemandRequest[] = [
  {
    bookingId: "demo-req-sofia",
    serviceType: "emergency",
    channel: "video",
    scheduledAt: new Date().toISOString(),
    requestedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    amountCents: 95000,
    currency: "PHP",
    intakeSubmitted: true,
    patientName: "Sofia Hernandez (7yo F)",
    reasonExcerpt:
      "Acute URI: Persistent high fever (38.8°C) for 2 days, barking nocturnal cough, reduced oral intake. Mother requesting urgent pediatric tele-evaluation.",
    allergies: "NKDA (No known drug allergies)",
    vitals: {
      temperatureC: 38.8,
      heartRateBpm: 118,
      spo2Percent: 98,
    },
    safetyScreen: {
      feverDays: 2,
    },
  },
  {
    bookingId: "demo-req-manuel",
    serviceType: "general",
    channel: "video",
    scheduledAt: new Date().toISOString(),
    requestedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    amountCents: 85000,
    currency: "PHP",
    intakeSubmitted: true,
    patientName: "Manuel Tan (34yo M)",
    reasonExcerpt:
      "Acute Gastroenteritis: Watery diarrhea x 5 episodes since 4:00 AM, mild crampy periumbilical pain, tolerating oral rehydration salts, no hematochezia.",
    allergies: "Penicillin (rash/urticaria)",
    vitals: {
      systolicBp: 110,
      diastolicBp: 75,
      heartRateBpm: 84,
      temperatureC: 37.3,
    },
    safetyScreen: {
      dyspnea: false,
      chestPain: false,
    },
  },
];

export const DEMO_SCHEDULED_INTAKES: patientBoardInfo[] = [
  {
    id: 101,
    bookingId: "demo-sch-ramon",
    name: "Ramon Dela Cruz (52yo M)",
    initials: "RC",
    avatar: "",
    isVerified: true,
    serviceRequested: "follow_up",
    timestamp: Date.now() + 25 * 60 * 1000,
    commsAppPreferred: ["system", "sms"],
    filesAttached: 2,
    type: "Scheduled Routine",
    reasonExcerpt:
      "T2DM & Stage 1 HTN routine 3-month review. Blood pressure this morning 142/88. Requesting maintenance prescription refill (Metformin + Losartan) and lab requests for FBS/HbA1c.",
    intakeFormStatus: "submitted",
    channel: "video",
    amountCents: 80000,
    currency: "PHP",
    bookingMode: "scheduled",
  },
];

export const DEMO_RECENT_CONSULTATIONS = [
  {
    consultationId: "demo-c-01",
    bookingId: "demo-b-01",
    patientName: "Elena Ramos (41yo F)",
    chiefComplaint: "Acute Pharyngitis, odynophagia x 3 days",
    diagnosis: "Acute Pharyngitis (ICD-10 J02.9)",
    endedAt: "42 mins ago",
    status: "Completed & Signed",
    prescriptionIssued: true,
  },
  {
    consultationId: "demo-c-02",
    bookingId: "demo-b-02",
    patientName: "Carlos Mendoza (64yo M)",
    chiefComplaint: "Dyslipidemia follow-up & Lipid panel review",
    diagnosis: "Pure Hypercholesterolemia (ICD-10 E78.0)",
    endedAt: "1 hr 15 mins ago",
    status: "Completed & Signed",
    prescriptionIssued: true,
  },
  {
    consultationId: "demo-c-03",
    bookingId: "demo-b-03",
    patientName: "Bea Alonzo (29yo F)",
    chiefComplaint: "Tension-type headache, screen fatigue",
    diagnosis: "Tension-type headache (ICD-10 G44.2)",
    endedAt: "2 hrs 30 mins ago",
    status: "Completed & Signed",
    prescriptionIssued: false,
  },
];
