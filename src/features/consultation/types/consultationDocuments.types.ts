export interface Patient {
  name: string;
  age: number;
  sex: 'Male' | 'Female';
  address: string;
  company?: string;
  patientId?: string;
}

export interface Physician {
  name: string;
  title: string;
  specialty: string;
  licenseNumber: string;
  ptrNumber?: string;
  s2Number?: string;
}

export interface Medication {
  genericName: string;
  brandName?: string;
  strength: string;
  quantity: number;
  unit: string;
  instructions: string;
  instructionsTagalog?: string;
}

export interface BlockchainVerification {
  hash: string;
  timestamp: string;
  status: 'VALID' | 'PENDING' | 'INVALID';
}

export interface DigitalSignature {
  physicianName: string;
  date: string;
  time: string;
  digitalSignature?: string;
}

export interface MedicalCertificateContent {
  patient: Patient;
  consultationDate: string;
  retrospectivePeriod: {
    start: string;
    end: string;
  };
  diagnosis: string;
  clinicalNotes: string;
  recommendation: string;
  physician: Physician;
  blockchain: BlockchainVerification;
  signature: DigitalSignature;
  verificationPin?: string;
}

export interface PrescriptionContent {
  patient: Patient;
  physician: Physician;
  medications: Medication[];
  validityDays: number;
  securityPin: string;
  qrCodeData: string;
  signatures: {
    physician: {
      name: string;
      signed: boolean;
      date?: string;
    };
    patient?: {
      name: string;
      patientId: string;
    };
  };
  notes?: string;
}

export type DocumentType = 'prescription' | 'medical_certificate';

export interface ConsultationDocument {
  documentId: string;
  consultationId: string;
  documentType: DocumentType;
  title: string;
  content: PrescriptionContent | MedicalCertificateContent;
  status: 'draft' | 'saved' | 'finalized' | 'voided';
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}