"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parse } from "date-fns";
import { Check, TriangleAlert } from "lucide-react";
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
import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfile } from "@/hooks/useProfile";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  complaintTagLabel,
  concernBlockedReason,
  redFlagFromScreen,
  type RedFlagState,
} from "./ConcernSafetyStep";
import { IntakeNavFooter } from "./IntakeNavFooter";
import { MedicalHistoryStep } from "./MedicalHistoryStep";
import { PainAssessmentStep } from "./PainAssessmentStep";
import { conditionLabel } from "./MedicalHistoryStep";
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
        toast.success("Intake submitted successfully.");
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
      const msg = errorMessage(error);
      setSaveError(msg);
      toast.error(msg);
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
        {/*
         * One title, one plain step count, one thin bar. The uppercase step pill
         * and the "Encrypted & Autosaved" badge competed with the title, and
         * "Autosaved" overstated it: answers save when Continue is tapped.
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
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--ink-100) xl:hidden" aria-hidden>
            <div className="h-full rounded-full bg-(--action-primary) transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav aria-label="Intake steps" className="hidden w-56 shrink-0 overflow-y-auto border-r border-(--border-subtle) p-4 xl:block">
            <ol className="space-y-1">
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
                        "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-base",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                        current
                          ? "bg-(--surface-brand-soft) font-semibold text-(--text-heading)"
                          : complete
                            ? "text-(--text-body) hover:bg-(--surface-canvas)"
                            : "cursor-not-allowed text-(--text-muted)",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums",
                          complete
                            ? "border-transparent bg-(--action-primary) text-(--text-inverse)"
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
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] sm:px-8 sm:py-6"
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
