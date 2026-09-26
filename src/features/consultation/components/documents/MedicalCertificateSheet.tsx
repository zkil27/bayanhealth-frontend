"use client";

import { Bed, ClipboardList, PersonStanding, Stethoscope } from "lucide-react";
import type { CdsMedicalCertificatePayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { cn } from "@/lib/utils";

interface MedicalCertificateSheetProps {
  payload: CdsMedicalCertificatePayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  diagnosisTitle?: string;
  className?: string;
}

export function MedicalCertificateSheet({
  payload,
  patient,
  physician,
  verification,
  isDraft = false,
  diagnosisTitle,
  className,
}: MedicalCertificateSheetProps) {
  const patientName = patient?.name || "Maria Teresa D. Reyes";
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Female"]
      .filter(Boolean)
      .join(" / ");
  const dateOfConsultation =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const timeOfConsultation =
    patient?.consultationTime ||
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const caseId = patient?.caseId || "BH-25-05-20-10245";
  const docId = verification?.documentId || `MC-${caseId}`;

  const validFromFormatted = payload.validFrom
    ? new Date(payload.validFrom).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : dateOfConsultation;

  const validThroughFormatted = payload.validThrough
    ? new Date(payload.validThrough).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "May 22, 2025";

  const fitToReturnDate = payload.validThrough
    ? new Date(new Date(payload.validThrough).getTime() + 86400000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "May 23, 2025";

  const diagnosis = diagnosisTitle || payload.statement || "Acute Upper Respiratory Tract Infection (URTI)";

  return (
    <article
      data-slot="medical-certificate-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-8 sm:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="MEDICAL CERTIFICATE"
        subtitle="This is to certify that the information below is based on a telemedicine consultation."
        isDraft={isDraft}
      />

      {/* Patient Information Section */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-2">
          PATIENT INFORMATION
        </h2>
        <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-xs text-slate-800">
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Name:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Time of Consultation:</span>
            <span className="font-medium text-slate-900">{timeOfConsultation}</span>
          </div>

          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Consultation Method:</span>
            <span className="font-medium text-slate-900">Online consultation</span>
          </div>

          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Date of Consultation:</span>
            <span className="font-medium text-slate-900">{dateOfConsultation}</span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline">
            <span className="text-slate-600 font-medium">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{caseId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-3 mb-4" />
      </section>

      {/* Assessment / Diagnosis Section */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-3">
          ASSESSMENT / DIAGNOSIS
        </h2>
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#18a58c] bg-teal-50/20 text-[#18a58c]">
            <Stethoscope className="size-7" />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <h3 className="font-bold text-sm text-[#074972]">
              {diagnosis}
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Clinical impression based on history provided, subjective symptoms reported, and remote clinical assessment.
            </p>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-4 mb-4" />
      </section>

      {/* Medical Recommendation Section */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-3">
          MEDICAL RECOMMENDATION
        </h2>

        <div className="flex flex-col gap-3 text-xs">
          {/* Rest / Suspension */}
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#18a58c] text-[#18a58c] bg-teal-50/20">
              <Bed className="size-4" />
            </div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-2 pt-1.5">
              <span className="font-semibold text-slate-900">Rest / Work Suspension</span>
              <span className="text-slate-800 font-medium">
                {validFromFormatted} to {validThroughFormatted}
              </span>
            </div>
          </div>

          {/* Fit to Return */}
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#18a58c] text-[#18a58c] bg-teal-50/20">
              <PersonStanding className="size-4" />
            </div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-2 pt-1.5">
              <span className="font-semibold text-slate-900">Fit to Return</span>
              <span className="text-slate-800">
                {fitToReturnDate}, if symptoms improve and no red flags are present.
              </span>
            </div>
          </div>

          {/* Work / School Advice */}
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#18a58c] text-[#18a58c] bg-teal-50/20">
              <ClipboardList className="size-4" />
            </div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-2 pt-1.5">
              <span className="font-semibold text-slate-900">Work / School Advice</span>
              <span className="text-slate-800 leading-relaxed">
                {payload.restrictions ||
                  "May return to usual duties if able to work comfortably. Avoid strenuous physical exertion and seek reassessment if symptoms worsen or red flags occur."}
              </span>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-4 mb-2" />
      </section>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/medcert/${docId}`,
          documentId: docId,
          status: isDraft ? "SAMPLE" : "VALID",
        }}
        physicianRoleLabel="PHYSICIAN INFORMATION"
        verificationTitle="VERIFICATION"
        scanInstruction="Scan to verify"
        legalDisclaimer="This certificate was issued following a telemedicine consultation. Findings are based on information reasonably obtainable remotely. Authenticity may be verified using the QR code."
      />
    </article>
  );
}
