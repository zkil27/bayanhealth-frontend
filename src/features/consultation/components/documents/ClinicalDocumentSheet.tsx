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
import type { DocumentPatientInfo, DocumentPhysicianInfo, DocumentVerificationInfo } from "./types";
import { ageFromDateOfBirth, SEX_LABELS } from "@/features/doctor/lib/api/bookingIntake";

interface ClinicalDocumentSheetProps {
  artifact: CdsProtectedArtifact;
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
  doctorName = "Dr. Andrea M. Santos, MD",
  doctorSpecialty = "General Practitioner",
  doctorLicenseNumber = "SAMPLE-0000000",
  doctorPtrNumber = "SAMPLE-0000000",
  className,
}: ClinicalDocumentSheetProps) {
  const isDraft = artifact.lifecycleStatus === "generated";

  // Build clean patient info from intake or fallbacks
  const dob = intake?.sections?.details?.demographics?.dateOfBirth;
  const rawSex = intake?.sections?.details?.demographics?.sex;
  const allergiesStr = intake?.sections?.details?.allergies;

  const patientInfo: DocumentPatientInfo = {
    name: intake?.patientName || "Maria Teresa D. Reyes",
    dateOfBirth: dob
      ? new Date(dob).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Jan 12, 1997",
    age: dob ? ageFromDateOfBirth(dob) : 28,
    sex: rawSex
      ? (SEX_LABELS[rawSex as keyof typeof SEX_LABELS] || rawSex)
      : "Female",
    allergies: allergiesStr && allergiesStr.trim().length > 0
      ? allergiesStr
      : "No known drug allergies",
    caseId: artifact.consultationId || intake?.bookingId || "BH-25-05-20-10245",
  };

  // Build physician info
  const physicianInfo: DocumentPhysicianInfo = {
    name: doctorName,
    title: doctorSpecialty,
    licenseNumber: doctorLicenseNumber,
    ptrNumber: doctorPtrNumber,
    signatureStrokes: specimen?.strokes,
    signedAt: artifact.physicianEditedAt
      ? new Date(artifact.physicianEditedAt).toLocaleString()
      : undefined,
  };

  const verificationInfo: DocumentVerificationInfo = {
    qrValue: `https://bayanhealth.ph/verify/${artifact.outputType}/${artifact.artifactId}`,
    documentId: `${artifact.outputType.substring(0, 3).toUpperCase()}-${patientInfo.caseId}`,
    status: isDraft ? "VALID" : "ACTIVE",
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
