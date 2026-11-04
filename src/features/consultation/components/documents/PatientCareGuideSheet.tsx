"use client";

import {
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import type { CdsPatientEducationPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { cn } from "@/lib/utils";

interface PatientCareGuideSheetProps {
  payload?: CdsPatientEducationPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  className?: string;
}

export function PatientCareGuideSheet({
  payload,
  patient,
  physician,
  verification,
  isDraft = false,
  className,
}: PatientCareGuideSheetProps) {
  const rawPatientName = patient?.name || "—";
  const patientDisplayName = patient?.name ? `Dear ${patient.name}` : "Care guide";
  const patientAgeSex =
    [patient?.age ? `${patient.age} y/o` : null, patient?.sex || null]
      .filter(Boolean)
      .join(" / ") || "—";
  const dateOfConsultation =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "—";
  const docId = verification?.documentId || (patient?.caseId ? `CG-${patient.caseId}` : "—");

  const diagnosisTitle = payload?.title || "Care guide";

  return (
    <article
      data-slot="patient-care-guide-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-4 sm:p-8 md:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="YOUR RECOVERY GUIDE"
        subtitle="After your online check-up"
        isDraft={isDraft}
      />

      {/* Patient Demographic Bar */}
      <section className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x sm:divide-slate-300 text-xs text-slate-700">
          <div className="col-span-2 sm:col-span-1 sm:pr-3">
            <span className="text-slate-500 block text-[11px]">Patient:</span>
            <span className="font-bold text-slate-900">{rawPatientName}</span>
          </div>
          <div className="sm:px-3">
            <span className="text-slate-500 block text-[11px]">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="sm:px-3">
            <span className="text-slate-500 block text-[11px]">Date:</span>
            <span className="font-medium text-slate-900">{dateOfConsultation}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 sm:pl-3">
            <span className="text-slate-500 block text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-3 mb-4" />
      </section>

      {/* Diagnosis Outlined Container */}
      <section className="mb-4 rounded-xl border border-(--navy-700)/30 p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <Stethoscope className="size-7" />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <h2 className="font-bold text-sm text-(--navy-700)">
              Diagnosis: {diagnosisTitle}
            </h2>
            {/* English-only app (2026-11-03): `payload.titleFilipino` is no longer shown to patients. */}
          </div>
        </div>
      </section>

      {/* Dynamic Numbered Steps from Payload */}
      <section className="mb-4 flex flex-col divide-y divide-slate-200 text-xs">
        {payload?.sections && payload.sections.length > 0 ? (
          payload.sections.map((section, idx) => (
            <div key={idx} className="flex items-start gap-3 py-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--teal-800) text-white font-bold text-xs">
                {idx + 1}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
                <span className="font-bold text-(--navy-700) tracking-wider uppercase text-xs">
                  {section.heading}
                </span>
                <p className="text-slate-800 font-medium whitespace-pre-line text-xs leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-xs text-slate-500 italic">No specific guidance was given.</p>
        )}

        {/* Warning Signs from Payload */}
        {payload?.warningSigns && payload.warningSigns.length > 0 ? (
          <div className="flex items-start gap-3 py-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs">
              !
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
              <span className="font-bold text-red-700 tracking-wider uppercase text-xs">
                WARNING SIGNS: GO TO THE ER RIGHT AWAY IF YOU HAVE
              </span>
              <ul className="list-disc pl-5 space-y-1 text-red-700 font-medium">
                {payload.warningSigns.map((sign, i) => (
                  <li key={i}>{sign}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>

      {/* Two Outlined Callout Cards */}
      <section className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Make every peso count */}
        <div className="rounded-xl border border-(--teal-700) p-3 text-xs flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <Wallet className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-xs text-(--navy-700) tracking-wider uppercase">
              MAKE EVERY PESO COUNT
            </h3>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700 text-[11px]">
              <li>You can ask if a cheaper generic medicine is available.</li>
              <li>Don&apos;t buy extra medicines that weren&apos;t prescribed.</li>
              <li>Bring your old prescriptions and test results to your next check-up.</li>
            </ul>
          </div>
        </div>

        {/* Finding the plan hard to follow? */}
        <div className="rounded-xl border border-(--teal-700) p-3 text-xs flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <Users className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-xs text-(--navy-700) tracking-wider uppercase">
              FINDING THE PLAN HARD TO FOLLOW?
            </h3>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Show this guide to a child, family member, caregiver, or barangay health worker you trust so they can help you stay on track with your treatment.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/careplan/${docId}`,
          documentId: docId,
          status: isDraft ? "DRAFT" : "CARE PLAN AVAILABLE",
        }}
        physicianRoleLabel="DOCTOR INFORMATION"
        verificationTitle="SCAN TO RETURN TO YOUR CARE PLAN"
        scanInstruction="See your prescription and follow-up schedule here"
      />
    </article>
  );
}
