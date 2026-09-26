"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Maximize2,
  Pill,
  Printer,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { fetchBookingIntake, type BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import { ClinicalDocumentSheet } from "../documents/ClinicalDocumentSheet";
import { DocumentSheetModal } from "../documents/DocumentSheetModal";
import type { ClinicalDocumentArtifact } from "../documents/types";
import type { CdsProtectedOutputType } from "@/types/cds-contract";

interface DoctorDeliverablesPreviewTabProps {
  bookingId: string;
}

export function DoctorDeliverablesPreviewTab({
  bookingId,
}: DoctorDeliverablesPreviewTabProps) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [selectedType, setSelectedType] = useState<CdsProtectedOutputType>("prescription");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: intake } = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchBookingIntake(idToken ?? "", bookingId),
    enabled: !!idToken && !!bookingId,
    staleTime: 1000 * 60 * 5,
  });

  const complaint = intake?.sections?.purpose?.chiefComplaint || "Upper respiratory symptoms";

  // Synthesize sample artifacts matching the 5 reference templates
  const templateArtifacts = useMemo<Record<string, ClinicalDocumentArtifact>>(() => {
    return {
      prescription: {
        artifactId: `sample-rx-${bookingId}`,
        consultationId: bookingId,
        outputType: "prescription",
        lifecycleStatus: "generated",
        payload: {
          medications: [
            {
              genericName: "Amoxicillin + Clavulanic Acid (Co-Amoxiclav) 625mg",
              dose: "625 mg",
              route: "Oral",
              frequency: "Every 12 hours after meals",
              duration: "7 days",
              instructions: "Take 1 tablet every 12 hours after meals for 7 days. Complete the full antibiotic course.",
            },
            {
              genericName: "Paracetamol 500mg",
              dose: "500 mg",
              route: "Oral",
              frequency: "Every 4 to 6 hours as needed",
              duration: "3 to 5 days",
              instructions: "Take 1 tablet every 4 to 6 hours as needed for body ache or temperature >= 37.8°C.",
            },
            {
              genericName: "Cetirizine Dihydrochloride 10mg",
              dose: "10 mg",
              route: "Oral",
              frequency: "Once daily at bedtime",
              duration: "5 days",
              instructions: "Take 1 tablet once daily at bedtime for 5 days as needed for rhinitis.",
            },
          ],
          notes:
            "Drink at least 2.5 liters of warm fluids daily. Return for evaluation if fever persists past 72 hours despite medication.",
        },
      },
      medical_certificate: {
        artifactId: `sample-medcert-${bookingId}`,
        consultationId: bookingId,
        outputType: "medical_certificate",
        lifecycleStatus: "generated",
        payload: {
          statement:
            `Patient was evaluated via teleconsultation presenting with non-productive cough, low-grade pyrexia, rhinorrhea, and mild pharyngeal congestion secondary to Acute Upper Respiratory Tract Infection (URTI) with ${complaint}. Recommended to undergo conservative symptomatic therapy, adequate hydration, and temporary home rest for 3 days to facilitate recovery and prevent transmission.`,
          restrictions: "Excuse from strenuous physical exertion, in-person work/school duties for 3 days.",
          validFrom: new Date().toISOString().split("T")[0],
          validThrough: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        },
      },
      lab_request: {
        artifactId: `sample-lab-${bookingId}`,
        consultationId: bookingId,
        outputType: "lab_request",
        lifecycleStatus: "generated",
        payload: {
          tests: [
            {
              testName: "Complete Blood Count (CBC) with Platelet Count",
              rationale: `Rule out acute bacterial infection or thrombocytopenia in relation to ${complaint}`,
              priority: "routine",
            },
            {
              testName: "Routine Urinalysis (Clean-Catch Midstream)",
              rationale: "Screen for secondary systemic involvement or urinary tract infection",
              priority: "routine",
            },
          ],
          instructions:
            "Ensure adequate hydration prior to blood extraction. Routine venipuncture. No prior fasting required.",
        },
      },
      imaging_request: {
        artifactId: `sample-imaging-${bookingId}`,
        consultationId: bookingId,
        outputType: "imaging_request",
        lifecycleStatus: "generated",
        payload: {
          studies: [
            {
              studyName: "Chest X-Ray PA View (Standing)",
              bodyRegion: "Thorax / Chest",
              rationale: `Persistent productive cough and pharyngeal congestion; rule out consolidation or infiltrates`,
              priority: "routine",
            },
          ],
          instructions: "Wear clothing free of metallic buttons or jewelry. Inform technician if pregnancy is suspected.",
        },
      },
      plan: {
        artifactId: `sample-referral-${bookingId}`,
        consultationId: bookingId,
        outputType: "plan",
        lifecycleStatus: "generated",
        payload: {
          summary: `Specialist evaluation for recurrent respiratory symptoms and targeted clinical workup`,
          goals: [
            "Identify underlying allergen triggers",
            "Obtain pulmonary baseline spirometry",
            "Optimize long-term airway health",
          ],
          interventions: [
            "Internal Medicine / Pulmonology specialist consultation",
            "Chest imaging correlation",
            "Environmental control measures",
          ],
          followUp: "Follow-up within 2 weeks or immediately if dyspnea or hemoptysis occurs.",
        },
      },
      patient_education: {
        artifactId: `sample-education-${bookingId}`,
        consultationId: bookingId,
        outputType: "patient_education",
        lifecycleStatus: "generated",
        payload: {
          title: "Gabay sa Iyong Pagpapagaling at Pag-inom ng Gamot",
          language: "taglish",
          sections: [
            {
              heading: "1. Sundin ang Tamang Oras ng Gamot",
              content: "Inumin ang niresetang gamot ayon sa schedule. Huwag laktawan o itigil ang antibiotic kahit gumanda na ang pakiramdam.",
              language: "filipino",
            },
            {
              heading: "2. Uminom ng Maraming Maligamgam na Tubig",
              content: "Mag-target ng 8 hanggang 10 baso ng tubig araw-araw upang lumabnaw ang plema at mapanatiling hydrated ang lalamunan.",
              language: "filipino",
            },
            {
              heading: "3. Magpahinga nang Sapat (7-8 Oras)",
              content: "Iwasan ang labis na pagpupuyat at mabibigat na gawain habang may lagnat o trangkaso upang makabawi ang resistensya.",
              language: "filipino",
            },
            {
              heading: "4. Huwag Mag-Self Medicate",
              content: "Iwasang uminom ng ibang gamot na hindi kasama sa reseta nang walang konsultasyon sa doktor.",
              language: "filipino",
            },
          ],
          warningSigns: [
            "Lagnat na higit sa 38.5°C na hindi bumababa sa gamot pagkalipas ng 3 araw",
            "Hirap o mabilis na paghinga, o paninikip ng dibdib",
            "Labis na panghihina o kawalan ng kakayahang uminom ng likido",
            "Pangangati, pamamantal, o pamamaga ng labi matapos uminom ng gamot",
          ],
        },
      },
    };
  }, [bookingId, complaint]);

  const activeArtifact = templateArtifacts[selectedType] || templateArtifacts.prescription;

  return (
    <div
      data-slot="doctor-deliverables-preview-tab"
      className="flex flex-col h-full min-h-0 bg-(--surface-subtle)/40 text-xs"
    >
      {/* Top Controls Toolbar */}
      <div className="shrink-0 border-b border-(--border-subtle) bg-(--surface-card) p-2.5 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--brand-navy)/10 text-(--brand-navy)">
              <FileText className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h4 className="font-semibold text-(--text-headings) truncate text-xs">
                Patient Deliverables Preview
              </h4>
              <p className="text-[11px] text-(--text-muted) truncate">
                Authentic clinical paper preview
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold text-(--brand-navy) border-(--brand-navy)/25 hover:bg-(--brand-navy)/5 shadow-2xs"
          >
            <Maximize2 className="size-3" />
            Full Sheet / Print
          </Button>
        </div>

        {/* Template Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedType("prescription")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border ${
              selectedType === "prescription"
                ? "bg-(--brand-navy) text-white border-(--brand-navy) shadow-xs"
                : "bg-(--surface-card) text-(--text-muted) border-(--border-subtle) hover:text-(--text-body) hover:bg-(--surface-subtle)"
            }`}
          >
            <Pill className="size-3" />
            Rx (Prescription)
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("medical_certificate")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border ${
              selectedType === "medical_certificate"
                ? "bg-(--brand-navy) text-white border-(--brand-navy) shadow-xs"
                : "bg-(--surface-card) text-(--text-muted) border-(--border-subtle) hover:text-(--text-body) hover:bg-(--surface-subtle)"
            }`}
          >
            <ShieldCheck className="size-3" />
            Medical Certificate
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("lab_request")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border ${
              selectedType === "lab_request"
                ? "bg-(--brand-navy) text-white border-(--brand-navy) shadow-xs"
                : "bg-(--surface-card) text-(--text-muted) border-(--border-subtle) hover:text-(--text-body) hover:bg-(--surface-subtle)"
            }`}
          >
            <TestTube2 className="size-3" />
            Diagnostic Request
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("plan")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border ${
              selectedType === "plan"
                ? "bg-(--brand-navy) text-white border-(--brand-navy) shadow-xs"
                : "bg-(--surface-card) text-(--text-muted) border-(--border-subtle) hover:text-(--text-body) hover:bg-(--surface-subtle)"
            }`}
          >
            <UserCheck className="size-3" />
            Clinical Referral
          </button>

          <button
            type="button"
            onClick={() => setSelectedType("patient_education")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 border ${
              selectedType === "patient_education"
                ? "bg-(--brand-navy) text-white border-(--brand-navy) shadow-xs"
                : "bg-(--surface-card) text-(--text-muted) border-(--border-subtle) hover:text-(--text-body) hover:bg-(--surface-subtle)"
            }`}
          >
            <Stethoscope className="size-3" />
            Care Guide (Gabay)
          </button>
        </div>
      </div>

      {/* Sheet Preview Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 flex flex-col items-center">
        <div className="w-full max-w-2xl flex flex-col gap-2.5">
          {/* Subtle Contextual Hint */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-(--surface-card) border border-(--border-subtle) text-[11px] text-(--text-muted)">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-1.5 rounded-full bg-(--brand-teal)" />
              In-Consultation Patient Preview
            </span>
            <span className="text-[10px]">
              Final editing & digital signing take place in Post-Consult
            </span>
          </div>

          {/* Authentic Document Sheet */}
          <div className="rounded-xl border border-(--border-subtle) bg-white shadow-sm overflow-hidden">
            <ClinicalDocumentSheet
              artifact={activeArtifact}
              intake={intake}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Modal for Full-Screen View & Print Specimen */}
      <DocumentSheetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        artifact={activeArtifact}
        intake={intake}
      />
    </div>
  );
}
