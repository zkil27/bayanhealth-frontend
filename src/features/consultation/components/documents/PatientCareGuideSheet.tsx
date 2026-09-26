"use client";

import {
  AlertCircle,
  Clock,
  HeartHandshake,
  HelpCircle,
  Pill,
  Stethoscope,
  Utensils,
  Moon,
  PiggyBank,
  Users,
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
  const rawPatientName = patient?.name || "Maria Teresa D. Reyes";
  const patientDisplayName = `Mahal naming ${rawPatientName}`;
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Babae"]
      .filter(Boolean)
      .join(" / ");
  const dateStr =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "BH-25-05-20-10245";

  const diagnosisTitle =
    payload?.titleFilipino || payload?.title || "GERD (Acid Reflux)";
  const warningSigns = payload?.warningSigns ?? [
    "Hirap o masakit sa paghinga",
    "Pagsusuka ng dugo o parang kape",
    "Itim o malagkit na dumi",
    "Matinding pananakit ng tiyan",
    "Hindi maipaliwanag na pagbaba ng timbang",
    "Paulit-ulit na pagsusuka",
  ];

  return (
    <article
      data-slot="patient-care-guide-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm text-slate-800 print:shadow-none print:border-none print:p-0",
        className,
      )}
    >
      <DocumentSheetHeader
        title="GABAY SA IYONG PAGPAPAGALING"
        subtitle="Pagkatapos ng Online Check-up"
        isDraft={isDraft}
      />

      {/* Patient Bar */}
      <section className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Pasyente:</span>
            <p className="font-bold text-slate-900 truncate">{patientDisplayName}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Edad / Kasarian:</span>
            <p className="font-semibold text-slate-900">{patientAgeSex}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Petsa:</span>
            <p className="font-semibold text-slate-900">{dateStr}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Case ID:</span>
            <p className="font-mono font-semibold text-[#074972] truncate">{caseId}</p>
          </div>
        </div>
      </section>

      {/* Diagnosis Explanation Banner */}
      <section className="mb-6">
        <div className="flex items-start gap-4 rounded-xl border border-teal-600/30 bg-teal-50/25 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <Stethoscope className="size-6 text-teal-700" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              Diagnosis: {diagnosisTitle}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
              Umaakyat ang asido mula sa tiyan papunta sa lalamunan. Kaya puwedeng
              makaramdam ng sikmura o dibdib na mahapdi, maasim ang lasa sa bibig, at madalas
              na pagdighay. Sundin ang mga sumusunod na gabay para sa mabilis na paggaling.
            </p>
          </div>
        </div>
      </section>

      {/* 5 Numbered Action Steps */}
      <section className="mb-6 flex flex-col gap-3">
        {/* Step 1: Medication */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#074972] font-black text-sm text-white">
            1
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h3 className="font-bold text-[#074972] uppercase text-xs mb-1">
              INUMIN ANG GAMOT AYON SA RESETA
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3 text-slate-700">
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Inumin ang gamot 30 minuto bago kumain ng almusal.</li>
                <li>Kumpletuhin ang mga araw ayon sa payo ng doktor.</li>
              </ul>
              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-200">
                Huwag basta magdagdag o huminto ng gamot nang walang payo ng doktor.
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Food & Diet */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#074972] font-black text-sm text-white">
            2
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h3 className="font-bold text-[#074972] uppercase text-xs mb-1">
              SA PAGKAIN AT INUMIN
            </h3>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
              <li>Kumain nang kaunti pero mas madalas (small frequent meals).</li>
              <li>
                Iwasan muna ang kape, soft drinks, alak, tsokolate, maanghang, at mamantikang pagkain.
              </li>
              <li>Huwag humiga agad pagkatapos kumain — maghintay nang 2 hanggang 3 oras.</li>
            </ul>
          </div>
        </div>

        {/* Step 3: Sleep */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#074972] font-black text-sm text-white">
            3
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h3 className="font-bold text-[#074972] uppercase text-xs mb-1">
              SA PAGTULOG AT PAGPAPAHINGA
            </h3>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
              <li>Kung umiinit o humahapdi sa gabi, itaas nang kaunti ang ulunan ng kama (6–8 inches).</li>
              <li>Huwag magsuot ng masisikip na damit sa bandang tiyan.</li>
            </ul>
          </div>
        </div>

        {/* Step 4: Follow-up */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 bg-white">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#074972] font-black text-sm text-white">
            4
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h3 className="font-bold text-[#074972] uppercase text-xs mb-1">
              PAG-FOLLOW-UP
            </h3>
            <p className="text-slate-700">
              Mag-follow up sa loob ng <strong>2 hanggang 4 na linggo</strong> o bumalik agad kung
              hindi gumagaan o pabalik-balik ang pananakit.
            </p>
          </div>
        </div>

        {/* Step 5: Red Flags / ER */}
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-700 font-black text-sm text-white">
            5
          </div>
          <div className="flex-1 text-xs sm:text-sm">
            <h3 className="font-bold text-rose-800 uppercase text-xs mb-1">
              PUMUNTA AGAD SA EMERGENCY ROOM (ER) KUNG MAY:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-rose-900">
              {warningSigns.map((sign, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span>{sign}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Practical Support Cards */}
      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-teal-600/30 bg-teal-50/20 p-3">
          <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1">
            <PiggyBank className="size-4 text-teal-700" />
            <span>PARA HINDI SAYANG ANG GASTOS</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            <li>Maaaring itanong sa botika kung may mas murang generic na gamot.</li>
            <li>Dalhin ang mga lumang reseta at lab results sa susunod na check-up.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-[#074972]/20 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 font-bold text-[#074972] mb-1">
            <Users className="size-4 text-[#074972]" />
            <span>NAHIHIRAPAN SUMUNOD SA PLANO?</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Ipakita ang gabay na ito sa anak, caregiver, o barangay health worker (BHW) na
            pinagkakatiwalaan ninyo upang maalalayan kayo.
          </p>
        </div>
      </section>

      {/* Sheet Footer */}
      <DocumentSheetFooter
        physician={physician}
        verification={{
          qrValue: verification?.qrValue || `https://bayanhealth.ph/patient/care-plan/${caseId}`,
          documentId: caseId,
          status: isDraft ? "SAMPLE" : "CARE PLAN AVAILABLE",
        }}
        physicianRoleLabel="IMPORMASYON NG DOKTOR"
        verificationTitle="CARE PLAN VERIFICATION"
        legalDisclaimer="Ang gabay na ito ay ibinigay kasunod ng online teleconsultation. Para sa anumang agarang emergency, huwag mag-atubiling pumunta sa pinakamalapit na ospital."
      />
    </article>
  );
}
