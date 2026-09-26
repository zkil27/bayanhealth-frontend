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
import type { CdsProtectedArtifact, CdsProtectedOutputType } from "@/types/cds-contract";

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

  const complaint = intake?.sections?.details?.chiefComplaint?.description || "Upper respiratory symptoms";

  // Synthesize sample artifacts matching the 5 reference templates
  const templateArtifacts = useMemo<Record<CdsProtectedOutputType, CdsProtectedArtifact>>(() => {
    return {
      prescription: {
        artifactId: `sample-rx-${bookingId}`,
        consultationId: bookingId,
        outputType: "prescription",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          medications: [
            {
              genericName: "Amoxicillin + Clavulanic Acid (Co-Amoxiclav)",
              brandName: "Augmentin",
              strength: "625 mg",
              dosageForm: "tablet",
              route: "Oral",
              sig: "Take 1 tablet every 12 hours after meals for 7 days. Complete the full antibiotic course.",
              quantity: "14 tablets",
              refills: 0,
              indication: `Bacterial exacerbation related to ${complaint}`,
              warnings: "Take with food to minimize gastric upset. Discontinue and report immediately if skin rash or swelling occurs.",
            },
            {
              genericName: "Paracetamol",
              brandName: "Biogesic",
              strength: "500 mg",
              dosageForm: "tablet",
              route: "Oral",
              sig: "Take 1 tablet every 4 to 6 hours as needed for body ache or temperature >= 37.8°C.",
              quantity: "10 tablets",
              refills: 0,
              indication: "Fever and generalized body pain",
              warnings: "Do not exceed 4,000 mg (8 tablets) within 24 hours to prevent hepatotoxicity.",
            },
            {
              genericName: "Cetirizine Dihydrochloride",
              brandName: "Virlix",
              strength: "10 mg",
              dosageForm: "tablet",
              route: "Oral",
              sig: "Take 1 tablet once daily at bedtime for 5 days as needed.",
              quantity: "5 tablets",
              refills: 0,
              indication: "Allergic rhinitis and nasal congestion",
              warnings: "May cause mild drowsiness. Avoid operating heavy machinery.",
            },
          ],
          instructions:
            "Drink at least 2.5 liters of warm fluids daily. Return for evaluation if fever persists past 72 hours despite medication.",
          dispensingPrecautions:
            "Valid for this prescription only. Pharmacist must verify authenticity QR or patient case identification.",
        },
      },
      medical_certificate: {
        artifactId: `sample-medcert-${bookingId}`,
        consultationId: bookingId,
        outputType: "medical_certificate",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          diagnosis: `Acute Upper Respiratory Tract Infection (URTI) with Acute Nasopharyngitis; ${complaint}`,
          findings:
            "Patient was evaluated via teleconsultation presenting with non-productive cough, low-grade pyrexia, rhinorrhea, and mild pharyngeal congestion. No respiratory distress observed. Hemodynamically stable.",
          recommendations:
            "Recommended to undergo conservative symptomatic therapy, adequate hydration, and temporary home rest to facilitate recovery and prevent transmission.",
          validFrom: new Date().toISOString().split("T")[0],
          validThrough: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          restrictions: "Excuse from strenuous physical exertion, in-person work/school duties for 3 days.",
          fitToWork: false,
          fitToWorkNotes:
            "Expected fit to resume normal duties on " +
            new Date(Date.now() + 86400000 * 3).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) +
            " provided the patient remains afebrile for at least 24 hours without antipyretics.",
        },
      },
      lab_request: {
        artifactId: `sample-lab-${bookingId}`,
        consultationId: bookingId,
        outputType: "lab_request",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          clinicalIndication: `Evaluation of persistent febrile illness and ${complaint}`,
          tests: [
            {
              testName: "Complete Blood Count (CBC) with Platelet Count",
              category: "Hematology",
              fastingRequired: false,
              instructions: "Routine venipuncture. No prior fasting required.",
              urgency: "routine",
            },
            {
              testName: "Routine Urinalysis (Clean-Catch Midstream)",
              category: "Clinical Microscopy",
              fastingRequired: false,
              instructions: "Submit first morning or clean-catch midstream urine specimen.",
              urgency: "routine",
            },
          ],
          patientPreparation:
            "Ensure adequate hydration prior to blood extraction. Follow sterile midstream cleaning protocol for urinalysis.",
          precautions: "Bring official laboratory result slip on follow-up teleconsultation.",
        },
      },
      imaging_request: {
        artifactId: `sample-imaging-${bookingId}`,
        consultationId: bookingId,
        outputType: "imaging_request",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          reasonForExam: `Persistent productive cough and pharyngeal congestion; rule out consolidation or infiltrates`,
          modalities: [
            {
              modality: "Chest X-Ray PA View (Standing)",
              region: "Thorax / Chest",
              instructions: "Wear clothing free of metallic buttons or jewelry. Remove necklaces.",
              contrast: "none",
            },
          ],
          patientPreparation: "Inform radiologic technologist if pregnancy is suspected.",
          precautions: "Non-contrast plain radiography.",
        },
      },
      plan: {
        artifactId: `sample-referral-${bookingId}`,
        consultationId: bookingId,
        outputType: "plan",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          reason: `Specialist evaluation for recurrent respiratory symptoms and targeted clinical workup`,
          specialty: "Pulmonology / Internal Medicine",
          urgency: "routine",
          clinicalSummary: `Patient presented with a history of ${complaint}. Teleconsultation initial assessment demonstrates acute upper airway involvement with favorable response to standard antipyretics. Referred for pulmonary baseline spirometry if cough persists beyond 2 weeks.`,
          recommendations: "Comprehensive pulmonary assessment, chest imaging review, and allergen evaluation.",
        },
      },
      patient_education: {
        artifactId: `sample-education-${bookingId}`,
        consultationId: bookingId,
        outputType: "patient_education",
        lifecycleStatus: "generated",
        payload: {
          schemaVersion: "v1",
          title: "Gabay sa Iyong Pagpapagaling at Pag-inom ng Gamot",
          summary: "Mahalagang gabay at paalala mula sa iyong BayanHealth doktor para sa ligtas at mabilis na paggaling.",
          sections: [
            {
              heading: "1. Sundin ang Tamang Oras ng Gamot",
              body: "Inumin ang niresetang gamot ayon sa schedule. Huwag laktawan o itigil ang antibiotic kahit gumanda na ang pakiramdam.",
            },
            {
              heading: "2. Uminom ng Maraming Maligamgam na Tubig",
              body: "Mag-target ng 8 hanggang 10 baso ng tubig araw-araw upang lumabnaw ang plema at mapanatiling hydrated ang lalamunan.",
            },
            {
              heading: "3. Magpahinga nang Sapat (7-8 Oras)",
              body: "Iwasan ang labis na pagpupuyat at mabibigat na gawain habang may lagnat o trangkaso upang makabawi ang resistensya.",
            },
            {
              heading: "4. Huwag Mag-Self Medicate",
              body: "Iwasang uminom ng ibang gamot na hindi kasama sa reseta nang walang konsultasyon sa doktor.",
            },
          ],
          warningSigns: [
            "Lagnat na higit sa 38.5°C na hindi bumababa sa gamot pagkalipas ng 3 araw",
            "Hirap o mabilis na paghinga, o paninikip ng dibdib",
            "Labis na panghihina o kawalan ng kakayahang uminom ng likido",
            "Pangangati, pamamantal, o pamamaga ng labi matapos uminom ng gamot",
          ],
          followUpAdvice: "Mag-book ng follow-up teleconsultation makalipas ang 5 hanggang 7 araw o kapag may bagong sintomas.",
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
