"use client";

import { CheckCircle2, ClipboardList, ClipboardPlus, FlaskConical, Scan } from "lucide-react";
import type { CdsLabRequestPayload, CdsImagingRequestPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { cn } from "@/lib/utils";

interface DiagnosticRequestSheetProps {
  labPayload?: CdsLabRequestPayload;
  imagingPayload?: CdsImagingRequestPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  clinicalDiagnosis?: string;
  priority?: "Routine" | "Urgent" | "Stat";
  className?: string;
}

export function DiagnosticRequestSheet({
  labPayload,
  imagingPayload,
  patient,
  physician,
  verification,
  isDraft = false,
  clinicalDiagnosis = "Clinical diagnostic evaluation as clinically indicated.",
  priority = "Routine",
  className,
}: DiagnosticRequestSheetProps) {
  const patientName = patient?.name || "—";
  const patientAgeSex =
    [patient?.age ? `${patient.age} y/o` : null, patient?.sex || null]
      .filter(Boolean)
      .join(" / ") || "—";
  const dateRequested =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "—";
  const docId = verification?.documentId || (patient?.caseId ? `LAB-${patient.caseId}` : "—");

  const tests = labPayload?.tests ?? [];
  const studies = imagingPayload?.studies ?? [];

  return (
    <article
      data-slot="diagnostic-request-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-8 sm:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="DIAGNOSTIC REQUEST"
        subtitle="For collection by a licensed laboratory or imaging facility"
        isDraft={isDraft}
      />

      {/* Patient / Priority Banner */}
      <section className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-2 text-xs text-slate-700 divide-x divide-slate-300">
          <div className="pr-3">
            <span className="text-slate-500 block text-[11px]">Patient:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Date Requested:</span>
            <span className="font-medium text-slate-900">{dateRequested}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Priority:</span>
            <span className="font-medium text-slate-900">{priority}</span>
          </div>
          <div className="pl-3">
            <span className="text-slate-500 block text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-3 mb-4" />
      </section>

      {/* Clinical Diagnosis / Indication */}
      <section className="mb-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <ClipboardPlus className="size-6" />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <h2 className="text-xs font-bold tracking-wider text-(--navy-700) uppercase">
              CLINICAL DIAGNOSIS / INDICATION
            </h2>
            <p className="text-slate-800 leading-relaxed font-medium">
              {clinicalDiagnosis}
            </p>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-4 mb-4" />
      </section>

      {/* Requested Investigations */}
      <section className="mb-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-(--navy-700) uppercase">
          REQUESTED INVESTIGATIONS
        </h2>

        {/* 1. Laboratory */}
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <FlaskConical className="size-6" />
          </div>
          <div className="flex flex-col gap-1 text-xs pt-1">
            <h3 className="font-bold text-slate-900 text-xs uppercase">
              1. LABORATORY
            </h3>
            {tests.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800">
                {tests.map((test, i) => (
                  <li key={i} className="font-medium">
                    {test.testName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic pl-5">None requested</p>
            )}
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/20 my-1" />

        {/* 2. Imaging */}
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <Scan className="size-6" />
          </div>
          <div className="flex flex-col gap-1 text-xs pt-1">
            <h3 className="font-bold text-slate-900 text-xs uppercase">
              2. IMAGING
            </h3>
            {studies.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800">
                {studies.map((study, i) => (
                  <li key={i} className="font-medium">
                    {study.studyName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic pl-5">None requested</p>
            )}
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/20 my-1" />

        {/* 3. Other Diagnostics */}
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
            <ClipboardList className="size-6" />
          </div>
          <div className="flex flex-col gap-1 text-xs pt-1">
            <h3 className="font-bold text-slate-900 text-xs uppercase">
              3. OTHER DIAGNOSTICS
            </h3>
            <p className="text-slate-500 pl-2">—</p>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-2 mb-3" />
      </section>

      {/* Patient Instructions */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-(--navy-700) uppercase mb-2">
          PATIENT INSTRUCTIONS
        </h2>
        <div className="flex flex-col gap-2 text-xs text-slate-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-(--teal-700) shrink-0 mt-0.5" />
            <span>If advised, fast for 8 to 10 hours before fasting blood tests; plain water is allowed.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-(--teal-700) shrink-0 mt-0.5" />
            <span>Bring this diagnostic request slip and a valid government-issued ID to the facility.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-(--teal-700) shrink-0 mt-0.5" />
            <span>Bring prior laboratory or radiology results if available for comparative evaluation.</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-4 mb-2" />
      </section>

      {/* Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/lab/${docId}`,
          documentId: docId,
          status: isDraft ? "DRAFT" : "REQUEST ACTIVE",
        }}
        physicianRoleLabel="REQUESTING PHYSICIAN"
        verificationTitle="VERIFICATION"
        scanInstruction="Scan before collection"
      />
    </article>
  );
}
