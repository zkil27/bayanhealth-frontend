"use client";

import { useCallback } from "react";
import { AlertTriangle, FileQuestion, Quote } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  fetchBookingIntake,
  OLDCART_FIELDS,
  type BookingIntakeForm,
  type IntakeComplaintTag,
  type IntakeKnownCondition,
  type IntakeReproductiveHealth,
  type IntakeSafetyScreen,
  type IntakeStructuredMedicalHistory,
  type IntakeSymptomReview,
  type IntakeTextField,
  type IntakeVitals,
} from "../../lib/api/bookingIntake";

/**
 * Subjective panel for a queued booking — the patient's real submitted intake.
 *
 * This previously rendered a fixed migraine presentation: hardcoded chief
 * complaint, Tagalog verbatim quote, `quickScanTags`, and seven fixed OLDCART
 * entries, shown identically for every booking. It is the screen a physician
 * reads to judge intake quality, so fabricated content here is worse than an
 * empty panel. Everything below comes from
 * `GET /v1/bookings/{bookingId}/intake`; an unanswered field renders as
 * "Not answered" rather than as invented text.
 */
export function ReadyIntakeContent({ bookingId }: { bookingId: string }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchBookingIntake(idToken ?? "", bookingId),
    [idToken, bookingId],
  );

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] px-4">
      <div className="pb-70 md:pb-4">
        {/*
          A null result (no intake form yet, or a booking this doctor is not
          assigned to) resolves to AsyncView's `empty` state, not to `children`,
          because the default emptiness check counts null as zero records. The
          explicit slot is what keeps the message specific instead of generic.
        */}
        <AsyncView<BookingIntakeForm | null>
          fetcher={fetcher}
          deps={[idToken, bookingId]}
          empty={<NoIntakePanel />}
        >
          {(form) => (form ? <IntakePanel form={form} /> : <NoIntakePanel />)}
        </AsyncView>
      </div>
    </ScrollArea>
  );
}

function NoIntakePanel() {
  return (
    <Card className="h-fit w-full" data-slot="ready-intake-empty">
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <FileQuestion className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No intake submitted yet
        </p>
        <p className="text-xs text-muted-foreground">
          The patient has not completed their intake form for this booking.
        </p>
      </CardContent>
    </Card>
  );
}

function IntakePanel({ form }: { form: BookingIntakeForm }) {
  const purpose = form.sections.purpose;
  const details = form.sections.details;
  const showStructuredSymptoms = hasAnsweredSymptomReview(details?.symptomReview);

  return (
    <Card className="h-fit w-full" data-slot="ready-intake">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <Badge className="rounded-lg py-4 text-xl">[S]</Badge>
          Subjective
          <Badge variant="outline" className="capitalize">
            {form.status}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <section
          className="flex flex-col gap-3"
          aria-labelledby="current-concern-heading"
        >
          <h2
            id="current-concern-heading"
            className="text-sm font-semibold text-foreground"
          >
            Current Concern &amp; Safety
          </h2>
          <Field label="Chief complaint">
            <span className="text-base font-semibold text-foreground">
              {purpose?.chiefComplaint?.trim() || <NotAnswered />}
            </span>
          </Field>
          <Field label="Complaint tags">
            {purpose?.complaintTags?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {purpose.complaintTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {COMPLAINT_TAG_LABELS[tag]}
                  </Badge>
                ))}
              </div>
            ) : (
              <NotAnswered />
            )}
          </Field>

          {purpose?.patientVerbatim?.trim() ? (
            <div className="flex w-full flex-col">
              <h3 className="text-xs text-muted-foreground">Patient verbatim</h3>
              <div className="flex gap-1 border-l border-border">
                <Quote className="mt-1 ml-1 size-3 shrink-0 text-muted-foreground" />
                <p className="w-full rounded-lg bg-muted p-2 text-muted-foreground italic">
                  {purpose.patientVerbatim}
                </p>
              </div>
            </div>
          ) : null}

          {/* Safety is intentionally outside the accordion and can never be collapsed. */}
          <SafetyScreen screen={details?.safetyScreen} />
          <VitalsGroup title="Current measurements" vitals={details?.vitals} />
        </section>

        <Accordion
          defaultValue={["about", "medical-history", "symptoms", "reproductive"]}
          className="rounded-lg border border-border px-3"
        >
          <ReviewSection value="about" title="About & Baseline">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Date of birth">
                {details?.demographics?.dateOfBirth || <NotAnswered />}
              </Field>
              <Field label="Sex at birth">
                {details?.demographics?.sex
                  ? SEX_AT_BIRTH_LABELS[details.demographics.sex]
                  : <NotAnswered />}
              </Field>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                Baseline measurements
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <MeasurementField
                  label="Height"
                  value={formatMeasurement(
                    details?.baselineMeasurements?.heightCm,
                    "cm",
                  )}
                />
                <MeasurementField
                  label="Weight"
                  value={formatMeasurement(
                    details?.baselineMeasurements?.weightKg,
                    "kg",
                  )}
                />
                <MeasurementField
                  label="Self-reported"
                  value={formatBoolean(details?.baselineMeasurements?.selfReported)}
                />
              </div>
              <VitalsGroup
                title="Baseline vital signs"
                vitals={details?.baselineMeasurements?.vitals}
              />
            </div>
          </ReviewSection>

          <ReviewSection value="medical-history" title="Medical History">
            <StructuredHistory history={details?.structuredMedicalHistory} />
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <h3 className="text-xs font-semibold text-foreground">
                Legacy intake fields
              </h3>
              <Field label="Current medications">
                {details?.medications?.trim() || <NotAnswered />}
              </Field>
              <Field label="Allergies">
                {details?.allergies?.trim() || <NotAnswered />}
              </Field>
              <Field label="Medical history">
                {details?.medicalHistory?.trim() || <NotAnswered />}
              </Field>
            </div>
          </ReviewSection>

          <ReviewSection value="symptoms" title="Symptom Review">
            {showStructuredSymptoms ? (
              <div className="flex flex-col gap-3">
                <StructuredSymptomReview review={details?.symptomReview} />
                <OldcartReview
                  oldcart={details?.oldcart ?? {}}
                  title="Additional OLDCART details"
                  answeredOnly
                />
              </div>
            ) : (
              <OldcartReview oldcart={details?.oldcart ?? {}} />
            )}
          </ReviewSection>

          <ReviewSection value="reproductive" title="Reproductive Context">
            <ReproductiveContext reproductive={details?.reproductiveHealth} />
          </ReviewSection>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function ReviewSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="font-semibold hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

