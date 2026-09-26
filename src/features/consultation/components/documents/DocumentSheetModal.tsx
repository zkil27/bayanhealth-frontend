"use client";

import { Printer, X } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <DialogTitle className="text-base font-bold text-[#074972]">
              Official Patient Document Preview
            </DialogTitle>
            <p className="text-xs text-slate-500">
              This is the exact authentic format the patient receives upon release.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4">
          <ClinicalDocumentSheet
            artifact={artifact}
            intake={intake}
            specimen={specimen}
            doctorName={doctorName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
