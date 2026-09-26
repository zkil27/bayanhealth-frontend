"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignaturePreview } from "../postConsultation/SignaturePreview";
import type { DocumentPhysicianInfo, DocumentVerificationInfo } from "./types";

interface DocumentSheetFooterProps {
  physician?: DocumentPhysicianInfo;
  verification?: DocumentVerificationInfo;
  legalDisclaimer?: string;
  className?: string;
  physicianRoleLabel?: string;
  verificationTitle?: string;
}

export function DocumentSheetFooter({
  physician,
  verification,
  legalDisclaimer,
  className,
  physicianRoleLabel = "PHYSICIAN INFORMATION",
  verificationTitle = "VERIFICATION",
}: DocumentSheetFooterProps) {
  const doctorName = physician?.name || "Dr. Andrea M. Santos, MD";
  const doctorTitle = physician?.title || "General Practitioner";
  const prcNumber = physician?.licenseNumber || "SAMPLE-0000000";
  const ptrNumber = physician?.ptrNumber || "SAMPLE-0000000";
  const signedAt = physician?.signedAt || new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const qrValue = verification?.qrValue || "https://bayanhealth.ph/verify/sample";
  const docId = verification?.documentId || "BH-25-05-20-10245";
  const statusLabel = verification?.status || "VALID";

  return (
    <footer className={cn("mt-6 flex flex-col gap-4 border-t border-[#074972]/20 pt-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        {/* Physician Info & Signature */}
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-[10px] font-bold tracking-wider text-[#074972] uppercase">
            {physicianRoleLabel}
          </span>
          <p className="font-bold text-sm text-slate-900">{doctorName}</p>
          <p className="text-slate-600">{doctorTitle}</p>
          <p className="text-slate-600 font-mono text-[11px]">
            PRC License No.: {prcNumber}
          </p>
          <p className="text-slate-600 font-mono text-[11px]">
            PTR No.: {ptrNumber}
          </p>

          <div className="mt-2 border-b border-slate-300 pb-1 w-48">
            {physician?.signatureStrokes && physician.signatureStrokes.length > 0 ? (
              <SignaturePreview strokes={physician.signatureStrokes} className="h-8" />
            ) : (
              <span className="font-serif italic text-lg text-slate-800 tracking-wide">
                {doctorName.replace(/^Dr\.\s*/i, "")}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">Digital signature applied</span>
          <span className="text-[10px] text-slate-500">Signed: {signedAt}</span>
        </div>

        {/* Verification QR Block */}
        <div className="flex justify-start sm:justify-end">
          <div className="flex flex-col gap-1.5 rounded-xl border border-teal-600/30 bg-teal-50/20 p-3 sm:w-64">
            <span className="text-[10px] font-bold tracking-wider text-teal-900 uppercase">
              {verificationTitle}
            </span>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-teal-600/20 bg-white p-1.5 shrink-0 shadow-2xs">
                <QRCodeSVG value={qrValue} size={64} level="M" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase w-fit">
                  <CheckCircle2 className="size-3" />
                  {statusLabel}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Document ID:</span>
                <span className="font-mono text-xs font-bold text-slate-900 truncate">
                  {docId}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center sm:text-left mt-0.5">
              Scan QR to verify authenticity
            </p>
          </div>
        </div>
      </div>

      {legalDisclaimer ? (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500 border-t border-slate-200 pt-2">
          {legalDisclaimer}
        </p>
      ) : null}
    </footer>
  );
}