function VitalsGroup({ title, vitals }: { title: string; vitals?: IntakeVitals }) {
  return (
    <div className="flex flex-col gap-2" data-slot="intake-vitals">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <MeasurementField
          label="Temperature"
          value={formatMeasurement(vitals?.temperatureC, "°C")}
        />
        <MeasurementField
          label="Systolic blood pressure"
          value={formatMeasurement(vitals?.systolicBp, "mmHg")}
        />
        <MeasurementField
          label="Diastolic blood pressure"
          value={formatMeasurement(vitals?.diastolicBp, "mmHg")}
        />
        <MeasurementField
          label="Heart rate"
          value={formatMeasurement(vitals?.heartRateBpm, "bpm")}
        />
        <MeasurementField
          label="Oxygen saturation"
          value={formatMeasurement(vitals?.spo2Percent, "%")}
        />
      </div>
    </div>
  );
}

function MeasurementField({ label, value }: { label: string; value?: string }) {
  return (
    <Field label={label}>{value === undefined ? <NotAnswered /> : value}</Field>
  );
}

function StructuredHistory({
  history,
}: {
  history?: IntakeStructuredMedicalHistory;
}) {
  const conditions = history?.knownConditions ?? [];
  return (
    <div className="flex flex-col gap-2">
      <Field label="Known conditions">
        {history?.noneReported ? (
          "No known conditions reported"
        ) : conditions.length ? (
          conditions.map((condition) => CONDITION_LABELS[condition]).join(", ")
        ) : (
          <NotAnswered />
        )}
      </Field>
      <Field label="Other condition">
        {history?.other?.trim() || <NotAnswered />}
      </Field>
      <Field label="History details">
        {history?.details?.trim() || <NotAnswered />}
      </Field>
      <Field label="Current medications (structured history)">
        {history?.currentMedications?.trim() || <NotAnswered />}
      </Field>
    </div>
  );
}

function StructuredSymptomReview({ review }: { review?: IntakeSymptomReview }) {
  const fields: ReadonlyArray<[string, string | undefined]> = [
    ["Onset", review?.onset],
    ["Pattern", review?.pattern],
    ["Location", review?.location],
    ["Characteristics", review?.characteristics],
    ["Aggravating factors", review?.aggravatingFactors],
    ["Relieving factors", review?.relievingFactors],
    ["Associated symptoms", review?.associatedSymptoms],
    ["Treatments tried", review?.treatmentsTried],
  ];
  return (
    <div className="flex flex-col gap-2">
      <Field label="Pain severity">
        {typeof review?.painSeverity === "number" ? (
          review.painSeverity === 0 ? "0/10 — no pain" : `${review.painSeverity}/10`
        ) : (
          <NotAnswered />
        )}
      </Field>
      {fields.map(([label, value]) => (
        <Field key={label} label={label}>
          {value?.trim() || <NotAnswered />}
        </Field>
      ))}
    </div>
  );
}

function OldcartReview({
  oldcart,
  title = "OLDCART",
  answeredOnly = false,
}: {
  oldcart: Record<string, IntakeTextField | undefined>;
  title?: string;
  answeredOnly?: boolean;
}) {
  const fields = answeredOnly
    ? OLDCART_FIELDS.filter(({ key }) => Boolean(oldcart[key]?.text?.trim()))
    : OLDCART_FIELDS;
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {fields.map(({ key, label }) => (
        <Field key={key} label={label}>
          {oldcart[key]?.text?.trim() || <NotAnswered />}
        </Field>
      ))}
    </div>
  );
}

