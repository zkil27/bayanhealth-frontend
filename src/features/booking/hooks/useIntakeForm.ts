import { create } from "zustand";
import { userPersonalDetailsSchema } from "@/schemas/userSchema";
import {
  additionalInfoSchema,
  workflowUnionSchema,
} from "../schemas/intakeSchema";
import type { DynamicIntakeFormValues } from "../schemas/intakeSchema";

export type IntakeFormData = DynamicIntakeFormValues;

export interface IntakeStore {
  data: Partial<IntakeFormData>;
  updateSection: <K extends keyof IntakeFormData>(
    sectionId: K,
    sectionData: Partial<IntakeFormData[K]>,
  ) => void;
  setData: (data: Partial<IntakeFormData>) => void;
  clearStore: () => void;
  getCompletionStatus: () => IntakeCompletionStatus;

  validateSection: <K extends keyof IntakeFormData>(sectionId: K) => boolean;

  getValidationErrors: () => {
    personal: unknown;
    service: unknown;
    additional: unknown;
  };
}

/** Section-by-section completion for any set of intake values. */
export interface IntakeCompletionStatus {
  isPersonalComplete: boolean;
  isServiceComplete: boolean;
  isAdditionalComplete: boolean;
  allComplete: boolean;
}

/**
 * Validate each section of an arbitrary set of intake values.
 *
 * Exported as a pure function so callers can evaluate values they already hold —
 * e.g. the review step, which hydrates from the server and must not report the
 * (empty) draft store's completeness.
 */
export function computeCompletionStatus(
  data: Partial<IntakeFormData>,
): IntakeCompletionStatus {
  const isPersonalComplete = userPersonalDetailsSchema.safeParse(
    data.personalDetails,
  ).success;
  const isServiceComplete = workflowUnionSchema.safeParse(
    data.requestDetails,
  ).success;
  const isAdditionalComplete = additionalInfoSchema.safeParse(
    data.additionalInfo,
  ).success;

  return {
    isPersonalComplete,
    isServiceComplete,
    isAdditionalComplete,
    allComplete:
      isPersonalComplete && isServiceComplete && isAdditionalComplete,
  };
}

export const useIntakeStore = create<IntakeStore>()((set, get) => ({
  data: {},

  updateSection: (sectionId, sectionData) => {
    set((state) => ({
      data: {
        ...state.data,
        [sectionId]: {
          ...state.data[sectionId],
          ...sectionData,
        },
      },
    }));
  },

  setData: (data) => set({ data }),

  clearStore: () => {
    set({ data: {} });
  },

  validateSection: (sectionId) => {
    const { data } = get();
    const sectionData = data[sectionId];

    switch (sectionId) {
      case "personalDetails":
        return userPersonalDetailsSchema.safeParse(sectionData).success;
      case "requestDetails":
        return workflowUnionSchema.safeParse(sectionData).success;
      case "additionalInfo":
        return additionalInfoSchema.safeParse(sectionData).success;
      default:
        return false;
    }
  },

  getCompletionStatus: () => computeCompletionStatus(get().data),
  getValidationErrors: () => {
    const { data } = get();

    const personalResult = userPersonalDetailsSchema.safeParse(
      data.personalDetails,
    );
    const serviceResult = workflowUnionSchema.safeParse(
      data.requestDetails,
    );
    const additionalResult = additionalInfoSchema.safeParse(
      data.additionalInfo,
    );

    return {
      personal: !personalResult.success
        ? personalResult.error.format()
        : null,
      service: !serviceResult.success ? serviceResult.error.format() : null,
      additional: !additionalResult.success
        ? additionalResult.error.format()
        : null,
    };
  },
}));
