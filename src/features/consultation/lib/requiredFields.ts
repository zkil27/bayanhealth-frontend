import type {
  CdsClinicalReferralPayload,
  CdsDiagnosticRequestPayload,
  CdsMedicalCertificatePayload,
  CdsPatientEducationPayload,
  CdsPlanPayload,
  CdsPrescriptionPayload,
  CdsProtectedArtifactPayload,
  CdsProtectedOutputType,
} from "@/types/cds-contract";

import { diagnosticTestValue } from "./diagnosticTest";

/**
 * The fields a physician-written or amended document is still missing, in the
 * order they appear on the form (clinical remarks Nov 16: a Prescription with
 * a blank Instructions box came back as "The server would not accept this
 * action", with nothing saying which box).
 *
 * Mirrors the contract's own minLength-1 rules so the doctor is told before
 * Save rather than by a 422 after it. The server stays the authority; this
 * only names what it would reject.
 */
export function missingRequiredFields(
  outputType: CdsProtectedOutputType,
  payload: CdsProtectedArtifactPayload,
): string[] {
  const blank = (value: string | undefined | null) => !value || !value.trim();
  const missing: string[] = [];

  switch (outputType) {
    case "prescription": {
      const { medications } = payload as CdsPrescriptionPayload;
      const many = medications.length > 1;
      medications.forEach((med, index) => {
        const prefix = many ? `Medication ${index + 1}: ` : "";
        const fields: [string, string][] = [
          ["Generic name", med.genericName],
          ["Dose", med.dose],
          ["Route", med.route],
          ["Frequency", med.frequency],
          ["Duration", med.duration],
          ["Instructions", med.instructions],
        ];
        for (const [label, value] of fields) if (blank(value)) missing.push(`${prefix}${label}`);
      });
      break;
    }
    case "medical_certificate": {
      const cert = payload as CdsMedicalCertificatePayload;
      if (blank(cert.statement)) missing.push("Assessment / Diagnosis");
      break;
    }
    case "diagnostic_request": {
      const request = payload as CdsDiagnosticRequestPayload;
      const many = request.items.length > 1;
      request.items.forEach((item, index) => {
        const prefix = many ? `Item ${index + 1}: ` : "";
        if (blank(diagnosticTestValue(item, request.modality))) missing.push(`${prefix}Test`);
        if (blank(item.rationale)) missing.push(`${prefix}Impression / Diagnosis`);
      });
      break;
    }
    case "clinical_referral": {
      const referral = payload as CdsClinicalReferralPayload;
      if (blank(referral.reasonForReferral)) missing.push("Reason for referral");
      if (blank(referral.clinicalSummary)) missing.push("Clinical summary");
      break;
    }
    case "plan": {
      const plan = payload as CdsPlanPayload;
      if (blank(plan.summary)) missing.push("Clinical summary");
      break;
    }
    case "patient_education": {
      const education = payload as CdsPatientEducationPayload;
      if (blank(education.title)) missing.push("Title");
      break;
    }
    case "final_icd":
      break;
  }
  return missing;
}

/** "Dose, Route and Instructions" — for one sentence under the Save button. */
export function listMissing(fields: string[]): string {
  if (fields.length <= 1) return fields[0] ?? "";
  return `${fields.slice(0, -1).join(", ")} and ${fields[fields.length - 1]}`;
}
