"use client";

import { useState } from "react";
import { BadgeCheck, ChevronUp, File, FileWarning, Microscope, Pen, PillBottle, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useConsultationDocument, type UseConsultationDocument } from "../../hooks/useConsultationDocument";
import type { ConsultationDocumentType, ElectronicSignatureRequest, SignaturePoint } from "../../lib/api/consultationDocuments";
import { SignaturePadDialog } from "./SignatureField";

interface SignatureDrawerProps { consultationId: string }
interface DocumentRowSpec {
  type: ConsultationDocumentType;
  label: string;
  description?: string;
  icon: typeof File;
  document: UseConsultationDocument;
}

export function SignatureDrawer({ consultationId }: SignatureDrawerProps) {
  const [signerName, setSignerName] = useState("");
  const [reviewedChecked, setReviewedChecked] = useState(false);
  const [strokes, setStrokes] = useState<SignaturePoint[][]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [isFinalizingAll, setIsFinalizingAll] = useState(false);
  const validConsultationId = /^con_[a-z0-9]+$/.test(consultationId);

  const soap = useConsultationDocument({ consultationId, documentType: "soap_note", initialTitle: "SOAP Notes" });
  const prescription = useConsultationDocument({ consultationId, documentType: "prescription", initialTitle: "Prescription" });
  const certificate = useConsultationDocument({ consultationId, documentType: "medical_certificate", initialTitle: "Medical Certificate" });
  const request = useConsultationDocument({ consultationId, documentType: "lab_request", initialTitle: "Lab/Imaging Request" });

  const rows: DocumentRowSpec[] = [
    { type: "soap_note", label: "SOAP Notes", description: "Subjective, Objective, Assessment, Plan", icon: File, document: soap },
    { type: "prescription", label: "Prescription", icon: PillBottle, document: prescription },
    { type: "medical_certificate", label: "Medical Certificate", icon: BadgeCheck, document: certificate },
    { type: "lab_request", label: "Lab/Imaging Request", icon: Microscope, document: request },
  ];
  const signature: ElectronicSignatureRequest | null =
    signerName.trim() && reviewedChecked && strokes.length > 0
      ? { signerName: signerName.trim(), acknowledged: true, strokes }
      : null;
  const pending = rows.filter((row) => row.document.document && !row.document.isFinalized);
  const isHydrating = rows.some((row) => row.document.isHydrating);
  const canFinalize = validConsultationId && signature !== null && !isHydrating;

  async function finalizeRow(row: DocumentRowSpec): Promise<boolean> {
    if (!signature || !row.document.document || row.document.isFinalized) return false;
    setResults((current) => ({ ...current, [row.type]: "Finalizing…" }));
    const result = await row.document.finalize(signature);
    setResults((current) => ({
      ...current,
      [row.type]: result.ok
        ? "Finalized and released to the patient."
        : result.error?.message ?? "Finalization failed. Your draft was not changed.",
    }));
    return result.ok;
  }

  async function handleFinalizeRemaining() {
    if (!canFinalize || pending.length === 0 || isFinalizingAll) return;
    setIsFinalizingAll(true);
    for (const row of pending) await finalizeRow(row);
    setIsFinalizingAll(false);
  }

  return (
    <Drawer>
      <DrawerTrigger
        render={
          <button
            type="button"
            className="fixed right-4 bottom-0 left-4 z-30 cursor-pointer outline-none"
            aria-label="Pending signatures"
          >
            <div className="mx-auto max-w-md rounded-t-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 shadow-lg transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-xs text-(--text-heading)">
                <span className="flex items-center gap-1.5 font-medium">
                  <FileWarning className="size-4 text-(--status-soon-fg)" />
                  {isHydrating ? "Loading documents…" : `${pending.length} item${pending.length === 1 ? "" : "s"} pending signature`}
                </span>
                <ChevronUp className="size-4 text-(--text-muted)" />
              </div>
            </div>
          </button>
        }
      />

      <DrawerContent data-vaul-no-drag className="mx-auto w-full max-w-4xl rounded-t-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) shadow-2xl">
        <DrawerHeader className="border-b border-(--border-subtle) bg-(--surface-warm) px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-(--teal-700)/20 bg-(--teal-700)/10 text-(--teal-700)">
                <Pen className="size-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-(--teal-700) uppercase">
                  Clinical Attestation
                </span>
                <DrawerTitle className="text-base font-bold text-(--text-heading)">Review &amp; Sign Documents</DrawerTitle>
              </div>
            </div>
            <DrawerClose
              render={
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-lg text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </div>
        </DrawerHeader>
        <div className="flex flex-col md:flex-row gap-4 p-5 max-h-[65dvh] overflow-y-auto overscroll-contain">
          <div className="flex w-full flex-col gap-2">
            {rows.map((row) => {
              const Icon = row.icon;
              const exists = row.document.document !== null;
              const busy = row.document.status === "finalizing";
              return (
                <div key={row.type} className="rounded-xl border border-(--border-subtle) bg-(--surface-warm)/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-(--text-heading)">
                        <Icon className="size-4 text-(--teal-700)" />
                        {row.label}
                      </div>
                      {row.description ? <div className="text-xs text-(--text-muted) mt-0.5">{row.description}</div> : null}
                    </div>
                    {row.document.isFinalized ? (
                      <span className="rounded-md bg-(--status-available-bg) px-2 py-0.5 text-xs font-semibold text-(--status-available-fg)">
                        Finalized
                      </span>
                    ) : exists ? (
                      <Button type="button" variant="primary" size="sm" className="h-8 text-xs font-semibold" disabled={!canFinalize || busy} onClick={() => void finalizeRow(row)}>
                        {busy ? "Finalizing…" : `Finalize ${row.label}`}
                      </Button>
                    ) : (
                      <span className="text-xs text-(--text-subtle)">Not authored</span>
                    )}
                  </div>
                  {results[row.type] ? (
                    <p className={results[row.type].startsWith("Finalized") ? "mt-2 text-xs font-medium text-(--status-available-fg)" : "mt-2 text-xs text-(--danger-fg)"}>
                      {results[row.type]}
                    </p>
                  ) : row.document.error ? (
                    <p className="mt-2 text-xs text-(--danger-fg)">{row.document.error.message}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="w-full space-y-4 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-4">
            <div className="text-sm font-bold text-(--text-heading)">Electronic Signature</div>
            <div className="space-y-1">
              <label htmlFor="signer-name" className="text-xs font-semibold text-(--text-heading)">Signer Name</label>
              <input
                id="signer-name"
                type="text"
                placeholder="Full legal name"
                className="w-full rounded-lg border border-(--border-subtle) bg-(--surface-card) px-3 py-2 text-sm text-(--text-body) outline-none focus:border-(--action-primary)"
                value={signerName}
                maxLength={120}
                onChange={(event) => setSignerName(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input id="reviewed" type="checkbox" checked={reviewedChecked} onChange={(event) => setReviewedChecked(event.target.checked)} className="size-4 accent-(--teal-700) rounded" />
              <label htmlFor="reviewed" className="text-xs text-(--text-body)">I have reviewed every document I am finalizing</label>
            </div>
            <SignaturePadDialog onSave={setStrokes} />
            <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/60 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-(--text-heading)"><Scale className="size-4 text-(--teal-700)" />Legal Disclaimer</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-(--text-muted)">Finalizing applies this electronic signature and immediately releases that document to the patient record.</p>
            </div>
          </div>
        </div>
        <DrawerFooter className="border-t border-(--border-subtle) bg-(--surface-warm) px-5 py-4">
          {!validConsultationId ? <p className="text-xs font-semibold text-(--danger-fg)">Open a valid consultation before signing documents.</p> : null}
          {!isHydrating && pending.length === 0 ? <p className="text-xs text-(--text-muted)">No authored drafts are waiting for signature.</p> : null}
          <Button
            type="button"
            variant="primary"
            className="w-full h-11 text-sm font-semibold sm:h-9"
            disabled={!canFinalize || pending.length === 0 || isFinalizingAll}
            onClick={() => void handleFinalizeRemaining()}
          >
            {isFinalizingAll ? "Finalizing documents…" : "Finalize remaining documents"}
          </Button>
          <p className="text-center text-[11px] text-(--text-subtle)">Documents finalize independently; any failure is shown beside that document.</p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
