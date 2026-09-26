import type { CdsProtectedArtifact, CdsSignaturePoint } from "@/types/cds-contract";

export type ClinicalDocumentArtifact = Pick<
  CdsProtectedArtifact,
  "artifactId" | "consultationId" | "outputType" | "lifecycleStatus" | "payload"
> & Partial<CdsProtectedArtifact>;

export interface DocumentPatientInfo {
  name: string;
  dateOfBirth?: string;
  age?: number | string;
  sex?: string;
  address?: string;
  allergies?: string;
  caseId?: string;
  consultationDate?: string;
  consultationTime?: string;
  consultationMethod?: string;
}

export interface DocumentPhysicianInfo {
  name: string;
  title?: string;
  specialty?: string;
  licenseNumber?: string;
  ptrNumber?: string;
  s2Number?: string;
  signatureStrokes?: readonly CdsSignaturePoint[][];
  signedAt?: string;
}

export interface DocumentVerificationInfo {
  qrValue: string;
  documentId: string;
  status?: "ACTIVE" | "VALID" | "REQUEST ACTIVE" | "REFERRAL ACTIVE" | "CARE PLAN AVAILABLE" | "SAMPLE";
  validUntil?: string;
}
