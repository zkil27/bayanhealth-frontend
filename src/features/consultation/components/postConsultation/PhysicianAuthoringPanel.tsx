"use client";

import { useState } from "react";
import { AlertCircle, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CdsProtectedArtifactPayload,
  CdsProtectedOutputType,
} from "@/types/cds-contract";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import { listMissing, missingRequiredFields } from "../../lib/requiredFields";
import { DocumentSheetModal } from "../documents/DocumentSheetModal";
import { ArtifactPayloadEditor } from "./ArtifactPayloadEditor";
import { OUTPUT_LABELS } from "./workspacePhase";

/**
 * Patient documents first, then the internal Plan. The ICD-10 code is not a
 * document: it is confirmed with the Assessment (ADR-20261006-02).
 */
export const AUTHORABLE_TYPES: readonly CdsProtectedOutputType[] = [
  "prescription", "medical_certificate", "diagnostic_request", "clinical_referral",
  "patient_education", "plan",
];

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * The empty document the physician starts from. Nothing clinical is
 * pre-filled; the only defaults are structural (one row to type into, today's
 * date for a certificate, "routine"), and the server validates the result.
 */
export function blankPayload(outputType: CdsProtectedOutputType): CdsProtectedArtifactPayload {
  switch (outputType) {
    case "plan":
      return { summary: "", goals: [""], interventions: [""], followUp: "" };
    case "prescription":
      return { medications: [{ genericName: "", dose: "", route: "", frequency: "", duration: "", instructions: "" }] };
    case "final_icd":
      return { system: "ICD-10", code: "", description: "" };
    case "medical_certificate":
      return { statement: "", validFrom: isoDate(), validThrough: isoDate() };
    case "diagnostic_request":
      return { modality: "lab", items: [{ testName: "", rationale: "", priority: "routine" }] };
    case "clinical_referral":
      return { reasonForReferral: "", urgency: "routine", clinicalSummary: "" };
    case "patient_education":
      return { title: "", language: "english", sections: [{ heading: "", content: "" }], warningSigns: [""] };
  }
}

/**
 * "Write it myself": one document, with no AI (ADR-20261005-01).
 *
 * Was a separate "Write a document yourself" card with its own row of
 * "+ Prescription" chips, sitting directly above the deck's own "+ Prescription"
 * chips (which drafted with AI) and an "Add Document" menu. Three entry points,
 * two of them labelled identically. It now opens inside the document
 * checklist, in the row for the document being written, so there is one place
 * to start any document and the choice between AI and writing it yourself is
 * made side by side.
 */
export function PhysicianAuthoringForm({
  outputType,
  busy,
  onSave,
  onCancel,
  preview,
}: {
  outputType: CdsProtectedOutputType;
  busy: boolean;
  /** Resolves once saved; rejects to keep the editor open with the text intact. */
  onSave: (outputType: CdsProtectedOutputType, payload: CdsProtectedArtifactPayload) => Promise<void>;
  onCancel: () => void;
  /** Patient and doctor details for the unsaved preview, so it reads as it will print. */
  preview?: {
    intake?: BookingIntakeForm | null;
    doctorName?: string;
    doctorLicenseNumber?: string;
    doctorSpecialty?: string;
  };
}) {
  const [payload, setPayload] = useState<CdsProtectedArtifactPayload>(() => blankPayload(outputType));
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Only shown after a Save attempt, then kept live so it clears as fields fill.
  const [showMissing, setShowMissing] = useState(false);
  const label = OUTPUT_LABELS[outputType];
  const missing = missingRequiredFields(outputType, payload);

  const save = async () => {
    // Named here rather than by the server's 422 (clinical remarks Nov 16).
    if (missing.length > 0) {
      setShowMissing(true);
      return;
    }
    setSaving(true);
    try {
      await onSave(outputType, payload);
    } catch {
      // The caller reports the error; the physician's text stays in the editor.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-slot="physician-authoring" className="flex flex-col gap-4">
      <p className="text-sm text-(--text-muted)">
        Your own {label.toLowerCase()}, no AI involved. Save it, then review and sign it like any other document.
      </p>
      <ArtifactPayloadEditor
        outputType={outputType}
        payload={payload}
        onChange={setPayload}
        disabled={saving}
      />
      {showMissing && missing.length > 0 ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-(--danger-fg)/30 bg-(--danger-bg) p-3 text-sm text-(--danger-fg)"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Fill in {listMissing(missing)}</strong> before saving. Every field
            without &ldquo;(optional)&rdquo; prints on the {label.toLowerCase()}.
          </span>
        </p>
      ) : null}
      {/* Pinned under the thumb on a phone; steps aside while the keyboard is up. */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-(--border-subtle) bg-(--surface-card) pt-3 max-lg:sticky max-lg:bottom-0 max-lg:z-20 max-lg:-mx-4 max-lg:px-4 sm:max-lg:-mx-5 sm:max-lg:px-5 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-lg:group-has-[textarea:focus]/ws:hidden max-lg:group-has-[input:focus]/ws:hidden">
        <Button type="button" variant="ghost" shape="pill" className="h-11 lg:h-9 max-sm:flex-1" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        {/* Make → Preview → Sign → Release: see it as the patient will before saving. */}
        <Button
          type="button"
          variant="outline"
          shape="pill"
          className="h-11 border-(--border-default) lg:h-9 max-sm:flex-1"
          disabled={saving}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="size-4" /> Preview
        </Button>
        <Button
          type="button"
          variant="primary"
          shape="pill"
          className="h-11 px-5 lg:h-9 max-sm:flex-[2]"
          disabled={busy || saving}
          onClick={() => void save()}
        >
          {saving ? <Spinner className="size-4" /> : null}
          Save {label.toLowerCase()}
        </Button>
      </div>
      <DocumentSheetModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        artifact={{
          artifactId: "unsaved-preview",
          consultationId: "",
          outputType,
          lifecycleStatus: "generated",
          payload,
        }}
        intake={preview?.intake}
        doctorName={preview?.doctorName}
        doctorLicenseNumber={preview?.doctorLicenseNumber}
        doctorSpecialty={preview?.doctorSpecialty}
      />
    </div>
  );
}
