"use client";

import type { CdsPrescriptionPayload } from "@/types/cds-contract";
import { DocumentSheetHeader } from "./DocumentSheetHeader";
import { DocumentSheetFooter } from "./DocumentSheetFooter";
import type {
  DocumentPatientInfo,
  DocumentPhysicianInfo,
  DocumentVerificationInfo,
} from "./types";
import { cn } from "@/lib/utils";

interface PrescriptionSheetProps {
  payload: CdsPrescriptionPayload;
  patient?: DocumentPatientInfo;
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  isDraft?: boolean;
  className?: string;
}

export function PrescriptionSheet({
  payload,
  patient,
  physician,
  verification,
  isDraft = false,
  className,
}: PrescriptionSheetProps) {
  const patientName = patient?.name || "Maria Teresa D. Reyes";
  const patientDob = patient?.dateOfBirth || "Jan 12, 1997";
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Female"]
      .filter(Boolean)
      .join(" / ");
  const allergies = patient?.allergies?.trim() || "No known drug allergies";

  const dateIssued =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const timeIssued =
    patient?.consultationTime ||
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);
  const validUntil =
    verification?.validUntil ||
    validUntilDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const rxId = verification?.documentId || `RX-${patient?.caseId || "25-05-20-10245"}`;

  return (
    <article
      data-slot="prescription-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-800 print:shadow-none print:border-none print:p-0",
        className,
      )}
    >
      <DocumentSheetHeader
        title="ELECTRONIC PRESCRIPTION"
        subtitle="For dispensing by a licensed pharmacy"
        isDraft={isDraft}
      />

      {/* Patient Information Section */}
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
            <span className="text-slate-500 font-medium">Date issued:</span>
            <p className="font-semibold text-slate-900">{dateIssued}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Time issued:</span>
            <p className="font-semibold text-slate-900">{timeIssued}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Date of Birth:</span>
            <p className="font-semibold text-slate-900">{patientDob}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Age / Sex:</span>
            <p className="font-semibold text-slate-900">{patientAgeSex}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Valid until:</span>
            <p className="font-semibold text-slate-900">{validUntil}</p>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 font-medium">Allergies:</span>
            <p
              className={cn(
                "font-semibold",
                allergies.toLowerCase().includes("no known")
                  ? "text-slate-800"
                  : "text-rose-700 font-bold",
              )}
            >
              {allergies}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Rx ID:</span>
            <p className="font-mono font-semibold text-[#074972]">{rxId}</p>
          </div>
        </div>
      </section>

      {/* Prescription Table Section */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-2">
          PRESCRIPTION
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#074972] text-white">
                <th className="py-2.5 px-3 font-bold border-r border-[#074972]/30 w-[30%]">
                  Medication
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-[#074972]/30 w-[38%]">
                  Sig (Directions)
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-[#074972]/30 text-center w-[12%]">
                  Qty
                </th>
                <th className="py-2.5 px-3 font-bold border-r border-[#074972]/30 text-center w-[10%]">
                  Route
                </th>
                <th className="py-2.5 px-3 font-bold text-center w-[10%]">
                  Refills
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {payload.medications && payload.medications.length > 0 ? (
                payload.medications.map((med, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 align-top border-r border-slate-200">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        {med.genericName}
                      </p>
                      {med.dose ? (
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {med.dose}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 align-top border-r border-slate-200 text-slate-700">
                      <p className="leading-relaxed">{med.instructions}</p>
                      {med.frequency || med.duration ? (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {[med.frequency, med.duration].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 align-top border-r border-slate-200 text-center font-medium text-slate-800">
                      {med.duration || "1 pack"}
                    </td>
                    <td className="py-3 px-3 align-top border-r border-slate-200 text-center font-medium text-slate-700">
                      {med.route || "Oral"}
                    </td>
                    <td className="py-3 px-3 align-top text-center text-slate-500 font-medium">
                      None
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                    No medications prescribed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Special Instructions Section */}
      <section className="mb-6">
        <h2 className="text-[11px] font-bold tracking-wider text-[#074972] uppercase mb-1.5">
          SPECIAL INSTRUCTIONS
        </h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-700">
          <ul className="list-disc pl-4 space-y-1">
            <li>Avoid self-adjusting the prescribed medication dose.</li>
            <li>Consult again if symptoms persist, worsen, or unexpected reactions occur.</li>
            <li>
              Proceed immediately to the nearest Emergency Room if there is severe pain,
              difficulty breathing, persistent vomiting, or black stools.
            </li>
            {payload.notes ? (
              <li className="font-semibold text-slate-900 pt-1">
                Doctor&apos;s note: {payload.notes}
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/verify/rx/${rxId}`,
          documentId: rxId,
          status: isDraft ? "SAMPLE" : "ACTIVE",
          validUntil,
        }}
        physicianRoleLabel="PHYSICIAN INFORMATION"
        verificationTitle="PHARMACY VERIFICATION"
        legalDisclaimer="This is a computer-generated electronic prescription and does not require a wet signature. Pharmacists should verify authenticity using the QR code prior to dispensing."
      />
    </article>
  );
}
