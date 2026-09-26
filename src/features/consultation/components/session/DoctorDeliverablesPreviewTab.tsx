"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Pill,
  Printer,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { fetchBookingIntake } from "@/features/doctor/lib/api/bookingIntake";
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

  const openPreview = (type: CdsProtectedOutputType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const deliverableItems = [
    {
      type: "prescription" as const,
      title: "Electronic Prescription (Rx)",
      subtitle: "3 medications · Amoxicillin, Paracetamol, Cetirizine",
      tag: "Dispensing Rx",
      icon: Pill,
    },
    {
      type: "medical_certificate" as const,
      title: "Medical Certificate",
      subtitle: "3-day rest period · Fit to return on recovery",
      tag: "Certification",
      icon: ShieldCheck,
    },
    {
      type: "lab_request" as const,
      title: "Diagnostic Request",
      subtitle: "CBC with Platelets, Urinalysis, Chest X-Ray",
      tag: "Lab & Imaging",
      icon: TestTube2,
    },
    {
      type: "plan" as const,
      title: "Clinical Referral",
      subtitle: "Pulmonology / Internal Medicine Clinic",
      tag: "Specialist Care",
      icon: UserCheck,
    },
    {
      type: "patient_education" as const,
      title: "Care Guide (Gabay)",
      subtitle: "Tagalog home care plan & red flag warnings",
      tag: "Patient Education",
      icon: Stethoscope,
    },
  ];

  const activeArtifact = templateArtifacts[selectedType] || templateArtifacts.prescription;

  return (
    <div
      data-slot="doctor-deliverables-preview-tab"
      className="flex flex-col h-full min-h-0 bg-(--surface-subtle)/40 text-xs"
    >
      {/* Header Info */}
      <div className="shrink-0 border-b border-(--border-subtle) bg-(--surface-card) p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#074972]/10 text-[#074972]">
              <FileText className="size-4" />
            </span>
            <div>
              <h4 className="font-bold text-(--text-headings) text-xs">
                Clinical Deliverables
              </h4>
              <p className="text-[11px] text-(--text-muted)">
                Preview official documents for this encounter
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openPreview("prescription")}
            className="h-7 gap-1 px-2.5 text-[11px] font-semibold text-[#074972] border-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Printer className="size-3" />
            Print Specimen
          </Button>
        </div>
      </div>

      {/* List of Deliverable Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
        <div className="rounded-lg bg-teal-50/50 border border-teal-600/20 px-3 py-2 text-[11px] text-teal-900 leading-relaxed">
          <span className="font-bold">In-Consultation Reference: </span>
          Click any document below to inspect the exact printable paper sheet the patient will receive upon release.
        </div>

        {deliverableItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              className="flex flex-col gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 shadow-2xs hover:border-[#074972]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#074972] mt-0.5">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-bold text-slate-900 text-xs truncate">
                        {item.title}
                      </h5>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-(--border-subtle)/60 pt-2 mt-1">
                <span className="text-[10px] text-slate-500 font-medium">
                  Patient name &amp; case details mapped
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openPreview(item.type)}
                  className="h-6.5 gap-1 px-2.5 text-[11px] font-semibold text-[#074972] border-[#074972]/30 hover:bg-[#074972]/5 cursor-pointer shadow-2xs"
                >
                  <Eye className="size-3" />
                  Preview Document
                </Button>
              </div>
            </div>
          );
        })}
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
