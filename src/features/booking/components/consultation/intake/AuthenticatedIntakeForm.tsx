"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Circle, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FormProvider,
  type FieldPath,
  type Resolver,
  useForm,
  useWatch,
} from "react-hook-form";

import { PersonDataSection } from "@/components/blocks/profile/PersonDataSection";
import AppButton from "@/components/primitives/AppButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfile } from "@/hooks/useProfile";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useIdToken, useUserId } from "@/stores/useAuthStore";

import { useQuestionnaireV2Intake, type QuestionnaireV2UiStep } from "../../../hooks/useSubmitIntake";
import { fetchPatientIntake } from "../../../lib/api/patientIntake";
import { mapSectionsToIntakeForm } from "../../../lib/intakeMapper";
import {
  dynamicIntakeMasterSchema,
  getDefaultValues,
  type DynamicIntakeFormValues,
} from "../../../schemas/intakeSchema";
import type { Booking } from "../../../types/booking.types";
import {
  ConcernSafetyStep,
  concernBlockedReason,
  redFlagFromScreen,
  type RedFlagState,
} from "./ConcernSafetyStep";
import { IntakeNavFooter } from "./IntakeNavFooter";
import { MedicalHistoryStep } from "./MedicalHistoryStep";
import { PainAssessmentStep } from "./PainAssessmentStep";
import { ReviewConsentStep } from "./ReviewConsentStep";
import { ServiceRequestSection } from "./ServiceRequestSection";

/**
 * Pain Assessment (PQRST) only applies to teleconsult: it writes into
 * `requestDetails.symptomReview`, a field that exists only on that branch of
 * the `requestDetails` discriminated union. Other service types keep the
 * original four-step shape.
 */
const TELECONSULT_STEPS = [
  { title: "About You", short: "About you" },
  { title: "Medical History", short: "History" },
  { title: "Current Concern & Safety", short: "Concern" },
  { title: "Pain Assessment", short: "Pain" },
  { title: "Symptom Review & Consent", short: "Review" },
] as const;
const OTHER_STEPS = [
  { title: "About You", short: "About you" },
  { title: "Medical History", short: "History" },
  { title: "Current Concern & Safety", short: "Concern" },
  { title: "Symptom Review & Consent", short: "Review" },
] as const;

/** A UI page index — distinct from {@link QuestionnaireV2UiStep}, the transport-save slot index, which stays fixed at four regardless of how many pages the wizard shows. */
type IntakePage = number;

interface AuthenticatedIntakeFormProps {
  booking: Booking;
  readOnly?: boolean;
  onComplete?: () => void;
}

/**
 * Resume only questionnaire-v2 drafts. The two UI pages persisted as `details`
 * are distinguished by the structured-history object written by page two.
 *
 * A saved draft cannot distinguish "reached Concern & Safety" from "reached
 * Pain Assessment" — both write into the same `purpose` transport bucket — so
 * a returning patient always resumes on Concern & Safety, one page earlier
 * than they may have gotten to. That is an existing granularity limit of this
 * heuristic, not something Pain Assessment made worse.
 */
function questionnaireV2ResumeStep(
  form: Awaited<ReturnType<typeof fetchPatientIntake>>,
  reviewPage: IntakePage,
): IntakePage {
  if (!form || form.questionnaireVersion !== 2) return 0;
  if (
    form.status === "submitted" ||
    form.status === "acknowledged" ||
    form.completedSteps.includes("review") ||
    form.completedSteps.includes("purpose")
  ) return reviewPage;
  if (form.sections.details?.structuredMedicalHistory !== undefined) return 2;
  if (form.currentStep === "details" || form.completedSteps.includes("details")) return 1;
  return 0;
}

