"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useConsultationDocument } from "../../hooks/useConsultationDocument";
import { AssessmentTextEditor } from "./AssessmentTextEditor";
import { SOAPTextEditor } from "./SOAPTextEditor";

export function SOAPContext({ consultationId }: { consultationId?: string }) {
  const document = useConsultationDocument({
    consultationId: consultationId ?? "",
    documentType: "soap_note",
    initialTitle: "SOAP Notes",
  });
  const read = (section: string) =>
    typeof document.content[section] === "string" ? document.content[section] : "";
  const write = (section: string, value: string) =>
    document.setContent({ ...document.content, [section]: value });
  const busy = document.status === "saving" || document.isHydrating;

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl ">
      <div className="flex w-full items-center justify-between gap-1">
        <span className="text-lg font-bold"><span className="font-bold text-primary text-xl">SOAP</span> Context</span>
        <Kbd className="text-[10px] font-semibold">⌘ Keyboard shortcut enabled</Kbd>
      </div>
      <SOAPTextEditor title="subjective" value={read("subjective")} onChange={(v) => write("subjective", v)} />
      <SOAPTextEditor title="objective" value={read("objective")} onChange={(v) => write("objective", v)} />
      <AssessmentTextEditor value={read("assessment")} onChange={(v) => write("assessment", v)} />
      <SOAPTextEditor title="plan" value={read("plan")} onChange={(v) => write("plan", v)} />
      {consultationId && !document.isFinalized ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void document.save()}>
          <Save className="size-4" />{busy ? "Loading…" : "Save SOAP draft"}
        </Button>
      ) : null}
      {document.error ? <p className="text-sm text-destructive">{document.error.message}</p> : null}
    </div>
  );
}
