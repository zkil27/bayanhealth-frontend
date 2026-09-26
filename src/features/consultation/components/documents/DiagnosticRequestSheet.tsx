"use client";

import { CheckCircle2, ClipboardPlus, FlaskConical, Scan } from "lucide-react";
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
  clinicalDiagnosis,
  priority = "Routine",
  className,
}: DiagnosticRequestSheetProps) {
  const patientName = patient?.name || "Maria Teresa D. Reyes";
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Female"]
      .filter(Boolean)
      .join(" / ");
  const dateRequested =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "BH-25-05-20-10245";
  const docId = verification?.documentId || `LAB-${caseId}`;

  const labTests = labPayload?.tests ?? [];
  const imagingStudies = imagingPayload?.studies ?? [];

  return (
    <article
      data-slot="diagnostic-request-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-800 print:shadow-none print:border-none print:p-0",
        className,
      )}
    >
      <DocumentSheetHeader
        title="DIAGNOSTIC REQUEST"
        subtitle="For collection by a licensed laboratory or imaging facility"
        isDraft={isDraft}
      />

      {/* Patient / Priority Strip */}
      <section className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Patient:</span>
            <p className="font-bold text-slate-900 truncate">{patientName}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Age / Sex:</span>
            <p className="font-semibold text-slate-900">{patientAgeSex}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Date Requested:</span>
            <p className="font-semibold text-slate-900">{dateRequested}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Priority:</span>
            <p
              className={cn(
                "font-bold uppercase text-[11px]",
                priority === "Urgent" || priority === "Stat"
                  ? "text-rose-700"
                  : "text-slate-800",
              )}
            >
              {priority}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Case ID:</span>
            <p className="font-mono font-semibold text-[#074972] truncate">{caseId}</p>
          </div>
        </div>
      </section>

      {/* Clinical Diagnosis / Indication */}
      <section className="mb-6">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
            <ClipboardPlus className="size-5 text-teal-700" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase">
              CLINICAL DIAGNOSIS / INDICATION
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {clinicalDiagnosis ||
                "GERD with persistent upper abdominal discomfort; evaluate for associated causes and baseline work-up."}
            </p>
          </div>
        </div>
      </section>

      {/* Requested Investigations */}
      <section className="mb-6 flex flex-col gap-4">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase">
          REQUESTED INVESTIGATIONS
        </h2>

        {/* 1. Laboratory */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#074972]">
            <FlaskConical className="size-4.5 text-teal-700" />
            <h3>1. LABORATORY</h3>
          </div>
          {labTests.length > 0 ? (
            <ul className="ml-7 list-disc space-y-1.5 text-xs sm:text-sm text-slate-800">
              {labTests.map((t, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-bold">{t.testName}</span>
                  {t.rationale ? (
                    <span className="text-slate-500 ml-1 text-xs">
                      — {t.rationale}
                    </span>
                  ) : null}
                  {t.priority === "urgent" ? (
                    <span className="ml-2 inline-flex rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 uppercase">
                      Urgent
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="ml-7 list-disc space-y-1 text-xs text-slate-700">
              <li>Complete Blood Count (CBC) with platelet count</li>
              <li>Urinalysis (Routine)</li>
              <li>Fasting Blood Sugar (FBS)</li>
            </ul>
          )}
        </div>

        {/* 2. Imaging */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#074972]">
            <Scan className="size-4.5 text-teal-700" />
            <h3>2. IMAGING</h3>
          </div>
          {imagingStudies.length > 0 ? (
            <ul className="ml-7 list-disc space-y-1.5 text-xs sm:text-sm text-slate-800">
              {imagingStudies.map((s, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-bold">{s.studyName}</span>
                  {s.bodyRegion ? (
                    <span className="text-slate-600 font-medium ml-1">
                      ({s.bodyRegion})
                    </span>
                  ) : null}
                  {s.rationale ? (
                    <span className="text-slate-500 ml-1 text-xs">
                      — {s.rationale}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="ml-7 list-disc space-y-1 text-xs text-slate-700">
              <li>Ultrasound Whole Abdomen</li>
            </ul>
          )}
        </div>

        {/* 3. Other Diagnostics */}
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold text-sm text-[#074972] mb-1">
            3. OTHER DIAGNOSTICS
          </h3>
          <p className="ml-7 text-xs text-slate-500">—</p>
        </div>
      </section>

      {/* Patient Preparation Instructions */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-2">
          PATIENT INSTRUCTIONS
        </h2>
        <div className="rounded-lg border border-teal-600/20 bg-teal-50/20 p-3 text-xs space-y-2 text-slate-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <span>
              If advised, fast for 8 to 10 hours before the blood collection (plain water is
              allowed).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <span>Bring this diagnostic request form and a valid government or school ID.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-teal-700 shrink-0 mt-0.5" />
            <span>
              Bring prior laboratory or ultrasound results for comparison if available.
            </span>
          </div>
          {labPayload?.instructions || imagingPayload?.instructions ? (
            <div className="pt-1 text-slate-800 font-medium pl-6">
              Specific note: {labPayload?.instructions || imagingPayload?.instructions}
            </div>
          ) : null}
        </div>
      </section>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/lab/${docId}`,
          documentId: docId,
          status: isDraft ? "SAMPLE" : "REQUEST ACTIVE",
        }}
        physicianRoleLabel="REQUESTING PHYSICIAN"
        verificationTitle="VERIFICATION"
        legalDisclaimer="This diagnostic request was issued by an attending licensed physician via BayanHealth Telemedicine. Findings must be interpreted alongside clinical context."
      />
    </article>
  );
}