function ReproductiveContext({
  reproductive,
}: {
  reproductive?: IntakeReproductiveHealth;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Field label="Pregnancy possibility">
        {reproductive?.pregnancyPossibility
          ? PREGNANCY_LABELS[reproductive.pregnancyPossibility]
          : <NotAnswered />}
      </Field>
      <Field label="Last menstrual period">
        {reproductive?.lastMenstrualPeriod || <NotAnswered />}
      </Field>
      <Field label="Cycle pattern">
        {reproductive?.cyclePattern
          ? CYCLE_LABELS[reproductive.cyclePattern]
          : <NotAnswered />}
      </Field>
    </div>
  );
}

/**
 * Red-flag screening answers.
 *
 * Renders three states per question, never two: answered yes, answered no, and
 * not asked. Collapsing "not asked" into "no" is the exact mistake the
 * structured screening exists to prevent — the deterministic router already
 * treats an absent answer as a non-match, so a UI that also shows it as
 * negative would hide the gap from the physician too.
 */
function SafetyScreen({ screen }: { screen?: IntakeSafetyScreen }) {
  const answered =
    screen &&
    (typeof screen.chestPain === "boolean" ||
      typeof screen.dyspnea === "boolean" ||
      typeof screen.feverDays === "number");

  return (
    <div
      className="flex flex-col gap-2 border-t border-border pt-3"
      data-slot="intake-safety-screen"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
        Red-flag screening
      </h2>

      {!answered ? (
        <p className="text-xs text-muted-foreground">
          Not answered — treat as unscreened, not as negative.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <ScreenAnswer label="Chest pain" value={screen?.chestPain} />
          <ScreenAnswer label="Shortness of breath" value={screen?.dyspnea} />
          {typeof screen?.feverDays === "number" ? (
            <Badge variant="outline">
              {screen.feverDays === 0
                ? "No fever"
                : `Fever ${screen.feverDays} day${screen.feverDays === 1 ? "" : "s"}`}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Fever: not asked
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenAnswer({ label, value }: { label: string; value?: boolean }) {
  if (value === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {label}: not asked
      </Badge>
    );
  }
  return (
    <Badge variant={value ? "destructive" : "outline"}>
      {label}: {value ? "Yes" : "No"}
    </Badge>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <h3 className="text-xs text-muted-foreground">{label}</h3>
      <div className="border-l border-border py-1 pl-3 text-sm">{children}</div>
    </div>
  );
}

function NotAnswered() {
  return <span className="text-muted-foreground italic">Not answered</span>;
}

function formatMeasurement(value: number | undefined, unit: string) {
  if (typeof value !== "number") return undefined;
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

function formatBoolean(value: boolean | undefined) {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : undefined;
}

function hasAnsweredSymptomReview(review: IntakeSymptomReview | undefined) {
  if (!review) return false;
  if (typeof review.painSeverity === "number") return true;
  return [
    review.onset,
    review.pattern,
    review.location,
    review.characteristics,
    review.aggravatingFactors,
    review.relievingFactors,
    review.associatedSymptoms,
    review.treatmentsTried,
  ].some((value) => Boolean(value?.trim()));
}

function humanize(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const COMPLAINT_TAG_LABELS = Object.fromEntries(
  [
    "fever",
    "cough",
    "colds",
    "sore_throat",
    "headache",
    "dizziness",
    "chest_discomfort",
    "breathing_concern",
    "abdominal_pain",
    "nausea_or_vomiting",
    "diarrhea",
    "urinary_concern",
    "skin_concern",
    "musculoskeletal_pain",
    "fatigue",
    "reproductive_health",
    "mental_health",
    "medication_request",
    "other",
  ].map((value) => [value, humanize(value)]),
) as Record<IntakeComplaintTag, string>;

const CONDITION_LABELS = Object.fromEntries(
  [
    "hypertension",
    "diabetes",
    "asthma",
    "heart_disease",
    "stroke",
    "kidney_disease",
    "liver_disease",
    "cancer",
    "thyroid_disorder",
    "seizure_disorder",
    "bleeding_disorder",
    "mental_health_condition",
    "other",
  ].map((value) => [value, humanize(value)]),
) as Record<IntakeKnownCondition, string>;

const SEX_AT_BIRTH_LABELS = {
  male: "Male",
  female: "Female",
  prefer_not_to_say: "Prefer not to say",
} as const;

const PREGNANCY_LABELS: Record<
  IntakeReproductiveHealth["pregnancyPossibility"],
  string
> = {
  possible: "Possible",
  not_possible: "Not possible",
  not_applicable: "Not applicable",
  unsure: "Unsure",
  prefer_not_to_say: "Prefer not to say",
};

const CYCLE_LABELS: Record<
  NonNullable<IntakeReproductiveHealth["cyclePattern"]>,
  string
> = {
  regular: "Regular",
  irregular: "Irregular",
  absent: "Absent",
  not_applicable: "Not applicable",
  unsure: "Unsure",
  prefer_not_to_say: "Prefer not to say",
};
