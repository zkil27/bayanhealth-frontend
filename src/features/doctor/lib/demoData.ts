import type { DoctorKycBundle } from "./api/kyc";

/**
 * High-fidelity clinical mock datasets representing authentic Philippine
 * healthcare cases for visiting physician demonstrations.
 */

export const DEMO_DOCTOR_KYC_BUNDLE: DoctorKycBundle = {
  profile: {
    doctorId: "demo-doc-01",
    email: "angela.reyes@bayanhealth.com",
    fullName: "Dr. Angela Reyes, MD",
    licenseNumber: "PRC #0148922",
    specialty: "Internal Medicine & Adult Tele-Triage",
    phoneNumber: "+63 917 892 4012",
    bio: "Board-certified internist with 12+ years of experience in tertiary hospital and telemedicine practice across Metro Manila. Specializing in adult acute care, hypertension, and primary triage.",
    onDemandAvailable: true,
    verificationStatus: "approved",
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-08-15T08:30:00.000Z",
    signature: {
      signerName: "Dr. Angela Reyes, MD",
      updatedAt: "2026-08-15T08:30:00.000Z",
      drawingSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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

export function getDemoCalendarData(baseDateStr?: string): {
  slots: import("./api/schedule").Slot[];
  bookings: import("./api/agenda").DoctorBooking[];
} {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;

  const slots: import("./api/schedule").Slot[] = [];
  const bookings: import("./api/agenda").DoctorBooking[] = [];

  // Generate 7 days around safeBase so the calendar is never empty
  const stamp = "2026-09-20T08:00:00.000Z";
  for (let offset = -3; offset <= 3; offset++) {
    const currentDay = new Date(safeBase.getTime() + offset * 86400000);
    const dateStr = currentDay.toISOString().slice(0, 10);

    slots.push(
      {
        slotId: `demo-slot-${dateStr}-0900`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "09:00",
        durationMinutes: 30,
        status: "available",
        notes: "Morning consultation hours",
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-0930`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "09:30",
        durationMinutes: 30,
        status: "available",
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-1000`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "10:00",
        durationMinutes: 30,
        status: offset === 0 ? "booked" : "available",
        bookingId: offset === 0 ? "demo-sch-ramon" : undefined,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-1030`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "10:30",
        durationMinutes: 30,
        status: "available",
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-1400`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "14:00",
        durationMinutes: 30,
        status: "available",
        notes: "Afternoon follow-up clinic",
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-1430`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "14:30",
        durationMinutes: 30,
        status: offset === 0 ? "booked" : "available",
        bookingId: offset === 0 ? "demo-req-manuel" : undefined,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        slotId: `demo-slot-${dateStr}-1500`,
        doctorId: "demo-doc-01",
        date: dateStr,
        startTime: "15:00",
        durationMinutes: 30,
        status: "available",
        createdAt: stamp,
        updatedAt: stamp,
      },
    );
  }

  const todayStr = safeBase.toISOString().slice(0, 10);
  bookings.push(
    {
      bookingId: "demo-sch-ramon",
      patientId: "patient-ramon-01",
      doctorId: "demo-doc-01",
      status: "confirmed",
      bookingMode: "scheduled",
      serviceType: "follow_up",
      scheduledAt: `${todayStr}T10:00:00.000Z`,
      channel: "video",
      notes: "T2DM & Stage 1 HTN routine 3-month review. Blood pressure 142/88. Maintenance refill requested.",
      amountCents: 80000,
      currency: "PHP",
    },
    {
      bookingId: "demo-active-encounter",
      patientId: "patient-maria-01",
      doctorId: "demo-doc-01",
      consultationId: "demo",
      status: "in_progress",
      bookingMode: "on_demand",
      serviceType: "follow_up",
      scheduledAt: `${todayStr}T11:15:00.000Z`,
      channel: "video",
      notes: "Allergic Rhinitis flare-up, nasal congestion.",
      amountCents: 85000,
      currency: "PHP",
    },
    {
      bookingId: "demo-req-manuel",
      patientId: "patient-manuel-01",
      doctorId: "demo-doc-01",
      status: "confirmed",
      bookingMode: "scheduled",
      serviceType: "general",
      scheduledAt: `${todayStr}T14:30:00.000Z`,
      channel: "video",
      notes: "Acute Gastroenteritis x 5 diarrhea episodes, tolerating oral fluids.",
      amountCents: 85000,
      currency: "PHP",
    },
  );

  return { slots, bookings };
}
