"use client";

import {
  FileText,
  Info,
} from "lucide-react";
import type { CdsClinicalReferralPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { NOT_YET_ISSUED } from "./verification";
import { cn } from "@/lib/utils";

interface ClinicalReferralSheetProps {
  payload?: CdsClinicalReferralPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  className?: string;
}

export function ClinicalReferralSheet({
  payload,
  patient,
  physician,
  verification,
  isDraft = false,
  className,
}: ClinicalReferralSheetProps) {
  const patientName = patient?.name || "Patient name not on file";
  const patientAgeSex = [patient?.age ? `${patient.age}` : undefined, patient?.sex]
    .filter(Boolean)
    .join(" / ");
  const dateOfReferral =
    patient?.consultationDate ||
    NOT_YET_ISSUED;
  const caseId = patient?.caseId;
  const docId = verification?.documentId || (caseId ? `REF-${caseId}` : "Pending");
  const urgencyLabel =
    payload?.urgency === "emergency"
      ? "EMERGENCY: go to the nearest ER now"
      : payload?.urgency === "urgent"
        ? "Urgent"
        : payload?.urgency === "routine"
          ? "Routine"
          : "Not specified";

  return (
    <article
      data-slot="clinical-referral-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-(--white) p-5 @lg:p-8 @xl:p-12 text-slate-800 select-text leading-normal",
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
        <div className="grid grid-cols-2 @xl:grid-cols-5 gap-y-2 text-xs text-slate-700 @xl:divide-x divide-slate-300">
          <div className="@xl:pr-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Patient:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="@xl:px-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="@xl:px-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Date of Referral:</span>
            <span className="font-medium text-slate-900">{dateOfReferral}</span>
          </div>
          <div className="@xl:px-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Urgency:</span>
            <span className="font-medium text-slate-900">{urgencyLabel}</span>
          </div>
          <div className="@xl:pl-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-3 mb-4" />
      </section>

      {/* Structured Referral Rows — every field below is the physician's own
          confirmed Clinical Referral. It carries no diagnosis field by design
          (ADR-20260924-02): diagnosis lives on the Assessment, not here, so
          this preview does not assert one. */}
      <section className="mb-4 flex flex-col gap-3 text-xs">
        {/* Receiving facility / specialty */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <FileText className="size-5" />
          </div>
          <div className="grid grid-cols-1 @lg:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              RECEIVING FACILITY / SPECIALTY:
            </span>
            <span className="text-slate-800 leading-relaxed font-medium">
              {payload?.receivingFacilityOrSpecialty || "Not specified."}
            </span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Reason for referral */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <FileText className="size-5" />
          </div>
          <div className="grid grid-cols-1 @lg:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              REASON FOR REFERRAL:
            </span>
            <span className="text-slate-800 leading-relaxed font-medium">
              {payload?.reasonForReferral || "Pending physician documentation."}
            </span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Clinical summary */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <FileText className="size-5" />
          </div>
          <div className="grid grid-cols-1 @lg:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              CLINICAL SUMMARY:
            </span>
            <span className="text-slate-800 leading-relaxed font-medium">
              {payload?.clinicalSummary || "Pending physician documentation."}
            </span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-200" />

        {/* Follow-up */}
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white">
            <FileText className="size-5" />
          </div>
          <div className="grid grid-cols-1 @lg:grid-cols-[180px_minmax(0,1fr)] items-baseline gap-2 pt-2">
            <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
              FOLLOW-UP:
            </span>
            <span className="text-slate-800">{payload?.followUp || "Not specified."}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-2 mb-2" />
      </section>

      {/* Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue ?? "",
          documentId: docId,
          status: verification?.status,
          validUntil: verification?.validUntil,
        }}
        physicianRoleLabel="REFERRING PHYSICIAN"
        verificationTitle="REFERRAL VERIFICATION"
        scanInstruction="Receiving clinic scans here"
      />

      {/* Receiving Clinic Note */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-slate-200 pt-3 text-xs @xl:text-[11px] text-slate-600">
        <Info className="size-4 text-(--teal-800) shrink-0" />
        <span>
          <strong className="text-slate-800">Bring this document to the receiving clinic.</strong> Additional medical information may be requested by the receiving physician.
        </span>
      </div>
    </article>
  );
}
