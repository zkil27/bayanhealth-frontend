"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import {
  computeCompletionStatus,
  useIntakeStore,
} from "@/features/booking/hooks/useIntakeForm";
import {
  intakeStepForFormSection,
  useSaveIntakeStep,
  useSubmitIntake,
} from "@/features/booking/hooks/useSubmitIntake";
import { fetchPatientIntake } from "@/features/booking/lib/api/patientIntake";
import { mapSectionsToIntakeForm } from "@/features/booking/lib/intakeMapper";
import type { IntakeForm as IntakeFormRecord } from "@/features/booking/lib/api/intake";
import {
  PersonDataSection,
  ReadOnlyPersonDataSection,
} from "../../../../../components/blocks/profile/PersonDataSection";
import {
  ReadOnlyServiceRequestSection,
  ServiceRequestSection,
} from "./ServiceRequestSection";
import {
  AdditionalInfoSection,
  ReadOnlyAdditionalInfoSection,
} from "./AdditionalInfoSection";
import { IntakeNavFooter } from "./IntakeNavFooter";
import { ProgressStepper } from "./ProgressStepper";
import {
  dynamicIntakeMasterSchema,
  type DynamicIntakeFormValues,
  mergeWithStoredData,
} from "../../../schemas/intakeSchema";
import { Booking, Service } from "@/features/booking/types/booking.types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIdToken, useUserId } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

/**
 * Completion per section, from the hydrated values plus the server's own record.
 *
 * The contract sections cannot carry every form field back (the forward mapper
 * folds name, date of birth, height, weight, diet and the certificate-service
 * fields into `details.medicalHistory` as prose), so re-validating hydrated
 * values alone would report a genuinely completed section as incomplete. The
 * server's `completedSteps` / `submitted` status is authoritative about what was
 * actually saved, so either signal marks a section complete.
 */
function resolveCompletionStatus(
  values: DynamicIntakeFormValues,
  serverIntake: IntakeFormRecord | null,
) {
  const local = computeCompletionStatus(values);
  if (!serverIntake) return local;

  const submitted =
    serverIntake.status === "submitted" ||
    serverIntake.status === "acknowledged";
  const savedOnServer = (section: keyof DynamicIntakeFormValues) =>
    submitted ||
    (serverIntake.completedSteps ?? []).includes(
      intakeStepForFormSection(section),
    );

  return {
    isPersonalComplete:
      local.isPersonalComplete || savedOnServer("personalDetails"),
    isServiceComplete:
      local.isServiceComplete || savedOnServer("requestDetails"),
    isAdditionalComplete:
      local.isAdditionalComplete || savedOnServer("additionalInfo"),
    allComplete: local.allComplete || submitted,
  };
}

interface IntakeFormProps {
  booking?: Booking;
  serviceRequested: Service["value"];
  storageKey?: string;
  readOnly?: boolean;
  onSubmit?: (values: DynamicIntakeFormValues) => Promise<void>;
  onComplete?: () => void;
}

