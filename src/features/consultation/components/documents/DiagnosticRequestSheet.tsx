"use client";

import { CheckCircle2, ClipboardPlus, FlaskConical, Scan } from "lucide-react";
import type { CdsDiagnosticRequestPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { NOT_YET_ISSUED } from "./verification";
import { cn } from "@/lib/utils";

interface DiagnosticRequestSheetProps {
  payload?: CdsDiagnosticRequestPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  className?: string;
}

const MODALITY_LABELS: Record<CdsDiagnosticRequestPayload["modality"], string> = {
  lab: "Laboratory",
  imaging: "Imaging",
  urinalysis: "Urinalysis",
  other: "Other",
};

export function DiagnosticRequestSheet({
  payload,
  patient,
  physician,
  verification,
  isDraft = false,
  className,
}: DiagnosticRequestSheetProps) {
  const patientName = patient?.name || "Patient name not on file";
  const patientAgeSex = [patient?.age ? `${patient.age}` : undefined, patient?.sex]
    .filter(Boolean)
    .join(" / ");
  const dateRequested =
    patient?.consultationDate ||
    NOT_YET_ISSUED;
  const caseId = patient?.caseId;
  const docId = verification?.documentId || (caseId ? `DX-${caseId}` : "Pending");

  const items = payload?.items ?? [];
  // Never a fixed default: the banner states the highest priority actually
  // present among the physician's own ordered items, not an invented one.
  const priorityLabel = items.length === 0
    ? "Not specified"
    : items.some((item) => item.priority === "urgent")
      ? "Urgent"
      : "Routine";
  const modalityLabel = payload ? MODALITY_LABELS[payload.modality] : undefined;

  // An item carries either `studyName` (imaging) or `testName`
  // (lab/urinalysis/other) per the contract — grouped by which field is
  // actually present rather than assumed from the document's own `modality`,
  // since only the items the physician actually entered are ever shown.
  const imagingItems = items.filter((item) => Boolean(item.studyName?.trim()));
  const otherItems = items.filter((item) => !item.studyName?.trim());

  return (
    <article
      data-slot="diagnostic-request-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-(--white) p-5 @lg:p-8 @xl:p-12 text-slate-800 select-text leading-normal",
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
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Date Requested:</span>
            <span className="font-medium text-slate-900">{dateRequested}</span>
          </div>
          <div className="@xl:px-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Priority:</span>
            <span className="font-medium text-slate-900">{priorityLabel}</span>
          </div>
          <div className="@xl:pl-3">
            <span className="text-slate-500 block text-xs @xl:text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-(--navy-700)/30 mt-3 mb-4" />
      </section>

      {/* Clinical Diagnosis / Indication */}
      {payload?.instructions ? (
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
                {payload.instructions}
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full bg-(--navy-700)/30 mt-4 mb-4" />
        </section>
      ) : null}

      {/* Requested Investigations */}
      <section className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-(--navy-700) uppercase">
            REQUESTED INVESTIGATIONS
          </h2>
          {modalityLabel ? (
            <span className="text-xs @xl:text-[11px] font-medium text-slate-500">
              Modality: {modalityLabel}
            </span>
          ) : null}
        </div>

        {/* 1. Laboratory / Urinalysis / Other */}
        {otherItems.length > 0 ? (
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
              <FlaskConical className="size-6" />
            </div>
            <div className="flex flex-col gap-2 text-xs pt-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase">
                LABORATORY
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {otherItems.map((item, i) => (
                  <li key={i}>
                    <p className="font-medium">
                      {item.testName}
                      {item.priority === "urgent" ? (
                        <span className="ml-2 rounded-full bg-(--danger-bg) px-2 py-0.5 text-xs @xl:text-[10px] font-bold text-(--danger-fg) uppercase">
                          Urgent
                        </span>
                      ) : null}
                    </p>
                    {item.rationale ? (
                      <p className="text-slate-600">{item.rationale}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {otherItems.length > 0 && imagingItems.length > 0 ? (
          <div className="h-[1px] w-full bg-(--navy-700)/20 my-1" />
        ) : null}

        {/* 2. Imaging */}
        {imagingItems.length > 0 ? (
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--teal-700) bg-(--teal-100)/30 text-(--teal-700)">
              <Scan className="size-6" />
            </div>
            <div className="flex flex-col gap-2 text-xs pt-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase">
                IMAGING
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {imagingItems.map((item, i) => (
                  <li key={i}>
                    <p className="font-medium">
                      {item.studyName}
                      {item.bodyRegion ? (
                        <span className="ml-2 font-normal text-slate-600">{item.bodyRegion}</span>
                      ) : null}
                      {item.priority === "urgent" ? (
                        <span className="ml-2 rounded-full bg-(--danger-bg) px-2 py-0.5 text-xs @xl:text-[10px] font-bold text-(--danger-fg) uppercase">
                          Urgent
                        </span>
                      ) : null}
                    </p>
                    {item.rationale ? (
                      <p className="text-slate-600">{item.rationale}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No investigations recorded on this request.</p>
        ) : null}

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
          qrValue: verification?.qrValue ?? "",
          documentId: docId,
          status: verification?.status,
          validUntil: verification?.validUntil,
        }}
        physicianRoleLabel="REQUESTING PHYSICIAN"
        verificationTitle="VERIFICATION"
        scanInstruction="Scan before collection"
      />
    </article>
  );
}
