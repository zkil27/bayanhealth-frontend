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
  const doctorName = physician?.name || "Attending Physician";
  const doctorTitle = physician?.title || "Licensed Physician";
  const prcNumber = physician?.licenseNumber || "—";
  const ptrNumber = physician?.ptrNumber || "—";
  const signedAt = physician?.signedAt || (physician?.signatureStrokes ? "Digital signature on file" : "—");

  const qrValue = verification?.qrValue || "https://bayanhealth.ph";
  const docId = verification?.documentId || "—";
  const statusLabel = verification?.status || "VALID";
  const validUntil = verification?.validUntil;

  return (
    <footer className={cn("mt-6 flex flex-col select-text", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end pt-2">
        {/* Left Column: Physician Info & Signature */}
        <div className="flex flex-col text-xs leading-normal">
          <span className="text-xs font-bold tracking-wider text-(--navy-700) uppercase mb-1">
            {physicianRoleLabel}
          </span>
          <p className="font-bold text-sm text-(--navy-700)">{doctorName}</p>
          <p className="text-slate-600 italic text-[11px] mb-1">{doctorTitle}</p>
          <p className="text-slate-700 text-[11px]">
            PRC License No.: <span className="font-mono">{prcNumber}</span>
          </p>
          <p className="text-slate-700 text-[11px] mb-2">
            PTR No.: <span className="font-mono">{ptrNumber}</span>
          </p>

          {/* Signature Specimen & Baseline */}
          {physician?.signatureStrokes && physician.signatureStrokes.length > 0 ? (
            <>
              <div className="w-56 pb-0.5 border-b border-(--navy-700)/40 mb-1">
                <SignaturePreview strokes={physician.signatureStrokes} className="h-9" />
              </div>
              <span className="text-[10px] text-slate-500">Digital signature applied</span>
              {signedAt !== "—" ? <span className="text-[10px] text-slate-500">{signedAt}</span> : null}
            </>
          ) : (
            <>
              <div className="w-56 pb-0.5 border-b border-(--navy-700)/40 mb-1 min-h-[36px] flex items-end">
                {doctorName !== "Attending Physician" && doctorName !== "—" ? (
                  <span className="font-serif italic text-xl text-blue-800 tracking-wide block py-0.5">
                    {doctorName.replace(/^Dr\.\s*/i, "")}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Signature pending attestation</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">Digital signature applied upon attestation</span>
            </>
          )}
        </div>

        {/* Right Column: Verification Box */}
        <div className="flex justify-start sm:justify-end">
          <div className="flex flex-col rounded-2xl border border-(--teal-700) bg-white p-3 w-full sm:w-[270px]">
            <span className="text-[11px] font-bold tracking-wider text-(--navy-700) uppercase text-center mb-2">
              {verificationTitle}
            </span>
            <div className="flex items-center gap-3">
              <div className="shrink-0 p-0.5">
                <QRCodeSVG value={qrValue} size={70} level="M" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase w-fit",
                    statusLabel === "DRAFT" || statusLabel === "SAMPLE"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-(--teal-800) text-white",
                  )}
                >
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