export function AuthenticatedIntakeForm({
  booking,
  readOnly = false,
  onComplete,
}: AuthenticatedIntakeFormProps) {
  const idToken = useIdToken();
  const userId = useUserId();
  const { profile } = useProfile(userId);
  const isTeleconsult = booking.serviceRequested === "teleconsult";
  const STEPS = isTeleconsult ? TELECONSULT_STEPS : OTHER_STEPS;
  const painPage = isTeleconsult ? 3 : -1;
  const reviewPage = STEPS.length - 1;
  const [currentStep, setCurrentStep] = useState<IntakePage>(0);
  const [furthestStep, setFurthestStep] = useState<IntakePage>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [redFlag, setRedFlag] = useState<RedFlagState>({ answer: undefined, bleeding: false });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const hydratedBookingRef = useRef<string | null>(null);

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

  const dirtyFields = methods.formState.dirtyFields;
  const watchedRequest = useWatch({ control: methods.control, name: "requestDetails" });
  const watchedAdditional = useWatch({ control: methods.control, name: "additionalInfo" });

  useEffect(() => {
    if (!serverForm || hydratedBookingRef.current === booking.id) return;
    hydratedBookingRef.current = booking.id;
    methods.reset(
      mapSectionsToIntakeForm(serverForm, booking.serviceRequested, methods.getValues()),
      { keepDirtyValues: true },
    );
    const hydrated = methods.getValues().requestDetails;
    setRedFlag({
      answer: hydrated.type === "teleconsult" ? redFlagFromScreen(hydrated.safetyScreen) : undefined,
      bleeding: false,
    });
    const resumeStep = questionnaireV2ResumeStep(serverForm, reviewPage);
    // The persisted draft arrives asynchronously after the initial render.
    setCurrentStep(resumeStep);
    setFurthestStep(resumeStep);
    methods.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewPage is derived from booking.serviceRequested, already a dep.
  }, [booking.id, booking.serviceRequested, dirtyFields, methods, serverForm]);

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
  }, [isOnDemand, methods, readOnly, serverForm]);

  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));

  const navigateTo = (step: IntakePage) => {
    if (step > furthestStep || step === currentStep) return;
    setSaveError(null);
    setCurrentStep(step);
    focusHeading();
  };

  const validationFields = (step: IntakePage): FieldPath<DynamicIntakeFormValues>[] => {
    if (step === 0) return [
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
    if (step === 1) return ["personalDetails.structuredMedicalHistory"];
    if (step === 2) {
      return isTeleconsult
        ? ["requestDetails.chiefComplaint", "requestDetails.safetyScreen", "requestDetails.vitals"]
        : ["requestDetails"];
    }
    if (step === painPage) return ["requestDetails.symptomReview"];
    return ["additionalInfo"];
  };

  const blockedReason =
    currentStep === 2 && isTeleconsult
      ? concernBlockedReason(watchedRequest, redFlag)
      : currentStep === reviewPage
        ? !watchedAdditional?.dateOfConsultation
          ? "Choose a preferred date to submit."
          : watchedAdditional.consent !== true
            ? "Confirm the consent statement to submit."
            : null
        : null;

  const handleContinue = async () => {
    if (blockedReason) return;
    setSaveError(null);
    const valid = await methods.trigger(validationFields(currentStep), { shouldFocus: true });
    if (!valid) {
      setSaveError("Please review the highlighted fields before continuing.");
      return;
    }

    try {
      if (currentStep === reviewPage) {
        await intake.submit.mutateAsync(methods.getValues());
        onComplete?.();
        return;
      }
      const values = methods.getValues();
      if (currentStep === 1) {
        // Medical history belongs to the transport `details` section.
        await intake.saveStep.mutateAsync({ uiStep: 2, values });
      } else if (currentStep === 2) {
        // Request purpose and supporting clinical/certificate details share this
        // visual page but are separate transport sections for every service.
        await intake.saveStep.mutateAsync({ uiStep: 1, values });
        await intake.saveStep.mutateAsync({ uiStep: 2, values });
      } else if (currentStep === painPage) {
        // Pain Assessment also writes into `requestDetails`, the `purpose` bucket.
        await intake.saveStep.mutateAsync({ uiStep: 1, values });
      } else {
        // Only About You (page 0) reaches here; its transport slot index matches its page index.
        await intake.saveStep.mutateAsync({ uiStep: currentStep as QuestionnaireV2UiStep, values });
      }
      const next = currentStep + 1;
      setFurthestStep((previous) => Math.max(previous, next));
      setCurrentStep(next);
      focusHeading();
    } catch (error) {
      setSaveError(errorMessage(error));
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
    return <p className="p-4 text-sm text-muted-foreground">Loading your intake…</p>;
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
    return <ReadOnlyAuthenticatedIntake values={reviewValues} />;
  }

  const pending = intake.saveStep.isPending || intake.submit.isPending;

  return (
    <FormProvider {...methods}>
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
        <header className="shrink-0 border-b border-(--border-subtle) px-4 py-2.5 sm:px-8 sm:py-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center rounded-lg bg-(--surface-accent-soft) px-2.5 py-1 text-xs font-bold tracking-wider text-(--status-available-fg) uppercase">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <h1 ref={headingRef} tabIndex={-1} className="truncate text-base sm:text-lg font-bold text-(--text-heading) outline-none">
                {STEPS[currentStep].title}
              </h1>
            </div>
            {/* Clinical Trust Badge */}
            <div className="flex items-center gap-1.5 rounded-lg border border-(--teal-200) bg-(--teal-100)/60 px-2.5 py-1 text-xs font-semibold text-(--teal-800) shrink-0">
              <ShieldCheck className="size-4 text-(--teal-700)" />
              <span className="hidden xs:inline">Encrypted & Autosaved</span>
              <span className="xs:hidden">Autosaved</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-(--ink-100) xl:hidden" aria-hidden>
            <div className="h-full rounded-full bg-(--action-primary) transition-[width] duration-300" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav aria-label="Intake steps" className="hidden w-56 shrink-0 overflow-y-auto border-r border-(--border-subtle) p-4 xl:block">
            <ol className="space-y-2">
              {STEPS.map((step, index) => {
                const complete = index < furthestStep;
                const current = index === currentStep;
                const locked = index > furthestStep;
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      disabled={locked}
                      aria-current={current ? "step" : undefined}
                      onClick={() => navigateTo(index)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm",
                        current ? "border-primary bg-primary/10 font-semibold" : "border-transparent",
                        locked && "cursor-not-allowed text-muted-foreground",
                      )}
                    >
                      {complete ? <Check aria-hidden className="size-4" /> : locked ? <LockKeyhole aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
                      <span><span className="block">{step.short}</span><span className="text-xs font-normal text-muted-foreground">{current ? "Current" : complete ? "Completed" : locked ? "Locked" : "Available"}</span></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <main
            ref={scrollBodyRef}
            data-slot="intake-scroll-body"
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-8 sm:py-5"
          >
            {currentStep === 0 ? <AboutYouSection profile={profile} /> : null}
            {currentStep === 1 ? <MedicalHistoryStep /> : null}
            {currentStep === 2 ? (
              isTeleconsult
                ? <ConcernSafetyStep redFlag={redFlag} onRedFlagChange={setRedFlag} />
                : <ServiceRequestSection serviceType={booking.serviceRequested} />
            ) : null}
            {currentStep === painPage ? <PainAssessmentStep /> : null}
            {currentStep === reviewPage ? (
              <ReviewConsentStep onEdit={navigateTo} isOnDemand={isOnDemand} />
            ) : null}
          </main>
        </div>

        <IntakeNavFooter
          placement="pinned"
          backTo={currentStep > 0 ? STEPS[currentStep - 1].title : undefined}
          onBack={() => navigateTo(currentStep - 1)}
          continueTo={currentStep < reviewPage ? STEPS[currentStep + 1].title : undefined}
          onContinue={() => void handleContinue()}
          isFinal={currentStep === reviewPage}
          pending={pending}
          blockedReason={blockedReason}
        >
          {/*
           * In the pinned bar, so a save error is visible without scrolling —
           * a single quiet line rather than a full destructive Alert card,
           * which read as an alarming amount of red for a "try again" message.
           */}
          {saveError ? (
            <p role="alert" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-(--danger-fg)">
              <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
              {saveError}
            </p>
          ) : null}
        </IntakeNavFooter>
      </form>
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

function ReadOnlyAuthenticatedIntake({ values }: { values: DynamicIntakeFormValues }) {
  const personal = values.personalDetails;
  const request = values.requestDetails;
  const teleconsult = request.type === "teleconsult" ? request : null;
  const history = personal.structuredMedicalHistory;
  const display = (value: unknown, empty = "Not answered") => value === undefined || value === null || value === "" ? empty : String(value);
  return <div className="space-y-6" data-slot="authenticated-intake-read-only">
    <ReadOnlyGroup title="About You & Baseline"><ReadOnlyField label="Name" value={display(personal.name)} /><ReadOnlyField label="Date of birth" value={display(personal.dateOfBirth)} /><ReadOnlyField label="Height" value={display(personal.height, "Not recorded")} /><ReadOnlyField label="Weight" value={display(personal.weight, "Not recorded")} /><ReadOnlyField label="Allergies" value={personal.allergens?.length ? personal.allergens.join(", ") : "Not answered"} /><ReadOnlyField label="Baseline blood pressure" value={personal.baselineVitals?.systolicBp !== undefined || personal.baselineVitals?.diastolicBp !== undefined ? `${display(personal.baselineVitals?.systolicBp, "—")}/${display(personal.baselineVitals?.diastolicBp, "—")} mmHg` : "Not recorded"} /><ReadOnlyField label="Self-reported measurements" value={personal.measurementsSelfReported === undefined ? "Not answered" : personal.measurementsSelfReported ? "Yes" : "No"} /></ReadOnlyGroup>
    <ReadOnlyGroup title="Medical History"><ReadOnlyField label="Known conditions" value={history?.noneReported ? "None reported" : history?.knownConditions?.length ? history.knownConditions.join(", ") : "Not answered"} /><ReadOnlyField label="Details" value={display(history?.details)} /><ReadOnlyField label="Current medications" value={display(history?.currentMedications)} /></ReadOnlyGroup>
    <ReadOnlyGroup title="Current Concern & Safety">{teleconsult ? <><ReadOnlyField label="Main concern" value={display(teleconsult.chiefComplaint)} /><ReadOnlyField label="Chest pain" value={teleconsult.safetyScreen?.chestPain === undefined ? "Not answered" : teleconsult.safetyScreen.chestPain ? "Yes" : "No"} /><ReadOnlyField label="Difficulty breathing" value={teleconsult.safetyScreen?.dyspnea === undefined ? "Not answered" : teleconsult.safetyScreen.dyspnea ? "Yes" : "No"} /><ReadOnlyField label="Fever days" value={display(teleconsult.safetyScreen?.feverDays)} /></> : <ReadOnlyField label="Service request" value={request.type} />}</ReadOnlyGroup>
    <ReadOnlyGroup title="Symptom Review & Consent">{teleconsult ? <><ReadOnlyField label="Onset" value={display(teleconsult.symptomReview?.onset)} /><ReadOnlyField label="Pain severity" value={display(teleconsult.symptomReview?.painSeverity)} /><ReadOnlyField label="Reproductive health" value={teleconsult.reproductiveHealth ? display(teleconsult.reproductiveHealth.pregnancyPossibility) : "Not answered"} /></> : null}<ReadOnlyField label="Additional concerns" value={display(values.additionalInfo.additionalConcerns)} /><ReadOnlyField label="Preferred consultation date" value={display(values.additionalInfo.dateOfConsultation)} /><ReadOnlyField label="Consent" value={values.additionalInfo.consent ? "Given" : "Not given"} /></ReadOnlyGroup>
  </div>;
}

function ReadOnlyGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4"><h2 className="mb-4 text-lg font-semibold">{title}</h2><dl className="grid gap-3 sm:grid-cols-2">{children}</dl></section>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>; }
