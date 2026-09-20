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
      <DrawerTrigger>
        <div className="fixed right-4 bottom-0 left-4 cursor-pointer">
          <div className="mx-auto max-w-md rounded-t-xl border bg-secondary px-2 py-1 shadow-lg">
            <div className="flex items-center justify-between text-xs text-secondary-foreground">
              <span className="flex items-center gap-1">
                <FileWarning className="size-4" />
                {isHydrating ? "Loading documents…" : `${pending.length} item${pending.length === 1 ? "" : "s"} pending signature`}
              </span>
              <ChevronUp className="text-muted-foreground" />
            </div>
          </div>
        </div>
      </DrawerTrigger>

      <DrawerContent data-vaul-no-drag>
        <DrawerClose className="fixed top-0 right-0 p-4" aria-label="Close review and sign">
          <X />
        </DrawerClose>
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-center gap-1"><Pen className="size-5" />Review &amp; Sign</DrawerTitle>
        </DrawerHeader>
        <div className="flex gap-4 p-4">
          <div className="flex w-full flex-col gap-2">
            {rows.map((row) => {
              const Icon = row.icon;
              const exists = row.document.document !== null;
              const busy = row.document.status === "finalizing";
              return (
                <div key={row.type} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1 font-medium"><Icon className="size-4" />{row.label}</div>
                      {row.description ? <div className="text-sm text-muted-foreground">{row.description}</div> : null}
                    </div>
                    {row.document.isFinalized ? (
                      <span className="text-sm text-status-completed-foreground">Finalized</span>
                    ) : exists ? (
                      <Button type="button" size="sm" disabled={!canFinalize || busy} onClick={() => void finalizeRow(row)}>
                        {busy ? "Finalizing…" : `Finalize ${row.label}`}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not authored</span>
                    )}
                  </div>
                  {results[row.type] ? (
                    <p className={results[row.type].startsWith("Finalized") ? "mt-2 text-xs text-status-completed-foreground" : "mt-2 text-xs text-destructive"}>
                      {results[row.type]}
                    </p>
                  ) : row.document.error ? (
                    <p className="mt-2 text-xs text-destructive">{row.document.error.message}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="w-full space-y-4 rounded-lg border p-4">
            <div className="font-medium">Electronic Signature</div>
            <label htmlFor="signer-name" className="text-sm font-medium">Signer Name</label>
            <input
              id="signer-name"
              type="text"
              placeholder="Full legal name"
              className="w-full rounded-md border bg-background p-2"
              value={signerName}
              maxLength={120}
              onChange={(event) => setSignerName(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <input id="reviewed" type="checkbox" checked={reviewedChecked} onChange={(event) => setReviewedChecked(event.target.checked)} />
              <label htmlFor="reviewed" className="text-sm">I have reviewed every document I am finalizing</label>
            </div>
            <SignaturePadDialog onSave={setStrokes} />
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="flex items-center gap-1 font-medium"><Scale className="size-5" />Legal Disclaimer</p>
              <p className="text-xs text-muted-foreground">Finalizing applies this electronic signature and immediately releases that document to the patient.</p>
            </div>
          </div>
        </div>
        <DrawerFooter>
          {!validConsultationId ? <p className="text-sm text-destructive">Open a valid consultation before signing documents.</p> : null}
          {!isHydrating && pending.length === 0 ? <p className="text-sm text-muted-foreground">No authored drafts are waiting for signature.</p> : null}
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!canFinalize || pending.length === 0 || isFinalizingAll}
            onClick={() => void handleFinalizeRemaining()}
          >
            {isFinalizingAll ? "Finalizing documents…" : "Finalize remaining documents"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Documents finalize independently; any failure is shown beside that document.</p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