export function IntakeForm({
  booking,
  serviceRequested,
  storageKey,
  readOnly = false,
  onSubmit: submitHandler,
  onComplete,
}: IntakeFormProps) {
  const userId = useUserId();
  const idToken = useIdToken();
  const { profile } = useProfile(userId);

  const router = useRouter();
  const { data, updateSection, setData, clearStore } = useIntakeStore();
  const [currentSection, setCurrentSection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bookingId = booking?.id ?? storageKey ?? "public-intake";

  // Only the authenticated booking flow has booking-scoped intake endpoints to
  // persist to. The public one-time-link flow passes `storageKey` + `onSubmit`
  // and drives the link endpoints itself, so per-step persistence stays off.
  const persistSteps = !!booking?.id && !submitHandler && !readOnly;

  const submitIntakeMutation = useSubmitIntake(bookingId);
  const saveStepMutation = useSaveIntakeStep(bookingId);

  const defaultValues = useMemo(
    () => mergeWithStoredData(data, serviceRequested),
    [data, serviceRequested],
  );

  const methods = useForm<DynamicIntakeFormValues>({
    resolver: readOnly ? undefined : zodResolver(dynamicIntakeMasterSchema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: true,
  } as any);

  const { getValues, trigger, reset, formState, clearErrors } = methods;

  // The submitted intake as the SERVER holds it. This is the only source of
  // truth for the review step: the draft store is cleared on submit and the
  // localStorage copy is deleted, so without this read the review rendered an
  // empty form ("Not Specified" / em-dashes / "Consent Not Given").
  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", booking?.id ?? ""),
    enabled: !!booking?.id && !!idToken,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const serverIntake = intakeQuery.data ?? null;

  // Values the read-only review renders, derived rather than stored so the
  // review can never drift from the response it came from. Precedence: the
  // server's intake, then a caller-supplied `booking.intakeData`, then the local
  // draft store.
  const bookingIntakeData = booking?.intakeData ?? null;
  const reviewValues = useMemo(() => {
    if (serverIntake) {
      return mapSectionsToIntakeForm(serverIntake, serviceRequested, data);
    }
    return bookingIntakeData
      ? mergeWithStoredData(bookingIntakeData, serviceRequested)
      : defaultValues;
  }, [serverIntake, bookingIntakeData, serviceRequested, data, defaultValues]);

  const status = useMemo(
    () => resolveCompletionStatus(reviewValues, serverIntake),
    [reviewValues, serverIntake],
  );

  const sections = useMemo(
    () => [
      {
        id: "personalDetails" as const,
        title: "Personal Information",
        isComplete: status.isPersonalComplete,
      },
      {
        id: "requestDetails" as const,
        title: "Service Request",
        isComplete: status.isServiceComplete,
      },
      {
        id: "additionalInfo" as const,
        title: "Additional Info",
        isComplete: status.isAdditionalComplete,
      },
    ],
    [status],
  );

  // Hydrate from localStorage on mount. Review mode skips this: it has no local
  // draft to restore (submit clears it) and hydrates from the server below.
  useEffect(() => {
    if (readOnly) return;
    const saved = localStorage.getItem(`intake_${bookingId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        reset(mergeWithStoredData(parsed, serviceRequested));
        setTimeout(() => clearErrors(), 0);
      } catch (e) {
        console.error("Failed to load saved form data", e);
      }
    }
  }, [bookingId, setData, reset, clearErrors, serviceRequested, readOnly]);

  // Push the server's intake into the editable form too, so a returning patient
  // edits what the backend actually holds instead of a stale local draft.
  // Applied once per booking, and never over unsaved edits, so a late response
  // cannot wipe whatever the patient is typing right now.
  const serverHydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!serverIntake) return;
    if (serverHydratedFor.current === bookingId) return;
    if (!readOnly && formState.isDirty) return;

    serverHydratedFor.current = bookingId;
    // Current form values are the base, so the fields the contract cannot carry
    // back (name, date of birth, height, weight, diet — folded into
    // `medicalHistory` as prose) keep whatever the draft or the profile prefill
    // already put there. Server values still win wherever the server has them.
    reset(mapSectionsToIntakeForm(serverIntake, serviceRequested, getValues()));
    setTimeout(() => clearErrors(), 0);
  }, [
    serverIntake,
    bookingId,
    readOnly,
    formState.isDirty,
    getValues,
    reset,
    clearErrors,
    serviceRequested,
  ]);

  const isCurrentSectionInvalid = useMemo(() => {
    if (readOnly) return false;
    const currentSectionKey = sections[currentSection]?.id;
    if (!currentSectionKey) return false;
    const sectionErrors =
      formState.errors[currentSectionKey as keyof typeof formState.errors];
    return !!(sectionErrors && Object.keys(sectionErrors).length > 0);
  }, [formState, currentSection, sections, readOnly]);

  const handleNavigation = async (direction: "next" | "back") => {
    const currentSectionKey = sections[currentSection]
      .id as keyof DynamicIntakeFormValues;
    const currentFields = getValues(currentSectionKey);

    updateSection(currentSectionKey, currentFields);

    if (direction === "back") {
      setCurrentSection((prev) => prev - 1);
      return;
    }

    const isStepValid = await trigger(currentSectionKey);
    if (!isStepValid) {
      setTimeout(() => {
        const firstError = document.querySelector(".border-orange-500");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    // Persist the completed section before moving on, so a reload or a device
    // change does not lose it. A rejected save blocks the advance instead of
    // silently dropping the answers.
    if (persistSteps) {
      setSubmitError(null);
      setIsSaving(true);
      try {
        await saveStepMutation.mutateAsync({
          section: currentSectionKey,
          values: getValues(),
        });
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "We could not save this section. Please try again.",
        );
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentSection < sections.length - 1) {
      if (window.scrollY > 300) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setCurrentSection((prev) => prev + 1);
    } else {
      methods.handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (values: DynamicIntakeFormValues) => {
    setIsSaving(true);
    setSubmitError(null);
    try {
      if (submitHandler) {
        await submitHandler(values);
      } else {
        await submitIntakeMutation.mutateAsync(values);
      }
      localStorage.removeItem(`intake_${bookingId}`);
      clearStore();

      if (onComplete) {
        onComplete();
      } else {
        router.push(`/patient/booking/getBooking/${bookingId}`);
      }
    } catch (error) {
      // Surface the backend message (409 already submitted, 422 incomplete)
      // rather than a generic failure the patient cannot act on.
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not submit your intake form. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = (sectionId: (typeof sections)[0]["id"]) => {
    // Read-only sections render the HYDRATED values (server first, then the
    // local draft), not `booking.intakeData`, which is never populated by the
    // booking endpoints.
    const sectionData = reviewValues[sectionId];

    if (readOnly) {
      switch (sectionId) {
        case "personalDetails":
          return (
            <ReadOnlyPersonDataSection
              data={sectionData as DynamicIntakeFormValues["personalDetails"]}
            />
          );
        case "requestDetails":
          return (
            <ReadOnlyServiceRequestSection
              data={sectionData as DynamicIntakeFormValues["requestDetails"]}
              serviceType={serviceRequested}
            />
          );
        case "additionalInfo":
          return (
            <ReadOnlyAdditionalInfoSection
              data={sectionData as DynamicIntakeFormValues["additionalInfo"]}
            />
          );
        default:
          return null;
      }
    } else {
      switch (sectionId) {
        case "personalDetails":
          return <PersonDataSection userProfile={profile} mode="booking" />;
        case "requestDetails":
          return <ServiceRequestSection serviceType={serviceRequested} />;
        case "additionalInfo":
          return <AdditionalInfoSection />;
        default:
          return null;
      }
    }
  };

  // Never render the review skeleton of a form we have not read yet — that is
  // what produced a page full of em-dashes while the request was in flight.
  if (readOnly && intakeQuery.isLoading) {
    return (
      <div className="space-y-3" data-slot="intake-review-loading">
        <p className="text-sm text-muted-foreground">
          Loading your submitted intake…
        </p>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-24 animate-pulse rounded-lg border border-border bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className={cn(readOnly && "space-y-6")}>
        {!readOnly && (
          <div className="sticky top-0 right-0 left-0 z-10 border-b border-(--border-subtle) bg-(--surface-card) py-3 lg:static lg:pt-0">
            <div className="flex items-center gap-3 px-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <h1 className="font-display text-base font-semibold text-(--text-heading)">
                    Health Intake Form
                  </h1>
                  <span className="text-xs text-(--text-subtle)">
                    {currentSection + 1}/{sections.length}
                  </span>
                </div>
                <ProgressStepper currentSection={currentSection} />
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            !readOnly
              ? "flex-1 px-4 py-4 pb-32 lg:px-0 lg:pb-4"
              : "flex flex-col gap-2",
          )}
        >
          {sections.map((section, idx) => {
            const isVisible = readOnly || idx === currentSection;
            if (!isVisible) return null;

            return (
              <div
                key={section.id}
                className={cn(
                  readOnly &&
                    "rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-sm)",
                  !readOnly && idx !== currentSection && "hidden",
                )}
              >
                {readOnly && (
                  <div className="mb-4 flex items-center justify-between border-b border-(--border-subtle) pb-2">
                    <h3 className="text-sm font-semibold text-(--text-heading)">
                      {section.title}
                    </h3>
                    {/* Reflects the hydrated data — never a blanket "Complete". */}
                    <Badge
                      variant="outline"
                      className={cn(
                        section.isComplete
                          ? "border-(--teal-200) bg-(--teal-100) text-(--teal-800)"
                          : "border-(--gold-400) bg-(--gold-100) text-(--gold-700)",
                      )}
                    >
                      {section.isComplete ? (
                        <Check className="mr-1 size-3" />
                      ) : (
                        <X className="mr-1 size-3" />
                      )}
                      {section.isComplete ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                )}

                {renderSection(section.id)}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <IntakeNavFooter
            className="lg:pt-4"
            backTo={currentSection > 0 ? sections[currentSection - 1].title : undefined}
            onBack={() => void handleNavigation("back")}
            continueTo={sections[currentSection + 1]?.title}
            onContinue={() => void handleNavigation("next")}
            isFinal={currentSection === sections.length - 1}
            finalLabel="Submit form"
            pending={isSaving}
            blockedReason={
              isCurrentSectionInvalid
                ? "Fix the highlighted fields to continue."
                : null
            }
          >
            {submitError && (
              <p
                role="alert"
                data-slot="intake-form-error"
                className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {submitError}
              </p>
            )}
          </IntakeNavFooter>
        )}
      </div>
    </FormProvider>
  );
}
