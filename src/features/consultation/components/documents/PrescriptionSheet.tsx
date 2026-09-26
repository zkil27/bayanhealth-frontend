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
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-8 sm:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="ELECTRONIC PRESCRIPTION"
        subtitle="For dispensing by a licensed pharmacy"
        isDraft={isDraft}
      />

      {/* Patient Information Section */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-2">
          PATIENT INFORMATION
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-700">
          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Name:</span>
            <span className="font-bold text-slate-900">{patientName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Date issued:</span>
            <span className="font-medium text-slate-900">{dateIssued}</span>
          </div>

          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Date of Birth:</span>
            <span className="font-medium text-slate-900">{patientDob}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Time issued:</span>
            <span className="font-medium text-slate-900">{timeIssued}</span>
          </div>

          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Age / Sex:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Valid until:</span>
            <span className="font-medium text-slate-900">{validUntil}</span>
          </div>

          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Allergies:</span>
            <span
              className={cn(
                "font-medium",
                allergies.toLowerCase().includes("no known")
                  ? "text-slate-900"
                  : "text-red-700 font-bold",
              )}
            >
              {allergies}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-600 font-medium w-24 shrink-0">Rx ID:</span>
            <span className="font-mono font-medium text-slate-900">{rxId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-3 mb-4" />
      </section>

      {/* Prescription Table Section */}
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-2">
          PRESCRIPTION
        </h2>
        <div className="w-full overflow-hidden border border-[#074972]/40 rounded-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#074972] text-white">
                <th className="py-2.5 px-3 font-semibold border-r border-[#074972]/50 w-[30%]">
                  Medication
                </th>
                <th className="py-2.5 px-3 font-semibold border-r border-[#074972]/50 w-[40%]">
                  Sig (Directions)
                </th>
                <th className="py-2.5 px-2 font-semibold border-r border-[#074972]/50 text-center w-[10%]">
                  Qty
                </th>
                <th className="py-2.5 px-2 font-semibold border-r border-[#074972]/50 text-center w-[10%]">
                  Route
                </th>
                <th className="py-2.5 px-2 font-semibold text-center w-[10%]">
                  Refills
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#074972]/20 bg-white">
              {payload.medications && payload.medications.length > 0 ? (
                payload.medications.map((med, index) => (
                  <tr key={index}>
                    <td className="py-3 px-3 align-top border-r border-[#074972]/20">
                      <p className="font-bold text-[#074972] text-xs leading-snug">
                        {med.genericName}
                      </p>
                      {med.dose && !med.genericName.includes(med.dose) ? (
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {med.dose}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 align-top border-r border-[#074972]/20 text-slate-800 leading-relaxed">
                      {med.instructions}
                    </td>
                    <td className="py-3 px-2 align-top border-r border-[#074972]/20 text-center font-medium text-slate-800">
                      {med.duration || "14 capsules"}
                    </td>
                    <td className="py-3 px-2 align-top border-r border-[#074972]/20 text-center text-slate-700">
                      {med.route || "Oral"}
                    </td>
                    <td className="py-3 px-2 align-top text-center text-slate-700">
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
      <section className="mb-4">
        <h2 className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-1.5">
          SPECIAL INSTRUCTIONS
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800 leading-relaxed">
          <li>Avoid self-adjusting the dose.</li>
          <li>Consult again if symptoms persist or worsen.</li>
          <li>Go to ER if there is vomiting blood, black stools, or difficulty swallowing.</li>
          {payload.notes ? (
            <li className="font-medium text-slate-900">
              Note: {payload.notes}
            </li>
          ) : null}
        </ul>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-4 mb-2" />
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
        scanInstruction="Scan before dispensing"
        legalDisclaimer="This is a computer-generated electronic prescription and does not require a wet signature. Pharmacists should verify authenticity using the QR code prior to dispensing."
      />
    </article>
  );
}
