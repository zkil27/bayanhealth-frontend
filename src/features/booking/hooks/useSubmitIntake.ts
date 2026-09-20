import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";

import {
  savePatientIntakeStep,
  submitPatientIntake,
  type IntakeForm,
} from "../lib/api/patientIntake";
import type { IntakeStep } from "../lib/api/intake";
import { mapIntakeFormToSections } from "../lib/intakeMapper";
import type { DynamicIntakeFormValues } from "../schemas/intakeSchema";

/**
 * Authenticated booking-intake persistence for the wizard's intake step.
 *
 * The patient-facing form has three sections that do not line up one-to-one with
 * the narrower contract model, so each form section is mapped to the contract
 * step it primarily feeds:
 *
 *   personalDetails -> `details` (history + allergies)
 *   requestDetails  -> `purpose` (chief complaint)
 *   additionalInfo  -> `review`  (consent)
 *
 * Because {@link mapIntakeFormToSections} folds fields across sections, every
 * step is re-saved immediately before submission — that is what guarantees the
 * server sees a complete form even if the patient edited an earlier section
 * after passing it.
 */

/** Which contract step a given form section is persisted as. */
const STEP_BY_FORM_SECTION: Record<keyof DynamicIntakeFormValues, IntakeStep> = {
  personalDetails: "details",
  requestDetails: "purpose",
  additionalInfo: "review",
};

/** Resolve the contract step a form section maps to. */
export function intakeStepForFormSection(
  section: keyof DynamicIntakeFormValues,
): IntakeStep {
  return STEP_BY_FORM_SECTION[section];
}

/** Four questionnaire-v2 UI pages collapse onto the three transport sections. */
export const QUESTIONNAIRE_V2_TRANSPORT_STEPS = [
  "details",
  "purpose",
  "details",
  "review",
] as const satisfies readonly IntakeStep[];

export type QuestionnaireV2UiStep = 0 | 1 | 2 | 3;

export function questionnaireV2TransportStepForUiStep(
  uiStep: QuestionnaireV2UiStep,
): IntakeStep {
  return QUESTIONNAIRE_V2_TRANSPORT_STEPS[uiStep];
}

export interface SaveQuestionnaireV2StepInput {
  uiStep: QuestionnaireV2UiStep;
  /** Full values are required because v2 replaces the complete transport section. */
  values: DynamicIntakeFormValues;
}

/** Inputs for {@link useSaveIntakeStep}. */
export interface SaveIntakeStepInput {
  section: keyof DynamicIntakeFormValues;
  /** Full current form values; the mapper reads across sections. */
  values: DynamicIntakeFormValues;
}

/** Pull the single section payload for `step` out of the mapped sections. */
function sectionPayloadFor(step: IntakeStep, values: DynamicIntakeFormValues) {
  const sections = mapIntakeFormToSections(values);
  switch (step) {
    case "purpose":
      return sections.purpose;
    case "details":
      return sections.details;
    case "review":
      return sections.review;
  }
}

/**
 * Persist one intake step as the patient advances through the form.
 *
 * Returns a mutation so the caller can block navigation and surface the real
 * error (409 already submitted, 422 invalid payload) instead of losing the save
 * silently.
 */
export function useSaveIntakeStep(bookingId: string) {
  const idToken = useIdToken();

  return useMutation<IntakeForm, Error, SaveIntakeStepInput>({
    mutationFn: ({ section, values }) => {
      const step = intakeStepForFormSection(section);
      return savePatientIntakeStep(
        idToken ?? "",
        bookingId,
        step,
        sectionPayloadFor(step, values),
      );
    },
  });
}

/**
 * Save all three intake steps and submit the form.
 *
 * On success the booking's intake is `submitted`, which is what lets the wizard
 * advance off the intake step — so both the booking and the intake queries are
 * invalidated rather than patched locally.
 */
export function useSubmitIntake(bookingId: string) {
  const queryClient = useQueryClient();
  const idToken = useIdToken();

  return useMutation<IntakeForm, Error, DynamicIntakeFormValues>({
    mutationFn: async (values) => {
      const token = idToken ?? "";
      const sections = mapIntakeFormToSections(values);
      await savePatientIntakeStep(token, bookingId, "purpose", sections.purpose);
      await savePatientIntakeStep(token, bookingId, "details", sections.details);
      await savePatientIntakeStep(token, bookingId, "review", sections.review);
      return submitPatientIntake(token, bookingId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({
        queryKey: ["booking-intake", bookingId],
      });
    },
  });
}

/** Effective revision for a legacy form being promoted to questionnaire v2. */
export function effectiveIntakeRevision(form: IntakeForm | null | undefined): number {
  return form?.revision ?? 0;
}

async function saveQuestionnaireV2Step(
  token: string,
  bookingId: string,
  input: SaveQuestionnaireV2StepInput,
  expectedRevision: number,
): Promise<IntakeForm> {
  const step = questionnaireV2TransportStepForUiStep(input.uiStep);
  return savePatientIntakeStep(
    token,
    bookingId,
    step,
    sectionPayloadFor(step, input.values),
    { questionnaireVersion: 2, expectedRevision },
  );
}

/**
 * Revision-aware persistence API for the upcoming authenticated questionnaire.
 *
 * The UI has four visual steps and passes its zero-based step index; this hook
 * collapses them onto purpose/details/review. Every v2 save is a full mapped
 * section replacement and advances the revision held by the hook.
 */
export function useQuestionnaireV2Intake(
  bookingId: string,
  serverForm?: IntakeForm | null,
) {
  const queryClient = useQueryClient();
  const idToken = useIdToken();
  const [revision, setRevision] = useState(() => effectiveIntakeRevision(serverForm));
  const revisionRef = useRef(revision);

  useEffect(() => {
    const nextRevision = effectiveIntakeRevision(serverForm);
    revisionRef.current = nextRevision;
    // The server form is an external revision source and may arrive after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevision(nextRevision);
  }, [bookingId, serverForm]);

  const recordRevision = (form: IntakeForm, fallback: number) => {
    const nextRevision = form.revision ?? fallback;
    revisionRef.current = nextRevision;
    setRevision(nextRevision);
    return form;
  };

  const saveStep = useMutation<IntakeForm, Error, SaveQuestionnaireV2StepInput>({
    mutationFn: async (input) => {
      const expectedRevision = revisionRef.current;
      const form = await saveQuestionnaireV2Step(
        idToken ?? "",
        bookingId,
        input,
        expectedRevision,
      );
      return recordRevision(form, expectedRevision + 1);
    },
  });

  const submit = useMutation<IntakeForm, Error, DynamicIntakeFormValues>({
    mutationFn: async (values) => {
      const token = idToken ?? "";
      const sections = mapIntakeFormToSections(values);
      let expectedRevision = revisionRef.current;
      for (const [step, data] of [
        ["purpose", sections.purpose],
        ["details", sections.details],
        ["review", sections.review],
      ] as const) {
        const saved = await savePatientIntakeStep(token, bookingId, step, data, {
          questionnaireVersion: 2,
          expectedRevision,
        });
        expectedRevision = saved.revision ?? expectedRevision + 1;
        recordRevision(saved, expectedRevision);
      }
      return submitPatientIntake(token, bookingId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({
        queryKey: ["booking-intake", bookingId],
      });
    },
  });

  return { revision, saveStep, submit };
}
