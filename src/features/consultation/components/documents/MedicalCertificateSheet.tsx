"use client";

import { Bed, ClipboardList, Stethoscope, UserCheck } from "lucide-react";
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
    : dateOfConsultation;

  const conditionDisplay =
    diagnosisTitle || "Acute Upper Gastrointestinal Episode / GERD";

  return (
    <article
      data-slot="medical-certificate-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-800 print:shadow-none print:border-none print:p-0",
        className,
      )}
    >
      <DocumentSheetHeader
        title="MEDICAL CERTIFICATE"
        subtitle="This is to certify that the information below is based on a telemedicine consultation."
        isDraft={isDraft}
      />

      {/* Patient Information */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-2">
          PATIENT INFORMATION
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Name:</span>
            <p className="font-bold text-slate-900">{patientName}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Time of Consultation:</span>
            <p className="font-semibold text-slate-900">{timeOfConsultation}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Consultation Method:</span>
            <p className="font-semibold text-slate-900">Online consultation</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Age / Sex:</span>
            <p className="font-semibold text-slate-900">{patientAgeSex}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Date of Consultation:</span>
            <p className="font-semibold text-slate-900">{dateOfConsultation}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Case ID:</span>
            <p className="font-mono font-semibold text-[#074972]">{caseId}</p>
          </div>
        </div>
      </section>

      {/* Assessment / Diagnosis */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-2">
          ASSESSMENT / DIAGNOSIS
        </h2>
        <div className="flex items-start gap-4 rounded-xl border border-teal-600/30 bg-teal-50/20 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <Stethoscope className="size-6 text-teal-700" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">{conditionDisplay}</h3>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
              {payload.statement ||
                "Clinical impression based on telemedicine history provided and remote physical evaluation."}
            </p>
          </div>
        </div>
      </section>

      {/* Medical Recommendation */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-2">
          MEDICAL RECOMMENDATION
        </h2>
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-xs sm:text-sm">
          {/* Rest / Work Suspension */}
          <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#074972]/10 text-[#074972]">
              <Bed className="size-4" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1">
              <span className="font-bold text-slate-900">Rest / Work Suspension:</span>
              <span className="sm:col-span-2 text-slate-700 font-medium">
                {validFromFormatted} to {validThroughFormatted}
              </span>
            </div>
          </div>

          {/* Fit to Return */}
          <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
              <UserCheck className="size-4" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1">
              <span className="font-bold text-slate-900">Fit to Return:</span>
              <span className="sm:col-span-2 text-slate-700">
                Fit to resume duties on {validThroughFormatted}, provided symptoms have
                subsided and no red flag warning signs are present.
              </span>
            </div>
          </div>

          {/* Work / School Advice */}
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <ClipboardList className="size-4" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-1">
              <span className="font-bold text-slate-900">Work / School Advice:</span>
              <span className="sm:col-span-2 text-slate-700 leading-relaxed">
                {payload.restrictions ||
                  "May return to usual activities if able to work comfortably. Avoid known physical triggers, maintain adequate hydration, and seek immediate re-assessment if symptoms worsen."}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/mc/${docId}`,
          documentId: docId,
          status: isDraft ? "SAMPLE" : "VALID",
        }}
        physicianRoleLabel="PHYSICIAN INFORMATION"
        verificationTitle="VERIFICATION"
        legalDisclaimer="This certificate was issued following a telemedicine consultation. Findings are based on information reasonably obtainable remotely. Authenticity may be verified using the QR code."
      />
    </article>
  );
}
