"use client";

import { Archive, Eye, FileCheck, FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import { ClinicalDocumentSheet } from "./ClinicalDocumentSheet";
import type { ClinicalDocumentArtifact } from "./types";
import { OUTPUT_LABELS } from "../postConsultation/workspacePhase";
import { cn } from "@/lib/utils";

interface DocumentSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: ClinicalDocumentArtifact | undefined;
  intake?: BookingIntakeForm | null;
  /** The patient's own name, for the patient's view. */
  patientName?: string;
  doctorName?: string;
  isHistoricalArchive?: boolean;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  doctorPtrNumber?: string;
}

export function DocumentSheetModal({
  open,
  onOpenChange,
  artifact,
  intake,
  patientName,
  doctorName,
  isHistoricalArchive = false,
  doctorSpecialty,
  doctorLicenseNumber,
  doctorPtrNumber,
}: DocumentSheetModalProps) {
  if (!artifact) return null;

  const handlePrint = () => {
    window.print();
  };

  const docTitle = OUTPUT_LABELS[artifact.outputType] || "Clinical Document";
  const isDraft = artifact.lifecycleStatus === "generated";
  const headerPatientName = patientName || intake?.patientName || "—";
  const caseId = artifact.consultationId || intake?.bookingId || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2",
          // Full screen on a phone; a framed lightbox from sm up.
          "!w-full !max-w-none !h-[100dvh] !max-h-[100dvh] rounded-none",
          "sm:!w-[96vw] sm:!max-w-6xl sm:!h-[92vh] sm:!max-h-[94vh] sm:rounded-2xl",
          "p-0 gap-0 overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl flex flex-col z-50 text-slate-100",
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
        <header className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-2 z-10 select-none pt-[env(safe-area-inset-top,0px)] box-content">
          {/* Left: Document Info */}
          {/* On a phone only the title stays: the paper itself shows the status and patient. */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--navy-700) text-white shadow-xs">
              <FileText className="size-4 text-(--teal-700)" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <DialogTitle className="text-sm font-bold text-white tracking-tight truncate">
                  {docTitle}
                </DialogTitle>
                <span
                  className={cn(
                    "hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap",
                    isDraft
                      ? "bg-red-950/80 text-red-400 border border-red-800/60"
                      : isHistoricalArchive
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                        : "bg-teal-950/80 text-teal-400 border border-teal-800/60",
                  )}
                >
                  {isDraft
                    ? "DRAFT SPECIMEN"
                    : isHistoricalArchive
                      ? "HISTORICAL ARCHIVE (READ-ONLY)"
                      : "OFFICIAL RECORD"}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 truncate mt-0.5">
                Patient: <span className="text-slate-200 font-medium">{headerPatientName}</span> · Case ID: <span className="font-mono text-slate-300">{caseId}</span>
              </p>
            </div>
          </div>

          {/* Center: Format specs */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-full px-3 py-1 text-xs text-slate-300">
            <FileCheck className="size-3.5 text-(--teal-700)" />
            <span>Standard Clinical Sheet · 8.5 × 11 in (Portrait)</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrint}
              className="bg-(--teal-700) hover:bg-(--teal-600) text-white font-semibold text-xs h-8.5 px-3.5 gap-2 rounded-lg shadow-sm cursor-pointer transition-all"
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
        <div className="flex-1 min-h-0 bg-slate-900 overflow-y-auto overflow-x-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-6 md:p-10 flex justify-center items-start">
          <div className="w-full max-w-[800px] flex flex-col items-center">
            {/* Historical Archive Notice Banner */}
            {isHistoricalArchive && (
              <div className="w-full mb-3 px-4 py-2.5 rounded-lg bg-amber-950/60 border border-amber-800/70 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-sm print:hidden">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Archive className="size-4 text-amber-400 shrink-0" />
                  <span className="font-medium truncate">
                    Historical Artifact Archive — Read-Only Clinical Audit Mode
                  </span>
                </div>
                <span className="text-[11px] text-amber-300/80 font-mono shrink-0">
                  {artifact.assessmentVersion ? `Assessment v${artifact.assessmentVersion}` : "Historical Record"}
                  {artifact.artifactRevision ? ` · rev ${artifact.artifactRevision}` : ""}
                </span>
              </div>
            )}

            {/* White Physical Paper Document. A size container: the sheet lays out by
                its own width, so a phone gets a readable column while print keeps the page. */}
            <div
              id="printable-document-sheet"
              className="@container w-full bg-white text-slate-900 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.3)] ring-1 ring-black/10 overflow-hidden"
            >
              <ClinicalDocumentSheet
                artifact={artifact}
                intake={intake}
                patientName={patientName}
                doctorName={doctorName}
                doctorSpecialty={doctorSpecialty}
                doctorLicenseNumber={doctorLicenseNumber}
                doctorPtrNumber={doctorPtrNumber}
                className="p-5 @lg:p-8 @xl:p-12"
              />
            </div>

            {/* Bottom helper tip */}
            <p className="text-[11px] text-slate-400 text-center mt-3 sm:mt-4 select-none px-2">
              This preview reflects the exact layout and typography formatted for patient printing and pharmacy scanning.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
