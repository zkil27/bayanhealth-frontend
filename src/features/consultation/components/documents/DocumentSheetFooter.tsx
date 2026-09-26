"use client";

import { QRCodeSVG } from "qrcode.react";
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
  scanInstruction?: string;
}

export function DocumentSheetFooter({
  physician,
  verification,
  legalDisclaimer,
  className,
  physicianRoleLabel = "PHYSICIAN INFORMATION",
  verificationTitle = "VERIFICATION",
  scanInstruction = "Scan before dispensing",
}: DocumentSheetFooterProps) {
  const doctorName = physician?.name || "Dr. Andrea M. Santos, MD";
  const doctorTitle = physician?.title || "General Practitioner";
  const prcNumber = physician?.licenseNumber || "SAMPLE-0000000";
  const ptrNumber = physician?.ptrNumber || "SAMPLE-0000000";
  const signedAt = physician?.signedAt || "Signed May 20, 2025 10:35 AM";

  const qrValue = verification?.qrValue || "https://bayanhealth.ph/verify/sample";
  const docId = verification?.documentId || "BH-25-05-20-10245";
  const statusLabel = verification?.status || "VALID";
  const validUntil = verification?.validUntil || "June 19, 2025";

  return (
    <footer className={cn("mt-6 flex flex-col select-text", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end pt-2">
        {/* Left Column: Physician Info & Signature */}
        <div className="flex flex-col text-xs leading-normal">
          <span className="text-xs font-bold tracking-wider text-[#074972] uppercase mb-1">
            {physicianRoleLabel}
          </span>
          <p className="font-bold text-sm text-[#074972]">{doctorName}</p>
          <p className="text-slate-600 italic text-[11px] mb-1">{doctorTitle}</p>
          <p className="text-slate-700 text-[11px]">
            PRC License No.: <span className="font-mono">{prcNumber}</span>
          </p>
          <p className="text-slate-700 text-[11px] mb-2">
            PTR No.: <span className="font-mono">{ptrNumber}</span>
          </p>

          {/* Signature Specimen & Baseline */}
          <div className="w-56 pb-0.5 border-b border-[#074972]/40 mb-1">
            {physician?.signatureStrokes && physician.signatureStrokes.length > 0 ? (
              <SignaturePreview strokes={physician.signatureStrokes} className="h-9" />
            ) : (
              <span className="font-serif italic text-xl text-blue-800 tracking-wide block py-0.5">
                {doctorName.replace(/^Dr\.\s*/i, "")}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">Digital signature applied</span>
          <span className="text-[10px] text-slate-500">{signedAt}</span>
        </div>

        {/* Right Column: Verification Box */}
        <div className="flex justify-start sm:justify-end">
          <div className="flex flex-col rounded-2xl border border-[#18a58c] bg-white p-3 w-full sm:w-[270px]">
            <span className="text-[11px] font-bold tracking-wider text-[#074972] uppercase text-center mb-2">
              {verificationTitle}
            </span>
            <div className="flex items-center gap-3">
              <div className="shrink-0 p-0.5">
                <QRCodeSVG value={qrValue} size={70} level="M" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="inline-flex items-center justify-center rounded-md bg-[#005f73] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase w-fit">
                  {statusLabel}
                </span>
                <div className="flex flex-col text-[11px]">
                  <span className="text-[10px] text-slate-500">Document ID:</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] truncate">
                    {docId}
                  </span>
                </div>
                {validUntil ? (
                  <div className="flex flex-col text-[10px]">
                    <span className="text-slate-500">Valid until:</span>
                    <span className="font-semibold text-slate-800">{validUntil}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2 font-medium">
              {scanInstruction}
            </p>
          </div>
        </div>
      </div>

      {/* Legal Footnote */}
      {legalDisclaimer ? (
        <div className="mt-6 border-t border-slate-200 pt-3 text-center">
          <p className="text-[10px] leading-relaxed text-slate-500 max-w-xl mx-auto">
            {legalDisclaimer}
          </p>
        </div>
      ) : null}
    </footer>
  );
}
