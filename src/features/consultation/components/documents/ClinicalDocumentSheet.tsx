"use client";

import type {
  CdsImagingRequestPayload,
  CdsLabRequestPayload,
  CdsMedicalCertificatePayload,
  CdsPatientEducationPayload,
  CdsPlanPayload,
  CdsPrescriptionPayload,
  CdsProtectedArtifact,
  CdsProtectedOutputType,
} from "@/types/cds-contract";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
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

interface ClinicalDocumentSheetProps {
  artifact: ClinicalDocumentArtifact;
  intake?: BookingIntakeForm | null;
  specimen?: DoctorSignatureSpecimen | undefined;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  doctorPtrNumber?: string;
  className?: string;
}

export function ClinicalDocumentSheet({
  artifact,
  intake,
  specimen,
  doctorName,
  doctorSpecialty,
  doctorLicenseNumber,
  doctorPtrNumber,
  className,
}: ClinicalDocumentSheetProps) {
  const isDraft = artifact.lifecycleStatus === "generated";

  // Build clean patient info from intake or authentic fallback
  const dob = intake?.sections?.details?.demographics?.dateOfBirth;
  const rawSex = intake?.sections?.details?.demographics?.sex;
  const allergiesStr = intake?.sections?.details?.allergies;

  const patientInfo: DocumentPatientInfo = {
    name: intake?.patientName || "—",
    dateOfBirth: dob
      ? new Date(dob).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    age: dob ? ageFromDateOfBirth(dob) : undefined,
    sex: rawSex
      ? (SEX_LABELS[rawSex as keyof typeof SEX_LABELS] || rawSex)
      : "—",
    allergies: allergiesStr && allergiesStr.trim().length > 0
      ? allergiesStr
      : "No known drug allergies",
    caseId: artifact.consultationId || intake?.bookingId || "—",
  };

  // Build physician info
  const physicianInfo: DocumentPhysicianInfo = {
    name: doctorName || specimen?.signerName || "Attending Physician",
    title: doctorSpecialty || "Licensed Physician",
    licenseNumber: doctorLicenseNumber || "—",
    ptrNumber: doctorPtrNumber || "—",
    signatureStrokes: specimen?.strokes,
    signedAt: artifact.physicianEditedAt
      ? new Date(artifact.physicianEditedAt).toLocaleString()
      : undefined,
  };

  const verificationInfo: DocumentVerificationInfo = {
    qrValue: `https://bayanhealth.ph/verify/${artifact.outputType}/${artifact.artifactId}`,
    documentId: `${artifact.outputType.substring(0, 3).toUpperCase()}-${patientInfo.caseId}`,
    status: isDraft ? "DRAFT" : "ACTIVE",
  };

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

    case "lab_request":
      return (
        <DiagnosticRequestSheet
          labPayload={artifact.payload as CdsLabRequestPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "imaging_request":
      return (
        <DiagnosticRequestSheet
          imagingPayload={artifact.payload as CdsImagingRequestPayload}
          patient={patientInfo}
          physician={physicianInfo}
          verification={verificationInfo}
          isDraft={isDraft}
          className={className}
        />
      );

    case "plan":
      return (
        <ClinicalReferralSheet
          planPayload={artifact.payload as CdsPlanPayload}
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

    default:
      return null;
  }
}
