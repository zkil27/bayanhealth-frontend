"use client";

import type {
  CdsClinicalReferralPayload,
  CdsDiagnosticRequestPayload,
  CdsMedicalCertificatePayload,
  CdsPatientEducationPayload,
  CdsPrescriptionPayload,
  CdsProtectedArtifact,
} from "@/types/cds-contract";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import { PrescriptionSheet } from "./PrescriptionSheet";
import { MedicalCertificateSheet } from "./MedicalCertificateSheet";
import { DiagnosticRequestSheet } from "./DiagnosticRequestSheet";
import { ClinicalReferralSheet } from "./ClinicalReferralSheet";
import { PatientCareGuideSheet } from "./PatientCareGuideSheet";
import type {
  ClinicalDocumentArtifact,
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { ageFromDateOfBirth, SEX_LABELS } from "@/features/doctor/lib/api/bookingIntake";
import { documentVerification } from "./verification";

interface ClinicalDocumentSheetProps {
  artifact: ClinicalDocumentArtifact;
  intake?: BookingIntakeForm | null;
  /** The patient's own name, for the patient's view, where no doctor-side intake read exists. */
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  doctorPtrNumber?: string;
  className?: string;
}

export function ClinicalDocumentSheet({
  artifact,
  intake,
  patientName,
  doctorName,
  doctorSpecialty,
  doctorLicenseNumber,
  doctorPtrNumber,
  className,
}: ClinicalDocumentSheetProps) {
  const isDraft = artifact.lifecycleStatus === "generated";

  // Build clean patient info from intake — never invent an identity, a DOB, an
  // age/sex, or an allergy status for a field the intake did not actually
  // record. Each Sheet component renders these as "not on file" rather than a
  // plausible-looking specific value when absent.
  const dob = intake?.sections?.details?.demographics?.dateOfBirth;
  const rawSex = intake?.sections?.details?.demographics?.sex;
  const allergiesStr = intake?.sections?.details?.allergies;

  const patientInfo: DocumentPatientInfo = {
    name: patientName ?? intake?.patientName ?? "",
    dateOfBirth: dob
      ? new Date(dob).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined,
    age: dob ? ageFromDateOfBirth(dob) : undefined,
    sex: rawSex ? (SEX_LABELS[rawSex as keyof typeof SEX_LABELS] || rawSex) : undefined,
    allergies: allergiesStr && allergiesStr.trim().length > 0 ? allergiesStr : undefined,
    caseId: artifact.consultationId || intake?.bookingId || undefined,
    // The document's own issue time — release, else signature, else
    // finalization. A draft has none, and the sheet says so rather than
    // printing today's date on it.
    ...issuedAtFields(artifact.releasedAt ?? artifact.signature?.signedAt ?? artifact.finalizedAt),
  };

  // Build physician info from the caller's KYC-reviewed identity. Undefined
  // fields stay undefined rather than a fabricated specialty or a
  // "SAMPLE-0000000" license number that reads as a real one. The signature is
  // the one captured when this document was signed, never the doctor's profile
  // specimen: an unsigned draft must not look signed.
  const signedAt = artifact.signature?.signedAt ?? artifact.finalizedAt;
  const physicianInfo: DocumentPhysicianInfo = {
    name: doctorName ?? "",
    title: doctorSpecialty,
    licenseNumber: doctorLicenseNumber,
    ptrNumber: doctorPtrNumber,
    signatureStrokes: artifact.signature?.strokes,
    signedAt: signedAt ? new Date(signedAt).toLocaleString() : undefined,
  };

  const verificationInfo = documentVerification({
    documentId: patientInfo.caseId
      ? `${artifact.outputType.substring(0, 3).toUpperCase()}-${patientInfo.caseId}`
      : "",
    verificationCode: artifact.verificationCode,
    verificationValidUntil: artifact.verificationValidUntil,
  });

  switch (artifact.outputType) {
    case "prescription":
      return (
        <PrescriptionSheet
          payload={artifact.payload as CdsPrescriptionPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "medical_certificate":
      return (
        <MedicalCertificateSheet
          payload={artifact.payload as CdsMedicalCertificatePayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "diagnostic_request":
      return (
        <DiagnosticRequestSheet
          payload={artifact.payload as CdsDiagnosticRequestPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "clinical_referral":
      return (
        <ClinicalReferralSheet
          payload={artifact.payload as CdsClinicalReferralPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "patient_education":
      return (
        <PatientCareGuideSheet
          payload={artifact.payload as CdsPatientEducationPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    // Plan and Final ICD stay internal (ADR-20260924-02) — neither is one of
    // the five patient-facing documents this sheet renders.
    default:
      return null;
  }
}

function issuedAtFields(
  issuedAt: string | undefined,
): Pick<DocumentPatientInfo, "consultationDate" | "consultationTime"> {
  if (!issuedAt) return {};
  const at = new Date(issuedAt);
  return {
    consultationDate: at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    consultationTime: at.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}
