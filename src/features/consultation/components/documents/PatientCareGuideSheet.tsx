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
  const rawPatientName = patient?.name || "Maria Teresa D. Reyes";
  const patientDisplayName = `Mahal naming ${rawPatientName}`;
  const patientAgeSex =
    [patient?.age ? `${patient.age}` : "28", patient?.sex ? `${patient.sex}` : "Babae"]
      .filter(Boolean)
      .join(" / ");
  const dateOfConsultation =
    patient?.consultationDate ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const caseId = patient?.caseId || "BH-25-05-20-10245";
  const docId = verification?.documentId || `CG-${caseId}`;

  const diagnosisTitle = payload?.title || "GERD (Acid Reflux) at Ubo";

  return (
    <article
      data-slot="patient-care-guide-sheet"
      className={cn(
        "relative mx-auto flex w-full max-w-[760px] flex-col bg-white p-8 sm:p-12 text-slate-800 select-text leading-normal",
        "print:p-0 print:max-w-none print:shadow-none",
        className,
      )}
    >
      <DocumentSheetHeader
        title="GABAY SA IYONG PAGPAPAGALING"
        subtitle="Pagkatapos ng Online Check-up"
        isDraft={isDraft}
      />

      {/* Patient Demographic Bar */}
      <section className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 text-xs text-slate-700 divide-x divide-slate-300">
          <div className="pr-3">
            <span className="text-slate-500 block text-[11px]">Pasyente:</span>
            <span className="font-bold text-slate-900">{patientDisplayName}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Edad / Kasarian:</span>
            <span className="font-medium text-slate-900">{patientAgeSex}</span>
          </div>
          <div className="px-3">
            <span className="text-slate-500 block text-[11px]">Petsa:</span>
            <span className="font-medium text-slate-900">{dateOfConsultation}</span>
          </div>
          <div className="pl-3">
            <span className="text-slate-500 block text-[11px]">Case ID:</span>
            <span className="font-mono font-medium text-slate-900">{docId}</span>
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#074972]/30 mt-3 mb-4" />
      </section>

      {/* Diagnosis Outlined Container */}
      <section className="mb-4 rounded-xl border border-[#074972]/30 p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#18a58c] bg-teal-50/20 text-[#18a58c]">
            <Stethoscope className="size-7" />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <h2 className="font-bold text-sm text-[#074972]">
              Diagnosis: {diagnosisTitle}
            </h2>
            <p className="text-slate-700 leading-relaxed font-medium">
              Umaakyat ang asido mula sa tiyan papunta sa lalamunan o may pamamaga sa daluyan ng hangin. Kaya puwedeng makaramdam ng sikmura o dibdib na mahapdi, maasim ang lasa, tuyong ubo, at madalas na pagdighay.
            </p>
          </div>
        </div>
      </section>

      {/* Numbered Steps 1 to 5 */}
      <section className="mb-4 flex flex-col divide-y divide-slate-200 text-xs">
        {/* Step 1 */}
        <div className="flex items-start gap-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white font-bold text-xs">
            1
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)_160px] gap-2 items-start w-full pt-1">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              INUMIN ANG GAMOT AYON SA RESETA
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>Inumin ang niresetang gamot ayon sa iskedyul</li>
              <li>Isang beses bawat araw, 30 minutes bago mag-almusal</li>
              <li>Kumpletuhin ang buong bilang ng araw na itinakda</li>
            </ul>
            <p className="text-[11px] text-slate-500 italic">
              Kung may ibang iniinom, sundin ang payo ng doktor. Huwag magdagdag nang walang paalam.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white font-bold text-xs">
            2
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              SA PAGKAIN
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>Kumain nang kaunti pero mas madalas sa maghapon.</li>
              <li>Iwas muna sa kape, soft drinks, alak, tsokolate, maanghang, maasim, at mamantikang pagkain.</li>
              <li>Huwag humiga agad pagkatapos kumain. Maghintay ng 2 hanggang 3 oras.</li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white font-bold text-xs">
            3
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              SA PAGTULOG
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>Kung umiinit o sumasakit ang sikmura sa gabi, itaas nang kaunti ang ulunan ng kama (6–8 inches).</li>
              <li>Iwasang matulog agad pagkagaling sa kainan.</li>
            </ul>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex items-start gap-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#005f73] text-white font-bold text-xs">
            4
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
            <span className="font-bold text-[#074972] tracking-wider uppercase text-xs">
              FOLLOW-UP
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
              <li>Mag-follow up sa loob ng 2 hanggang 4 na linggo para sa re-assessment.</li>
              <li>Bumalik nang mas maaga kung hindi gumagaan ang pakiramdam o pabalik-balik ang sintomas.</li>
            </ul>
          </div>
        </div>

        {/* Step 5: Red Flags in Red */}
        <div className="flex items-start gap-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs">
            5
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-2 items-start w-full pt-1">
            <span className="font-bold text-red-700 tracking-wider uppercase text-xs">
              PUMUNTA AGAD SA ER KUNG MAY
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-red-700 font-medium">
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Hirap o masakit na paghinga</li>
                <li>Pagsusuka ng dugo o parang kape</li>
                <li>Itim o malagkit na dumi</li>
                <li>Matindi o lumalalang sakit ng tiyan</li>
              </ul>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Nawawalan ng timbang nang hindi sinasadya</li>
                <li>Paulit-ulit o matinding pagsusuka</li>
                <li>Hirap lumunok o parang may nakabara sa lalamunan</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Two Outlined Callout Cards */}
      <section className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Para Hindi Sayang Ang Gastos */}
        <div className="rounded-xl border border-[#18a58c] p-3 text-xs flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#18a58c] bg-teal-50/20 text-[#18a58c]">
            <Wallet className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-xs text-[#074972] tracking-wider uppercase">
              PARA HINDI SAYANG ANG GASTOS
            </h3>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700 text-[11px]">
              <li>Puwede magtanong kung may mas murang generic na gamot.</li>
              <li>Huwag basta bumili ng maraming gamot kung hindi nireseta.</li>
              <li>Dalhin ang lumang reseta at mga test results sa susunod na check-up.</li>
            </ul>
          </div>
        </div>

        {/* Nahihirapan Sumunod Sa Plano? */}
        <div className="rounded-xl border border-[#18a58c] p-3 text-xs flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#18a58c] bg-teal-50/20 text-[#18a58c]">
            <Users className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-xs text-[#074972] tracking-wider uppercase">
              NAHIHIRAPAN SUMUNOD SA PLANO?
            </h3>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Ipakita ang gabay na ito sa anak, kapamilya, caregiver, o barangay health worker na pinagkakatiwalaan ninyo para matulungan kayong masubaybayan ang tamang gamutan.
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
          status: isDraft ? "SAMPLE" : "CARE PLAN AVAILABLE",
        }}
        physicianRoleLabel="IMPORMASYON NG DOKTOR"
        verificationTitle="SCAN PARA BUMALIK SA CARE PLAN"
        scanInstruction="Makikita rito ang reseta at follow-up schedule"
      />
    </article>
  );
}
