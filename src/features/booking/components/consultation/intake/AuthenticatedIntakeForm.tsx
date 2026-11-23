"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Check, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FormProvider,
  type FieldPath,
  type Resolver,
  useForm,
  useWatch,
} from "react-hook-form";

import { PersonDataSection } from "@/components/blocks/profile/PersonDataSection";
import AppButton from "@/components/primitives/AppButton";
import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DrawnCheck } from "@/components/ui/success-mark";
import { useProfile } from "@/hooks/useProfile";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  browserDraftStorage,
  clearIntakeDraft,
  intakeDraftKey,
  isDraftCurrent,
  readIntakeDraft,
  writeIntakeDraft,
} from "@/lib/intakeDraft";
import { useIdToken, useUserId } from "@/stores/useAuthStore";

import {
  effectiveIntakeRevision,
  useQuestionnaireV2Intake,
  type QuestionnaireV2UiStep,
} from "../../../hooks/useSubmitIntake";
import { fetchPatientIntake } from "../../../lib/api/patientIntake";
import { mapSectionsToIntakeForm } from "../../../lib/intakeMapper";
import { allergyWriteBack } from "../../../lib/profileWriteBack";
import {
  dynamicIntakeMasterSchema,
  getDefaultValues,
  type DynamicIntakeFormValues,
} from "../../../schemas/intakeSchema";
import type { Booking } from "../../../types/booking.types";
import { SAVE_ALLERGIES_KEY } from "./AboutYouFields";
import { ConcernSafetyStep, complaintTagLabel } from "./ConcernSafetyStep";
import {
  canEnterStep,
  clampResumeStep,
  concernBlockedReason,
  isSafetyHardStop,
  redFlagFromScreen,
  safetyBlockedReason,
  type IntakeStepKey,
  type RedFlagState,
} from "./intakeGates";
import { IntakeUiStateProvider, type IntakeUiState } from "./intakeUiState";
import { stepDirection, stepEnterClass, type StepDirection } from "./stepDirection";
import { IntakeReceipt } from "../IntakeReceipt";
import { IntakeNavFooter } from "./IntakeNavFooter";
import { MedicalHistoryStep } from "./MedicalHistoryStep";
import { PainAssessmentStep } from "./PainAssessmentStep";
import { conditionLabel } from "./MedicalHistoryStep";
import { ReviewConsentStep } from "./ReviewConsentStep";
import { SafetyCheckStep } from "./SafetyCheckStep";
import { ServiceRequestSection } from "./ServiceRequestSection";

interface StepDef {
  key: IntakeStepKey;
  title: string;
  short: string;
}

/**
 * Teleconsult opens on the emergency safety check (pilot feedback: "make the
 * clinical safety check the first question"). Pain questions are now an
 * optional section of the Concern page, so the wizard stays at five pages.
 * Other service types keep their original four pages and have no safety page,
 * because `safetyScreen` exists only on the teleconsult branch.
 */
const TELECONSULT_STEPS: readonly StepDef[] = [
  { key: "safety", title: "Safety Check", short: "Safety" },
  { key: "about", title: "About You", short: "About you" },
  { key: "history", title: "Medical History", short: "History" },
  { key: "concern", title: "Your Concern", short: "Concern" },
  { key: "review", title: "Review & Consent", short: "Review" },
];
const OTHER_STEPS: readonly StepDef[] = [
  { key: "about", title: "About You", short: "About you" },
  { key: "history", title: "Medical History", short: "History" },
  { key: "service", title: "Current Concern & Safety", short: "Concern" },
  { key: "review", title: "Symptom Review & Consent", short: "Review" },
];

/** A UI page index — distinct from {@link QuestionnaireV2UiStep}, the transport-save slot index, which stays fixed at four regardless of how many pages the wizard shows. */
type IntakePage = number;

interface AuthenticatedIntakeFormProps {
  booking: Booking;
  readOnly?: boolean;
  onComplete?: () => void;
}

const DRAFT_DEBOUNCE_MS = 500;

/**
 * Where a server-saved questionnaire-v2 draft resumes. The two pages saved as
 * `details` are told apart by the structured-history object page two writes.
 * Teleconsult results are then clamped by the safety rule in `intakeGates`.
 */
