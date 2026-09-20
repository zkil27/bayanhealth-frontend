import type { PrescriptionData } from "@/features/doctor/types/prescription.types";
import type { ConsultationDocument } from "../../lib/api/consultationDocuments";
import type {
  Medication,
  Patient,
  Physician,
} from "../../types/consultationDocuments.types";

export const MEDICATIONS_PER_A4_PAGE = 4;

export interface PrescriptionPreviewData {
  medications: Medication[];
  patient?: Partial<Patient>;
  physician?: Partial<Physician>;
  validityDays?: number;
  notes?: string;
  verificationCode?: string;
  signature?: {
    physicianName: string;
    signedAt?: string;
  };
}

export function toA4Medication(prescription: PrescriptionData): Medication {
  return {
    genericName: prescription.genericName,
    brandName: prescription.brandName || undefined,
    strength: prescription.strength,
    quantity: prescription.dispenseAmount,
    unit: prescription.form,
    instructions: prescription.instruction,
  };
}

export function groupMedicationsForA4(
  medications: readonly Medication[],
  pageSize = MEDICATIONS_PER_A4_PAGE,
): Medication[][] {
  const groups: Medication[][] = [];
  for (let index = 0; index < medications.length; index += pageSize) {
    groups.push(medications.slice(index, index + pageSize));
  }
  return groups.length > 0 ? groups : [[]];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asPreviewPatient(value: unknown): Partial<Patient> | undefined {
  const patient = asRecord(value);
  if (!patient) return undefined;
  return {
    name: typeof patient.name === "string" ? patient.name : undefined,
    age: typeof patient.age === "number" ? patient.age : undefined,
    sex:
      patient.sex === "Male" || patient.sex === "Female"
        ? patient.sex
        : undefined,
    address: typeof patient.address === "string" ? patient.address : undefined,
  };
}

function asPreviewPhysician(value: unknown): Partial<Physician> | undefined {
  const physician = asRecord(value);
  if (!physician) return undefined;
  return {
    name: typeof physician.name === "string" ? physician.name : undefined,
    title: typeof physician.title === "string" ? physician.title : undefined,
    specialty:
      typeof physician.specialty === "string" ? physician.specialty : undefined,
    licenseNumber:
      typeof physician.licenseNumber === "string"
        ? physician.licenseNumber
        : undefined,
    ptrNumber:
      typeof physician.ptrNumber === "string" ? physician.ptrNumber : undefined,
    s2Number:
      typeof physician.s2Number === "string" ? physician.s2Number : undefined,
  };
}

export function createPrescriptionPreviewData(
  content: Record<string, unknown>,
  document: ConsultationDocument | null,
  medications: readonly PrescriptionData[],
): PrescriptionPreviewData {
  const finalized = document?.status === "finalized";
  return {
    medications: medications.map(toA4Medication),
    patient: asPreviewPatient(content.patient),
    physician: asPreviewPhysician(content.physician),
    validityDays:
      typeof content.validityDays === "number"
        ? content.validityDays
        : undefined,
    notes: typeof content.notes === "string" ? content.notes : undefined,
    verificationCode: finalized ? document.verificationCode : undefined,
    signature:
      finalized && document.signature
        ? {
            physicianName: document.signature.signerName,
            signedAt: document.signature.signedAt,
          }
        : undefined,
  };
}
