"use client";

import {
  AlertTriangle,
  Building2,
  Clock,
  FileText,
  Info,
  User,
} from "lucide-react";
import type { CdsPlanPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { cn } from "@/lib/utils";

interface ClinicalReferralSheetProps {
  planPayload?: CdsPlanPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  referredSpecialty?: string;
  urgency?: string;
  reasonForReferral?: string;
  clinicalDiagnosis?: string;
  className?: string;
}

export function ClinicalReferralSheet({
  planPayload,
  patient,
  physician,
  verification,
  isDraft = false,
  referredSpecialty = "Internal Medicine / Gastroenterology Clinic",
  urgency = "Within 24 hours if symptoms worsen; otherwise routine follow-up.",
  reasonForReferral = "Specialist face-to-face clinical assessment, diagnostic evaluation, and consideration of further work-up.",
  clinicalDiagnosis = "Probable GERD / Upper respiratory involvement",
  className,
}: ClinicalReferralSheetProps) {
  const patientName = patient?.name || "Maria Teresa D. Reyes";
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Female"]
      .filter(Boolean)
      .join(" / ");
  const dateOfReferral =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "BH-25-05-20-10245";
  const docId = verification?.documentId || `REF-${caseId}`;

  return (
    <article
      data-slot="clinical-referral-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-8 sm:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="CLINICAL REFERRAL"
        subtitle="For receiving clinic or hospital"
        isDraft={isDraft}
      />

      {/* Patient Demographic Bar */}
      <section className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 text-xs text-slate-700 divide-x divide-slate-300">
          <div className="pr-3">
            <span className="text-slate-500 block text-[11px]">Patient:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Date of Referral:</span>
            <span className="font-medium text-slate-900">{dateOfReferral}</span>
          </div>
          <div className="pl-3">
            <span className="text-slate-500 block text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-3 mb-4" />
      </section>

      {/* Structured Referral Rows */}
      <section className="mb-4 flex flex-col gap-3 text-xs">
        {/* Referred To */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white">
            <Building2 className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              REFERRED TO:
            </span>
            <span className="font-semibold text-slate-900">{referredSpecialty}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Urgency */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white">
            <Clock className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              URGENCY:
            </span>
            <span className="text-slate-800">{urgency}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Reason for Referral */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white">
            <FileText className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              REASON FOR REFERRAL:
            </span>
            <span className="text-slate-800 leading-relaxed font-medium">
              {planPayload?.summary || reasonForReferral}
            </span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Clinical Summary */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white">
            <User className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              CLINICAL SUMMARY:
            </span>
            <div className="flex flex-col gap-1 text-slate-800">
              <p>
                <span className="font-semibold">Presenting complaint:</span> persistent cough, reflux symptoms, malaise.
              </p>
              <p>
                <span className="font-semibold">Relevant history:</span> no known chronic illness; {patient?.allergies || "no known drug allergies"}.
              </p>
              <p>
                <span className="font-semibold">Current management:</span> conservative symptomatic care, initial teleconsultation workup.
              </p>
              <p>
                <span className="font-semibold">Findings / Assessment:</span> {clinicalDiagnosis}.
              </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Recommendations / Red Flags */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white">
            <AlertTriangle className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              RECOMMENDATIONS / RED FLAGS TO MONITOR:
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>persistent vomiting or hemoptysis</li>
              <li>black stools (melena)</li>
              <li>severe progressive abdominal or chest pain</li>
              <li>unintended significant weight loss</li>
              <li>difficulty swallowing (dysphagia) or shortness of breath</li>
            </ul>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-2 mb-2" />
      </section>

      {/* Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/ref/${docId}`,
          documentId: docId,
          status: isDraft ? "SAMPLE" : "REFERRAL ACTIVE",
        }}
        physicianRoleLabel="REFERRING PHYSICIAN"
        verificationTitle="REFERRAL VERIFICATION"
        scanInstruction="Receiving clinic scans here"
      />

      {/* Receiving Clinic Note */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
        <Info className="size-4 text-[#005f73] shrink-0" />
        <span>
          <strong className="text-slate-800">Bring this document to the receiving clinic.</strong> Additional medical information may be requested by the receiving physician.
        </span>
      </div>
    </article>
  );
}
