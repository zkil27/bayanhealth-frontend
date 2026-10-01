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
  referredSpecialty = "Specialist Clinic",
  urgency = "Routine follow-up or as clinically indicated",
  reasonForReferral = "Clinical evaluation, specialist assessment, and consideration of further management as appropriate.",
  clinicalDiagnosis = "Clinical referral as indicated.",
  className,
}: ClinicalReferralSheetProps) {
  const patientName = patient?.name || "—";
  const patientAgeSex =
    [patient?.age ? `${patient.age} y/o` : null, patient?.sex || null]
      .filter(Boolean)
      .join(" / ") || "—";
  const dateOfReferral =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "—";
  const docId = verification?.documentId || (patient?.caseId ? `REF-${patient.caseId}` : "—");

  return (
    <article
      data-slot="clinical-referral-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-4 sm:p-8 md:p-12 text-slate-800 select-text leading-normal",
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x sm:divide-slate-300 text-xs text-slate-700">
          <div className="col-span-2 sm:col-span-1 sm:pr-3">
            <span className="text-slate-500 block text-[11px]">Patient:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="sm:px-3">
            <span className="text-slate-500 block text-[11px]">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="sm:px-3">
            <span className="text-slate-500 block text-[11px]">Date of Referral:</span>
            <span className="font-medium text-slate-900">{dateOfReferral}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:pl-3">
            <span className="text-slate-500 block text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-3 mb-4" />
      </section>

      {/* Structured Referral Rows */}
      <section className="mb-4 flex flex-col gap-3 text-xs">
        {/* Referred To */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <Building2 className="size-4.5 sm:size-5" />
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-1 sm:gap-2 pt-1 sm:pt-2 min-w-0 flex-1">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              REFERRED TO:
            </span>
            <span className="font-semibold text-slate-900">{referredSpecialty}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Urgency */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <Clock className="size-4.5 sm:size-5" />
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-1 sm:gap-2 pt-1 sm:pt-2 min-w-0 flex-1">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              URGENCY:
            </span>
            <span className="text-slate-800">{urgency}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Reason for Referral */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <FileText className="size-4.5 sm:size-5" />
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-1 sm:gap-2 pt-1 sm:pt-2 min-w-0 flex-1">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              REASON FOR REFERRAL:
            </span>
            <span className="text-slate-800 leading-relaxed font-medium">
              {planPayload?.summary || reasonForReferral}
            </span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Clinical Summary */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <User className="size-4.5 sm:size-5" />
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-1 sm:gap-2 pt-1 sm:pt-2 min-w-0 flex-1">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              CLINICAL SUMMARY:
            </span>
            <div className="flex flex-col gap-1 text-slate-800">
              {planPayload?.summary ? (
                <p>
                  <span className="font-semibold">Plan summary:</span> {planPayload.summary}
                </p>
              ) : null}
              {planPayload?.interventions && planPayload.interventions.length > 0 ? (
                <p>
                  <span className="font-semibold">Interventions:</span> {planPayload.interventions.join("; ")}
                </p>
              ) : null}
              {planPayload?.followUp ? (
                <p>
                  <span className="font-semibold">Follow-up:</span> {planPayload.followUp}
                </p>
              ) : null}
              <p>
                <span className="font-semibold">Clinical impression:</span> {clinicalDiagnosis}
              </p>
              <p>
                <span className="font-semibold">Known allergies:</span> {patient?.allergies || "No known drug allergies"}
              </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Recommendations / Red Flags */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <AlertTriangle className="size-5" />
          </div>
          <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              RECOMMENDATIONS / RED FLAGS TO MONITOR:
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>Acute or worsening respiratory distress or chest discomfort</li>
              <li>Signs of acute hypoperfusion, altered sensorium, or hemodynamic instability</li>
              <li>Intractable pain unresponsive to conservative medical therapy</li>
              <li>Persistent vomiting, intolerance to oral intake, or high fever</li>
            </ul>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-2 mb-2" />
      </section>

      {/* Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/ref/${docId}`,
          documentId: docId,
          status: isDraft ? "DRAFT" : "REFERRAL ACTIVE",
        }}
        physicianRoleLabel="REFERRING PHYSICIAN"
        verificationTitle="REFERRAL VERIFICATION"
        scanInstruction="Receiving clinic scans here"
      />

      {/* Receiving Clinic Note */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
        <Info className="size-4 text-(--teal-800) shrink-0" />
        <span>
          <strong className="text-slate-800">Bring this document to the receiving clinic.</strong> Additional medical information may be requested by the receiving physician.
        </span>
      </div>
    </article>
  );
}
