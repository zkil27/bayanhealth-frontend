"use client";

import {
  AlertTriangle,
  Building2,
  Clock,
  FileText,
  User,
  Info,
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
  reasonForReferral,
  clinicalDiagnosis,
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

  const reasonText =
    reasonForReferral ||
    "Persistent symptoms requiring in-person physical assessment, specialized evaluation, and consideration of further diagnostic work-up.";

  return (
    <article
      data-slot="clinical-referral-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-800 print:shadow-none print:border-none print:p-0",
        className,
      )}
    >
      <DocumentSheetHeader
        title="CLINICAL REFERRAL"
        subtitle="For receiving clinic or hospital"
        isDraft={isDraft}
      />

      {/* Patient Bar */}
      <section className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Patient:</span>
            <p className="font-bold text-slate-900 truncate">{patientName}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Age / Sex:</span>
            <p className="font-semibold text-slate-900">{patientAgeSex}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Date of Referral:</span>
            <p className="font-semibold text-slate-900">{dateOfReferral}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Case ID:</span>
            <p className="font-mono font-semibold text-[#074972] truncate">{caseId}</p>
          </div>
        </div>
      </section>

      {/* Referral Fields */}
      <section className="mb-6 flex flex-col gap-3 text-xs sm:text-sm">
        {/* REFERRED TO */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
            <Building2 className="size-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold tracking-wider text-[#074972] uppercase block">
              REFERRED TO:
            </span>
            <p className="font-bold text-slate-900">{referredSpecialty}</p>
          </div>
        </div>

        {/* URGENCY */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Clock className="size-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold tracking-wider text-[#074972] uppercase block">
              URGENCY:
            </span>
            <p className="text-slate-800 font-medium">{urgency}</p>
          </div>
        </div>

        {/* REASON FOR REFERRAL */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#074972]/10 text-[#074972]">
            <FileText className="size-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold tracking-wider text-[#074972] uppercase block">
              REASON FOR REFERRAL:
            </span>
            <p className="text-slate-800 leading-relaxed">{reasonText}</p>
          </div>
        </div>

        {/* CLINICAL SUMMARY */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 bg-slate-50/40">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
            <User className="size-4" />
          </div>
          <div className="flex-1 space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-[#074972] uppercase block">
              CLINICAL SUMMARY:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500 font-medium">Presenting complaint:</span>
              <span className="font-medium text-slate-900">
                {planPayload?.summary || "Upper abdominal discomfort, reflux, burning sensation."}
              </span>

              <span className="text-slate-500 font-medium">Relevant history:</span>
              <span className="text-slate-800">
                Allergies: {patient?.allergies || "None declared"}.
              </span>

              <span className="text-slate-500 font-medium">Current management:</span>
              <span className="text-slate-800">
                {planPayload?.interventions?.join("; ") || "Medical therapy initiated."}
              </span>

              <span className="text-slate-500 font-medium">Findings / Assessment:</span>
              <span className="font-bold text-slate-900">
                {clinicalDiagnosis || "Probable GERD / Acid Reflux."}
              </span>
            </div>
          </div>
        </div>

        {/* RECOMMENDATIONS / RED FLAGS TO MONITOR */}
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50/30 p-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <AlertTriangle className="size-4" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold tracking-wider text-rose-800 uppercase block mb-1">
              RECOMMENDATIONS / RED FLAGS TO MONITOR:
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-900">
              <li>Persistent vomiting or inability to tolerate oral intake</li>
              <li>Black or tarry stools, or blood in vomitus</li>
              <li>Severe progressive abdominal pain</li>
              <li>Unintended weight loss or difficulty swallowing (dysphagia)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Notice Pill */}
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#074972]/5 px-3 py-2 text-xs text-slate-700">
        <Info className="size-4 text-[#074972] shrink-0" />
        <span>
          <strong>Patient Notice:</strong> Please bring this document to the receiving clinic or hospital upon arrival.
        </span>
      </div>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/ref/${docId}`,
          documentId: docId,
          status: isDraft ? "SAMPLE" : "REFERRAL ACTIVE",
        }}
        physicianRoleLabel="REFERRING PHYSICIAN"
        verificationTitle="REFERRAL VERIFICATION"
        legalDisclaimer="This clinical referral facilitates care coordination. Final diagnostic workup and acute management remain under the clinical discretion of the receiving medical team."
      />
    </article>
  );
}
