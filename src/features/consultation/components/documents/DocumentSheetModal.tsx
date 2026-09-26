"use client";

import { Eye, FileCheck, FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
import { ClinicalDocumentSheet } from "./ClinicalDocumentSheet";
import type { ClinicalDocumentArtifact } from "./types";
import { OUTPUT_LABELS } from "../postConsultation/workspacePhase";
import { cn } from "@/lib/utils";

interface DocumentSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: ClinicalDocumentArtifact | undefined;
  intake?: BookingIntakeForm | null;
  specimen?: DoctorSignatureSpecimen | undefined;
  doctorName?: string;
}

export function DocumentSheetModal({
  open,
  onOpenChange,
  artifact,
  intake,
  specimen,
  doctorName,
}: DocumentSheetModalProps) {
  if (!artifact) return null;

  const handlePrint = () => {
    window.print();
  };

  const docTitle = OUTPUT_LABELS[artifact.outputType] || "Clinical Document";
  const isDraft = artifact.lifecycleStatus === "generated";
  const patientName = intake?.patientName || "Maria Teresa D. Reyes";
  const caseId = artifact.consultationId || intake?.bookingId || "BH-25-05-20-10245";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2",
          "!w-[96vw] !max-w-6xl !h-[92vh] !max-h-[94vh]",
          "p-0 gap-0 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col z-50 text-slate-100",
        )}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: portrait;
                  margin: 8mm;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-document-sheet, #printable-document-sheet * {
                  visibility: visible !important;
                }
                #printable-document-sheet {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                  z-index: 9999999 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                #printable-document-sheet article {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  max-width: 100% !important;
                }
              }
            `,
          }}
        />

        {/* Top Professional Inspector Toolbar */}
        <header className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between z-10 select-none">
          {/* Left: Document Info */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#074972] text-white shadow-xs">
              <FileText className="size-4 text-[#18a58c]" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm font-bold text-white tracking-tight truncate">
                  {docTitle}
                </DialogTitle>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    isDraft
                      ? "bg-red-950/80 text-red-400 border border-red-800/60"
                      : "bg-teal-950/80 text-teal-400 border border-teal-800/60",
                  )}
                >
                  {isDraft ? "DRAFT SPECIMEN" : "OFFICIAL RECORD"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Patient: <span className="text-slate-200 font-medium">{patientName}</span> · Case ID: <span className="font-mono text-slate-300">{caseId}</span>
              </p>
            </div>
          </div>

          {/* Center: Format specs */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-full px-3 py-1 text-xs text-slate-300">
            <FileCheck className="size-3.5 text-[#18a58c]" />
            <span>Standard Clinical Sheet · 8.5 × 11 in (Portrait)</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-[#18a58c] hover:bg-[#158f79] text-white font-semibold text-xs h-8.5 px-3.5 gap-2 rounded-lg shadow-sm cursor-pointer transition-all"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg size-8.5 cursor-pointer ml-1"
              title="Close Preview (ESC)"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>

        {/* Document Lightbox Canvas */}
        <div className="flex-1 min-h-0 bg-[#25282a] overflow-y-auto overflow-x-hidden p-6 sm:p-10 md:p-12 flex justify-center items-start">
          <div className="w-full max-w-[800px] flex flex-col items-center">
            {/* White Physical Paper Document */}
            <div
              id="printable-document-sheet"
              className="w-full bg-white text-slate-900 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-black/10 overflow-hidden"
            >
              <ClinicalDocumentSheet
                artifact={artifact}
                intake={intake}
                specimen={specimen}
                doctorName={doctorName}
                className="p-8 sm:p-12"
              />
            </div>

            {/* Bottom helper tip */}
            <p className="text-[11px] text-slate-400 text-center mt-4 select-none">
              This preview reflects the exact layout and typography formatted for patient printing and pharmacy scanning.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