function serverResumeStep(
  form: Awaited<ReturnType<typeof fetchPatientIntake>>,
  isTeleconsult: boolean,
): IntakeStepKey {
  if (!form || form.questionnaireVersion !== 2) return "about";
  if (
    form.status === "submitted" ||
    form.status === "acknowledged" ||
    form.completedSteps.includes("review") ||
    form.completedSteps.includes("purpose")
  ) return "review";
  if (form.sections.details?.structuredMedicalHistory !== undefined) return isTeleconsult ? "concern" : "service";
  if (form.currentStep === "details" || form.completedSteps.includes("details")) return "history";
  return "about";
}

export function AuthenticatedIntakeForm({
  booking,
  readOnly = false,
  onComplete,
}: AuthenticatedIntakeFormProps) {
  const idToken = useIdToken();
  const userId = useUserId();
  const { profile, updateProfile } = useProfile(userId);
  const isTeleconsult = booking.serviceRequested === "teleconsult";
  const STEPS = isTeleconsult ? TELECONSULT_STEPS : OTHER_STEPS;
  const reviewPage = STEPS.length - 1;
  const pageOf = (key: string): IntakePage => STEPS.findIndex((step) => step.key === key);
  const [currentStep, setCurrentStep] = useState<IntakePage>(0);
  const [furthestStep, setFurthestStep] = useState<IntakePage>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [redFlag, setRedFlag] = useState<RedFlagState>({ answer: undefined, bleeding: false });
  const [uiState, setUiState] = useState<IntakeUiState>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "device" | "server">("idle");
  // UI-only: remembers which way the last page change went, so the new page
  // slides in from that side (CHANGELOG_UI_MI.md). Navigation is untouched.
  const [stepMotion, setStepMotion] = useState<{ step: IntakePage; direction: StepDirection }>({
    step: 0,
    direction: "none",
  });
  if (stepMotion.step !== currentStep) {
    setStepMotion({ step: currentStep, direction: stepDirection(stepMotion.step, currentStep) });
  }
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const hydratedBookingRef = useRef<string | null>(null);
  const backSaveRef = useRef<Promise<unknown> | null>(null);

  const methods = useForm<DynamicIntakeFormValues>({
    resolver: readOnly
      ? undefined
      : (zodResolver(dynamicIntakeMasterSchema) as unknown as Resolver<DynamicIntakeFormValues>),
    defaultValues: getDefaultValues(booking.serviceRequested),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const intakeQuery = useQuery({
    queryKey: ["booking-intake", booking.id, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", booking.id),
    enabled: Boolean(idToken),
    staleTime: 30_000,
    retry: false,
  });
  const serverForm = intakeQuery.data ?? null;
  const intake = useQuestionnaireV2Intake(booking.id, serverForm);

  const draftStorage = useMemo(() => (readOnly ? null : browserDraftStorage()), [readOnly]);
  const draftKey = userId ? intakeDraftKey(userId, booking.id) : null;

  const dirtyFields = methods.formState.dirtyFields;
  const watchedRequest = useWatch({ control: methods.control, name: "requestDetails" });
  const watchedAdditional = useWatch({ control: methods.control, name: "additionalInfo" });

  useEffect(() => {
    if (!intakeQuery.isSuccess || hydratedBookingRef.current === booking.id) return;
    hydratedBookingRef.current = booking.id;
    if (serverForm) {
      methods.reset(
        mapSectionsToIntakeForm(serverForm, booking.serviceRequested, methods.getValues()),
        { keepDirtyValues: true },
      );
    }
    const hydratedRequest = methods.getValues().requestDetails;
    let safetyAnswer = hydratedRequest.type === "teleconsult" ? redFlagFromScreen(hydratedRequest.safetyScreen) : undefined;
    let target: IntakeStepKey = serverResumeStep(serverForm, isTeleconsult);
    let furthest: IntakeStepKey = target;

    // The device copy wins only when it was written against the revision the
    // server holds now; anything newer on the server came from elsewhere.
    const draft = draftKey ? readIntakeDraft<DynamicIntakeFormValues>(draftStorage, draftKey) : null;
    if (isDraftCurrent(draft, effectiveIntakeRevision(serverForm))) {
      methods.reset(draft.values as DynamicIntakeFormValues);
      // The draft is an external source (sessionStorage) read once, after the server copy.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUiState(draft.ui ?? {});
      safetyAnswer = draft.safetyAnswer;
      if (STEPS.some((step) => step.key === draft.step)) target = draft.step as IntakeStepKey;
      if (STEPS.some((step) => step.key === draft.furthestStep)) furthest = draft.furthestStep as IntakeStepKey;
    } else if (draft && draftKey) {
      clearIntakeDraft(draftStorage, draftKey);
    }

    const flag: RedFlagState = { answer: safetyAnswer, bleeding: false };
    const resume = clampResumeStep(target, isTeleconsult, flag);
    const resumePage = Math.max(0, pageOf(resume));
    // The persisted draft arrives asynchronously after the initial render.
    setRedFlag(flag);
    setCurrentStep(resumePage);
    setFurthestStep(resume === target ? Math.max(resumePage, pageOf(furthest)) : resumePage);
    methods.clearErrors();
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- STEPS/pageOf derive from booking.serviceRequested, already a dep.
  }, [booking.id, booking.serviceRequested, dirtyFields, draftKey, draftStorage, intakeQuery.isSuccess, isTeleconsult, methods, serverForm]);

  /*
   * Device draft. Every form edit, screen-only selection, safety answer and
   * page change is written to this tab's sessionStorage 500ms after it stops
   * changing, and once more when the intake unmounts. Writes start only after
   * hydration, so the defaults never overwrite a draft that is about to load.
   */
  const latestRef = useRef({ uiState, redFlag, currentStep, furthestStep, revision: intake.revision });
  useEffect(() => {
    latestRef.current = { uiState, redFlag, currentStep, furthestStep, revision: intake.revision };
  });
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formEditedRef = useRef(false);

  const flushDraft = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = null;
    if (!draftKey || !draftStorage) return;
    const latest = latestRef.current;
    const written = writeIntakeDraft(draftStorage, draftKey, {
      version: 1,
      savedAt: Date.now(),
      baseRevision: latest.revision,
      values: methods.getValues(),
      ui: latest.uiState,
      safetyAnswer: latest.redFlag.answer,
      step: STEPS[latest.currentStep]?.key ?? "about",
      furthestStep: STEPS[latest.furthestStep]?.key ?? "about",
    });
    if (written && formEditedRef.current) {
      formEditedRef.current = false;
      setSaveStatus("device");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- STEPS derives from booking.serviceRequested.
  }, [draftKey, draftStorage, methods]);

  const scheduleDraft = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(flushDraft, DRAFT_DEBOUNCE_MS);
  }, [flushDraft]);

  useEffect(() => {
    if (!hydrated || readOnly) return;
    return methods.subscribe({
      formState: { values: true },
      callback: () => {
        formEditedRef.current = true;
        scheduleDraft();
      },
    });
  }, [hydrated, methods, readOnly, scheduleDraft]);

  useEffect(() => {
    if (hydrated && !readOnly) scheduleDraft();
  }, [uiState, redFlag, currentStep, furthestStep, intake.revision, hydrated, readOnly, scheduleDraft]);

  useEffect(() => {
    if (!hydrated || readOnly) return;
    const flushIfPending = () => {
      if (draftTimerRef.current) flushDraft();
    };
    window.addEventListener("pagehide", flushIfPending);
    return () => {
      window.removeEventListener("pagehide", flushIfPending);
      flushIfPending();
    };
  }, [flushDraft, hydrated, readOnly]);

  const reviewValues = useMemo(
    () => serverForm
      ? mapSectionsToIntakeForm(serverForm, booking.serviceRequested, methods.getValues())
      : booking.intakeData
        ? { ...getDefaultValues(booking.serviceRequested), ...booking.intakeData } as DynamicIntakeFormValues
        : methods.getValues(),
    [booking.intakeData, booking.serviceRequested, methods, serverForm],
  );

  // Each step starts at the top of the scroll body, not wherever the last one ended.
  useEffect(() => {
    if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
  }, [currentStep]);

  const isOnDemand = booking.bookingType === "on-demand";

  /**
   * An on-demand booking has no "preferred consultation time" to ask for — it
   * is called as soon as a doctor is free, the same way an on-demand ride
   * has no pickup-time picker. `additionalInfo.dateOfConsultation` stays a
   * schema-required string (Requirement: no contract change), so this fills
   * it with today's date behind the scenes instead of asking the patient a
   * question that has no answer for this booking type.
   */
  useEffect(() => {
    if (readOnly || !isOnDemand) return;
    if (methods.getValues("additionalInfo.dateOfConsultation")) return;
    methods.setValue("additionalInfo.dateOfConsultation", format(new Date(), "yyyy-MM-dd"), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [isOnDemand, methods, readOnly, serverForm, hydrated]);

  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));

  const navigateTo = (step: IntakePage) => {
    if (step < 0 || step > furthestStep || step === currentStep) return;
    if (!canEnterStep(STEPS[step].key, isTeleconsult, redFlag)) return;
    setSaveError(null);
    setCurrentStep(step);
    focusHeading();
  };

  const validationFields = (key: IntakeStepKey): FieldPath<DynamicIntakeFormValues>[] => {
    switch (key) {
      case "safety":
        return [];
      case "about":
        return [
          "personalDetails.forWhom",
          "personalDetails.relationship",
          "personalDetails.name",
          "personalDetails.preferredName",
          "personalDetails.preferredPronoun",
          "personalDetails.dateOfBirth",
          "personalDetails.genderAtBirth",
          "personalDetails.weight",
          "personalDetails.height",
          "personalDetails.bloodType",
          "personalDetails.allergens",
          "personalDetails.otherAllergens",
          "personalDetails.diet",
        ];
      case "history":
        return ["personalDetails.structuredMedicalHistory"];
      case "concern":
        return [
          "requestDetails.chiefComplaint",
          "requestDetails.safetyScreen",
          "requestDetails.vitals",
          "requestDetails.symptomReview",
        ] as FieldPath<DynamicIntakeFormValues>[];
      case "service":
        return ["requestDetails"];
      case "review":
        return ["additionalInfo"];
    }
  };

  /**
   * Server save for one page. Page-to-transport mapping: About You and Medical
   * History write `details`; the concern page writes `purpose` (chief
   * complaint, tags) and `details` (safety screen, vitals, pain answers). The
   * safety page has no save of its own: its answer is part of `details` and
   * travels with About You, and the device draft holds it until then.
   */
  const saveStepFor = async (key: IntakeStepKey, values: DynamicIntakeFormValues) => {
    if (key === "about") await intake.saveStep.mutateAsync({ uiStep: 0 as QuestionnaireV2UiStep, values });
    else if (key === "history") await intake.saveStep.mutateAsync({ uiStep: 2, values });
    else if (key === "concern" || key === "service") {
      await intake.saveStep.mutateAsync({ uiStep: 1, values });
      await intake.saveStep.mutateAsync({ uiStep: 2, values });
    }
  };

  const currentKey = STEPS[currentStep].key;
  const hardStop = isTeleconsult && currentKey === "safety" && isSafetyHardStop(redFlag);

  const blockedReason =
    currentKey === "safety"
      ? safetyBlockedReason(redFlag)
      : isTeleconsult && redFlag.answer !== "no"
        ? "Answer the safety check first."
        : currentKey === "concern" && watchedRequest?.type === "teleconsult"
          ? concernBlockedReason(watchedRequest.chiefComplaint, watchedRequest.vitals)
          : currentKey === "review"
            ? !watchedAdditional?.dateOfConsultation
              ? "Choose a preferred date to submit."
              : watchedAdditional.consent !== true
                ? "Confirm the consent statement to submit."
                : null
            : null;

  /**
   * Back never blocks and never validates. It goes back at once and, for a
   * page with a server save, saves what is on screen in the background; a
   * failed save is fine, because the device draft still holds the answers.
   */
  const handleBack = () => {
    const key = currentKey;
    const values = methods.getValues();
    navigateTo(currentStep - 1);
    if (key === "about" || key === "history" || key === "concern" || key === "service") {
      backSaveRef.current = saveStepFor(key, values)
        .then(() => setSaveStatus("server"))
        .catch(() => undefined)
        .finally(() => {
          backSaveRef.current = null;
        });
    }
  };

  const handleContinue = async () => {
    if (blockedReason || hardStop) return;
    setSaveError(null);
    const fields = validationFields(currentKey);
    const valid = fields.length === 0 || (await methods.trigger(fields, { shouldFocus: true }));
    if (!valid) {
      setSaveError("Please review the highlighted fields before continuing.");
      return;
    }

    try {
      // A background save from Back must land first, or both would claim the same revision.
      await backSaveRef.current;
      const values = methods.getValues();
      if (currentKey === "review") {
        await intake.submit.mutateAsync(values);
        await saveAllergiesToProfile(values);
        if (draftKey) clearIntakeDraft(draftStorage, draftKey);
        toast.success("Intake submitted successfully.");
        onComplete?.();
        return;
      }
      await saveStepFor(currentKey, values);
      if (currentKey !== "safety") setSaveStatus("server");
      const next = currentStep + 1;
      setFurthestStep((previous) => Math.max(previous, next));
      setCurrentStep(next);
      focusHeading();
    } catch (error) {
      const msg = errorMessage(error);
      setSaveError(msg);
      toast.error(msg);
    }
  };

  /** Copies new allergy answers to the saved profile. A failure never fails the submitted intake. */
  const saveAllergiesToProfile = async (values: DynamicIntakeFormValues) => {
    const update = allergyWriteBack(values.personalDetails, profile, uiState[SAVE_ALLERGIES_KEY] !== false);
    if (!update) return;
    try {
      await updateProfile(update);
    } catch {
      toast.message("Your intake was sent, but your allergies were not saved to your profile.");
    }
  };

  if (!idToken) {
    return (
      <Alert variant="destructive" className="m-4" role="alert">
        <AlertTitle>Sign in again to continue</AlertTitle>
        <AlertDescription>Your intake answers remain unavailable until your authenticated session is restored.</AlertDescription>
      </Alert>
    );
  }

  if (intakeQuery.isLoading) {
    return <p className="p-4 text-base text-muted-foreground">Loading your intake…</p>;
  }

  if (intakeQuery.isError) {
    return (
      <Alert variant="destructive" className="m-4" role="alert">
        <AlertTitle>We could not load your intake</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Try again before entering or changing any answers.</p>
          <AppButton type="button" variant="outline" onClick={() => void intakeQuery.refetch()}>
            Try again
          </AppButton>
        </AlertDescription>
      </Alert>
    );
  }

  if (readOnly) {
    return (
      <>
        <IntakeReceipt bookingId={booking.id} className="px-4 pt-4" />
        <ReadOnlyAuthenticatedIntake values={reviewValues} />
      </>
    );
  }

  const pending = intake.saveStep.isPending || intake.submit.isPending;
  const statusText = saveStatus === "server" ? "Saved" : saveStatus === "device" ? "Saved on this device" : null;

  return (
    <FormProvider {...methods}>
      <IntakeUiStateProvider value={uiState} onChange={setUiState}>
      {/*
       * Fixed-height sheet: the header and action bar never move; only the
       * body between them scrolls, so a field expanding mid-step can't push
       * Continue below the fold or grow the card past the viewport.
       */}
      <form
        onSubmit={(event) => event.preventDefault()}
        data-slot="intake-sheet"
        className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden"
      >
        {/*
         * One title, one plain step count, one thin bar. The save status says
         * exactly where the answers are: "Saved" once the server has them,
         * "Saved on this device" while only this tab does.
         */}
        <header className="shrink-0 border-b border-(--border-subtle) px-4 pt-3 pb-3 sm:px-8 sm:pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h1 ref={headingRef} tabIndex={-1} className="min-w-0 text-xl leading-tight font-bold text-(--text-heading) outline-none sm:text-2xl">
              {STEPS[currentStep].title}
            </h1>
            <span className="shrink-0 text-[15px] font-medium text-(--text-muted) tabular-nums">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <p aria-live="polite" className="mt-1 flex min-h-5 items-center gap-1.5 text-sm text-(--text-muted)">
            {statusText ? (
              // Keyed by the text so a change ("Saved on this device" → "Saved")
              // fades in and redraws its check instead of swapping in place.
              <span
                key={statusText}
                className="inline-flex animate-in items-center gap-1.5 duration-(--dur-base) ease-(--ease-out) fade-in"
              >
                <DrawnCheck className="size-4 text-(--safe-fg)" />
                {statusText}
              </span>
            ) : null}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--ink-100) xl:hidden" aria-hidden>
            <div className="h-full rounded-full bg-(--action-primary) transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav aria-label="Intake steps" className="hidden w-56 shrink-0 overflow-y-auto border-r border-(--border-subtle) p-4 xl:block">
            <ol className="space-y-1">
              {STEPS.map((step, index) => {
                const complete = index < furthestStep;
                const current = index === currentStep;
                const locked = index > furthestStep || !canEnterStep(step.key, isTeleconsult, redFlag);
                return (
                  <li key={step.key}>
                    <button
                      type="button"
                      disabled={locked}
                      aria-current={current ? "step" : undefined}
                      onClick={() => navigateTo(index)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                        current
                          ? "bg-(--surface-brand-soft) font-semibold text-(--text-heading)"
                          : complete && !locked
                            ? "text-(--text-body) hover:bg-(--surface-canvas)"
                            : "cursor-not-allowed text-(--text-muted)",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums",
                          complete
                            ? "border-transparent bg-(--action-primary) text-(--action-primary-text)"
                            : current
                              ? "border-(--action-primary) text-(--action-primary)"
                              : "border-(--border-strong)",
                        )}
                      >
                        {complete ? <Check className="size-3.5 stroke-[3]" /> : index + 1}
                      </span>
                      <span>{step.short}</span>
                      {complete ? <span className="sr-only">(completed)</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <main
            ref={scrollBodyRef}
            data-slot="intake-scroll-body"
            // The scrollbar stays visible: it is the only cue that a long step
            // continues below the fold, and older patients rely on it.
            className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] sm:px-8 sm:py-6"
          >
            {/* Keyed by page so each page enters from the side it came from (220ms). */}
            <div key={currentKey} data-slot="intake-step-body" className={stepEnterClass(stepMotion.direction)}>
            {currentKey === "safety" ? <SafetyCheckStep redFlag={redFlag} onRedFlagChange={setRedFlag} /> : null}
            {currentKey === "about" ? <AboutYouSection profile={profile} /> : null}
            {currentKey === "history" ? <MedicalHistoryStep /> : null}
            {currentKey === "concern" ? (
              <div className="space-y-9">
                <ConcernSafetyStep />
                <PainAssessmentStep className="border-t border-(--border-subtle) pt-7" />
              </div>
            ) : null}
            {currentKey === "service" ? <ServiceRequestSection serviceType={booking.serviceRequested} /> : null}
            {currentKey === "review" ? (
              <ReviewConsentStep onEdit={(key) => navigateTo(pageOf(key))} isOnDemand={isOnDemand} />
            ) : null}
            </div>
          </main>
        </div>

        {/*
         * The hard stop has no action bar at all: no Continue to tap, no
         * blocked-reason to argue with. The emergency card's own controls are
         * the only way forward.
         */}
        {hardStop ? null : (
          <IntakeNavFooter
            placement="pinned"
            backTo={currentStep > 0 ? STEPS[currentStep - 1].title : undefined}
            onBack={handleBack}
            continueTo={currentStep < reviewPage ? STEPS[currentStep + 1].title : undefined}
            onContinue={() => void handleContinue()}
            isFinal={currentStep === reviewPage}
            pending={pending}
            blockedReason={blockedReason}
          >
            {/*
             * In the pinned bar, so a save error is visible without scrolling —
             * a single line rather than a full destructive Alert card. It used to
             * be screen-reader-only text plus a toast that vanished in seconds,
             * which left sighted patients with no lasting explanation.
             */}
            {saveError ? (
              <p role="alert" className="mb-2.5 flex items-start gap-2 text-[15px] leading-snug font-semibold text-(--danger-fg)">
                <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0" />
                {saveError}
              </p>
            ) : null}
          </IntakeNavFooter>
        )}
      </form>
      </IntakeUiStateProvider>
    </FormProvider>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "This intake changed in another session. Reload the page to get the latest answers before continuing.";
  }
  return error instanceof Error ? error.message : "We could not save your answers. Please try again.";
}

function AboutYouSection({ profile }: { profile: unknown }) {
  return <PersonDataSection userProfile={profile} mode="booking" />;
}

/**
 * The submitted intake, read back to the patient in plain form: condition
 * labels instead of stored enums (`bleeding_disorder`), a written-out date,
 * units on measurements, and "No known allergies" for the stored "None".
 * Values are unchanged — only how they are displayed.
 */
function ReadOnlyAuthenticatedIntake({ values }: { values: DynamicIntakeFormValues }) {
  const personal = values.personalDetails;
  const request = values.requestDetails;
  const teleconsult = request.type === "teleconsult" ? request : null;
  const history = personal.structuredMedicalHistory;
  const display = (value: unknown, empty = "Not answered") => value === undefined || value === null || value === "" ? empty : String(value);
  const withUnit = (value: unknown, unit: string) => (value === undefined || value === null || value === "" ? "Not recorded" : `${value} ${unit}`);
  const yesNo = (value: boolean | undefined) => (value === undefined ? "Not answered" : value ? "Yes" : "No");
  const dob = personal.dateOfBirth ? parse(personal.dateOfBirth, "yyyy-MM-dd", new Date()) : null;
  const allergies = personal.allergens?.length
    ? personal.allergens.includes(NONE_OPTION)
      ? "No known allergies"
      : personal.allergens.join(", ")
    : "Not answered";
  const conditions = history?.noneReported
    ? "None reported"
    : history?.knownConditions?.length
      ? history.knownConditions.map((item) => (item === "other" && history.other ? history.other : conditionLabel(item))).join(", ")
      : "Not answered";
  const bp = personal.baselineVitals?.systolicBp !== undefined || personal.baselineVitals?.diastolicBp !== undefined
    ? `${display(personal.baselineVitals?.systolicBp, "—")}/${display(personal.baselineVitals?.diastolicBp, "—")} mmHg`
    : "Not recorded";
  return <div className="space-y-6" data-slot="authenticated-intake-read-only">
    <ReadOnlyGroup title="About You & Baseline">
      {personal.name ? <ReadOnlyField label="Name" value={personal.name} /> : null}
      <ReadOnlyField label="Date of birth" value={dob && isValid(dob) ? format(dob, "d MMMM yyyy") : display(personal.dateOfBirth)} />
      <ReadOnlyField label="Height" value={withUnit(personal.height, "cm")} />
      <ReadOnlyField label="Weight" value={withUnit(personal.weight, "kg")} />
      <ReadOnlyField label="Allergies" value={allergies} />
      <ReadOnlyField label="Baseline blood pressure" value={bp} />
      <ReadOnlyField label="Self-reported measurements" value={yesNo(personal.measurementsSelfReported)} />
    </ReadOnlyGroup>
    <ReadOnlyGroup title="Medical History">
      <ReadOnlyField label="Known conditions" value={conditions} />
      <ReadOnlyField label="Details" value={display(history?.details)} />
      <ReadOnlyField label="Current medications" value={display(history?.currentMedications)} />
    </ReadOnlyGroup>
    <ReadOnlyGroup title="Current Concern & Safety">
      {teleconsult ? <>
        <ReadOnlyField label="Main concern" value={display(teleconsult.chiefComplaint)} />
        <ReadOnlyField label="Related symptoms" value={teleconsult.complaintTags?.length ? teleconsult.complaintTags.map(complaintTagLabel).join(", ") : "None selected"} />
        <ReadOnlyField label="Chest pain" value={yesNo(teleconsult.safetyScreen?.chestPain)} />
        <ReadOnlyField label="Difficulty breathing" value={yesNo(teleconsult.safetyScreen?.dyspnea)} />
        <ReadOnlyField label="Fever days" value={display(teleconsult.safetyScreen?.feverDays)} />
      </> : <ReadOnlyField label="Service request" value={request.type.replace(/-/g, " ")} />}
    </ReadOnlyGroup>
    <ReadOnlyGroup title="Symptom Review & Consent">
      {teleconsult ? <>
        <ReadOnlyField label="Onset" value={display(teleconsult.symptomReview?.onset)} />
        <ReadOnlyField label="Pain severity" value={typeof teleconsult.symptomReview?.painSeverity === "number" ? `${teleconsult.symptomReview.painSeverity} / 10` : "Not answered"} />
        <ReadOnlyField label="Reproductive health" value={teleconsult.reproductiveHealth ? display(teleconsult.reproductiveHealth.pregnancyPossibility) : "Not answered"} />
      </> : null}
      <ReadOnlyField label="Additional concerns" value={display(values.additionalInfo.additionalConcerns)} />
      <ReadOnlyField label="Preferred consultation date" value={display(values.additionalInfo.dateOfConsultation)} />
      <ReadOnlyField label="Consent" value={values.additionalInfo.consent ? "Given" : "Not given"} />
    </ReadOnlyGroup>
  </div>;
}

function ReadOnlyGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-4"><h2 className="mb-4 text-lg font-semibold text-(--text-heading)">{title}</h2><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></section>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div><dt className="text-sm text-(--text-muted)">{label}</dt><dd className="text-base font-medium break-words text-(--text-body)">{value}</dd></div>; }
