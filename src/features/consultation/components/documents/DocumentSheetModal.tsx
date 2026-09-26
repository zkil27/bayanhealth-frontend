"use client";

import { Printer, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
import { ClinicalDocumentSheet } from "./ClinicalDocumentSheet";
import type { ClinicalDocumentArtifact } from "./types";
import { OUTPUT_LABELS } from "../postConsultation/workspacePhase";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6 bg-slate-200/70 border border-slate-300 shadow-2xl">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
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
                  z-index: 999999 !important;
                }
                #printable-document-sheet > article {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 10mm !important;
                  max-width: 100% !important;
                }
              }
            `,
          }}
        />

        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-[#074972] text-white">
                <Eye className="size-3.5" />
              </span>
              <DialogTitle className="text-base font-bold text-[#074972]">
                Official Patient Document Preview · {docTitle}
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Exact authentic clinical paper format provided to the patient and external pharmacies/clinics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 rounded-full border-slate-400 bg-white hover:bg-slate-50 text-[#074972] font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Paper Document Preview Canvas */}
        <div id="printable-document-sheet" className="py-4 flex justify-center w-full">
          <ClinicalDocumentSheet
            artifact={artifact}
            intake={intake}
            specimen={specimen}
            doctorName={doctorName}
            className="shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-slate-300"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
