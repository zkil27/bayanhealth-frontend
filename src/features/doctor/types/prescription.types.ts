export type Brand = {
  name: string;
  strength: string[];
  form: string;
}

export type Drug = {
  genericName: string;
  brands: Brand[];
}

export interface PrescriptionData {
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  instruction: string;
  dispenseAmount: number;
  refills: number;
  displayText: string;
}
