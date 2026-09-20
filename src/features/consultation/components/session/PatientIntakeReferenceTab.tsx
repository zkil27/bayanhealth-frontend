"use client";

import { useCallback } from "react";
import {
  Baby,
  FileQuestion,
  ListChecks,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ageFromDateOfBirth,
  fetchBookingIntake,
  SEX_LABELS,
  usableAllergyLabel,
  type BookingIntakeForm,
  type IntakeReproductiveHealth,
  type IntakeSafetyScreen,
  type IntakeStructuredMedicalHistory,
  type IntakeSymptomReview,
  type IntakeVitals,
} from "@/features/doctor/lib/api/bookingIntake";
import { parseMedicalHistoryLines } from "@/features/consultation/components/postConsultation/PatientDetails";
import {
  CYCLE_PATTERN_LABELS,
  PREGNANCY_POSSIBILITY_LABELS,
  SUPPRESSED_BASELINE_HISTORY_LABELS,
  SYMPTOM_REVIEW_FIELDS,
  knownConditionLabels,
} from "@/features/consultation/lib/intakeDisplay";

/**
 * Doctor-facing "Patient Intake Reference" tab for the live consultation room.
 *
 * Reads the same `GET /v1/bookings/{bookingId}/intake` the pre-consult queue
 * (`ReadyIntakeContent`) and the post-consult workspace (`PatientDetails`)
 * already read. The room gets its own layout (structured triage cards sized
 * for a narrow drawer) rather than reusing `PatientDetails` directly, but
 * every value below is real: nothing here invents a name, a complaint, or an
 * allergy the patient did not submit, and an unanswered red-flag question is
 * never drawn as a negative answer.
 */
export function PatientIntakeReferenceTab({ bookingId }: { bookingId: string }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchBookingIntake(idToken ?? "", bookingId),
    [idToken, bookingId],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-xs" data-slot="room-patient-intake">
      <AsyncView<BookingIntakeForm | null>
        fetcher={fetcher}
        deps={[idToken, bookingId]}
        empty={<NoIntakePanel />}
      >
        {(form) =>
          form ? (
            <>
              <RedFlagCard screen={form.sections?.details?.safetyScreen} />
              <ChiefComplaintCard form={form} />
              <SymptomReviewCard review={form.sections?.details?.symptomReview} />
              <AllergyCard allergies={form.sections?.details?.allergies} />
              <MedicalHistoryCard history={form.sections?.details?.structuredMedicalHistory} />
              <ReproductiveHealthCard health={form.sections?.details?.reproductiveHealth} />
              <VitalsCard vitals={form.sections?.details?.vitals} />
              <BaselineCard form={form} />
            </>
          ) : (
            <NoIntakePanel />
          )
        }
      </AsyncView>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
      {children}
    </span>
  );
}

/**
 * Red-flag screening, in three real states rather than two: reported,
 * cleared, and unasked. The deterministic router already treats an absent
 * answer as a non-match, so drawing "not asked" as "no" here would hide the
 * same gap from the physician the router already refuses to hide from
 * itself.
 */
function RedFlagCard({ screen }: { screen?: IntakeSafetyScreen }) {
  const chestPain = screen?.chestPain;
  const dyspnea = screen?.dyspnea;
  const feverDays = screen?.feverDays;

  const anyAnswered =
    typeof chestPain === "boolean" || typeof dyspnea === "boolean" || typeof feverDays === "number";
  const anyPositive = chestPain === true || dyspnea === true || (typeof feverDays === "number" && feverDays > 0);
  const anyUnasked =
    typeof chestPain !== "boolean" || typeof dyspnea !== "boolean" || typeof feverDays !== "number";

  const tone = !anyAnswered
    ? "amber"
    : anyPositive
      ? "rose"
      : anyUnasked
        ? "amber"
        : "teal";

  const toneClasses = {
    teal: "bg-(--status-available-bg) border-(--status-available-fg)/30 text-(--status-available-fg)",
    rose: "bg-(--danger-bg) border-(--danger-border)/30 text-(--danger-fg)",
    amber: "bg-(--status-soon-bg) border-(--status-soon-fg)/30 text-(--status-soon-fg)",
  }[tone];

  const chipToneClasses = {
    teal: "border-(--status-available-fg)/30 text-(--status-available-fg)",
    rose: "border-(--danger-border)/30 text-(--danger-fg)",
    amber: "border-(--status-soon-fg)/30 text-(--status-soon-fg)",
  }[tone];

  const headline = !anyAnswered
    ? "Red-flag screening not answered"
    : anyPositive
      ? "Red flag reported"
      : anyUnasked
        ? "Screening incomplete — treat as unscreened"
        : "No red flags reported";

  const Icon = tone === "teal" ? ShieldCheck : tone === "rose" ? ShieldAlert : TriangleAlert;

  return (
    <div
      className={`space-y-1.5 rounded-2xl border p-3.5 ${toneClasses}`}
      data-slot="room-intake-red-flags"
    >
      <div className="flex items-center gap-1.5 font-bold">
        <Icon className="size-3.5 shrink-0" />
        <span>{headline}</span>
      </div>
      {anyAnswered ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span
            className={`rounded-md border bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold ${chipToneClasses}`}
          >
            Chest pain: {chestPain === undefined ? "not asked" : chestPain ? "Yes" : "No"}
          </span>
          <span
            className={`rounded-md border bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold ${chipToneClasses}`}
          >
            Shortness of breath: {dyspnea === undefined ? "not asked" : dyspnea ? "Yes" : "No"}
          </span>
          <span
            className={`rounded-md border bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold ${chipToneClasses}`}
          >
            {typeof feverDays === "number"
              ? feverDays === 0
                ? "No fever"
                : `Fever ${feverDays} day${feverDays === 1 ? "" : "s"}`
              : "Fever: not asked"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ChiefComplaintCard({ form }: { form: BookingIntakeForm }) {
  const purpose = form.sections?.purpose;
  const chiefComplaint = purpose?.chiefComplaint?.trim();
  const tags = purpose?.complaintTags ?? [];

  return (
    <div data-slot="room-intake-chief-complaint">
      <SectionLabel>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <MessageSquare className="size-3.5 shrink-0 text-(--text-subtle)" />
          Reported chief concern
        </span>
      </SectionLabel>
      <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
        <p className="text-xs leading-relaxed font-semibold text-(--text-heading)">
          {chiefComplaint ? `“${chiefComplaint}”` : <NotAnswered />}
        </p>
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-(--border-subtle) pt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-medium text-(--text-body)"
              >
                {tag.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AllergyCard({ allergies }: { allergies?: string }) {
  const trimmed = allergies?.trim();
  const usable = usableAllergyLabel(allergies);

  return (
    <div data-slot="room-intake-allergies">
      <SectionLabel>Allergies &amp; sensitivities</SectionLabel>
      <div
        className={`rounded-xl border p-3 text-xs font-bold ${
          usable
            ? "border-(--danger-border)/40 bg-(--danger-bg) text-(--danger-fg)"
            : "border-(--border-subtle) bg-(--surface-card) text-(--text-body)"
        }`}
      >
        {usable ? (
          <>⚠ {usable}</>
        ) : trimmed ? (
          "No known drug allergies reported"
        ) : (
          <NotAnswered />
        )}
      </div>
    </div>
  );
}

function VitalsCard({ vitals }: { vitals?: IntakeVitals }) {
  const hasVitals = Boolean(
    vitals?.temperatureC || vitals?.systolicBp || vitals?.heartRateBpm || vitals?.spo2Percent,
  );

  return (
    <div data-slot="room-intake-vitals">
      <SectionLabel>Self-reported vitals</SectionLabel>
      {hasVitals ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <VitalTile label="Temp" value={vitals?.temperatureC ? `${vitals.temperatureC}°C` : "—"} />
          <VitalTile
            label="BP"
            value={
              vitals?.systolicBp
                ? `${vitals.systolicBp}/${vitals.diastolicBp ?? "—"}`
                : "—"
            }
          />
          <VitalTile label="Pulse" value={vitals?.heartRateBpm ? `${vitals.heartRateBpm} bpm` : "—"} />
          <VitalTile label="SpO₂" value={vitals?.spo2Percent ? `${vitals.spo2Percent}%` : "—"} />
        </div>
      ) : (
        <p className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 text-(--text-muted) italic">
          No vitals logged during intake.
        </p>
      )}
    </div>
  );
}

function VitalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2">
      <span className="block text-[9px] font-bold text-(--text-subtle) uppercase">{label}</span>
      <span className="text-xs font-bold text-(--text-heading)">{value}</span>
    </div>
  );
}

function BaselineCard({ form }: { form: BookingIntakeForm }) {
  const details = form.sections?.details;
  const demographics = details?.demographics;
  const age = ageFromDateOfBirth(demographics?.dateOfBirth);
  const sex = demographics?.sex ? SEX_LABELS[demographics.sex] : undefined;
  const medications = details?.medications?.trim();
  const baseline = details?.baselineMeasurements;
  const historyRows = parseMedicalHistoryLines(details?.medicalHistory).filter(
    (row) => !(baseline && SUPPRESSED_BASELINE_HISTORY_LABELS.has(row.label)),
  );

  return (
    <div data-slot="room-intake-baseline">
      <SectionLabel>Baseline information</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3.5 text-[11px]">
        {form.patientName ? (
          <div>
            <span className="block text-(--text-subtle)">Patient name</span>
            <span className="font-bold text-(--text-heading)">{form.patientName}</span>
          </div>
        ) : null}
        <div>
          <span className="block text-(--text-subtle)">Age &amp; sex</span>
          <span className="font-bold text-(--text-heading)">
            {typeof age === "number" ? `${age} y/o` : "—"}
            {sex ? ` · ${sex}` : ""}
            {age === undefined && !sex ? <NotAnswered /> : null}
          </span>
        </div>
        {baseline ? (
          <div>
            <span className="block text-(--text-subtle)">Height &amp; weight</span>
            <span className="font-bold text-(--text-heading)">
              {baseline.heightCm} cm · {baseline.weightKg} kg
              {baseline.selfReported ? (
                <span className="ml-1 font-normal text-(--text-subtle)">(self-reported)</span>
              ) : null}
            </span>
          </div>
        ) : null}
        <div>
          <span className="block text-(--text-subtle)">Current medications</span>
          <span className="font-semibold text-(--text-body)">
            {medications || <NotAnswered />}
          </span>
        </div>
        {historyRows.map((row) => (
          <div key={row.label}>
            <span className="block text-(--text-subtle)">{row.label}</span>
            <span className="font-semibold text-(--text-body)">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Structured medical-history checklist — the known-conditions multi-select the
 * updated intake form collects, distinct from the free-text `medicalHistory`
 * block. `noneReported` is an explicit patient assertion and is rendered as
 * one, not left blank.
 */
function MedicalHistoryCard({ history }: { history?: IntakeStructuredMedicalHistory }) {
  if (!history) return null;
  const conditionLabels = knownConditionLabels(history);

  return (
    <div data-slot="room-intake-medical-history">
      <SectionLabel>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <ListChecks className="size-3.5 shrink-0 text-(--text-subtle)" />
          Known medical conditions
        </span>
      </SectionLabel>
      <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
        {history.noneReported ? (
          <p className="text-xs font-semibold text-(--text-body)">
            No known medical conditions reported
          </p>
        ) : conditionLabels.length > 0 || history.other ? (
          <div className="flex flex-wrap gap-1.5">
            {conditionLabels.map((label) => (
              <span
                key={label}
                className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold text-(--text-body)"
              >
                {label}
              </span>
            ))}
            {history.other ? (
              <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold text-(--text-body)">
                {history.other}
              </span>
            ) : null}
          </div>
        ) : (
          <NotAnswered />
        )}
        {history.details ? (
          <p className="mt-2 border-t border-(--border-subtle) pt-2 text-xs leading-relaxed text-(--text-muted)">
            {history.details}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Extended symptom review (OLDCART-style follow-up beyond the base OLDCART
 * fields folded into `oldcart`) the updated intake form collects for
 * teleconsult and sick-leave bookings.
 */
function SymptomReviewCard({ review }: { review?: IntakeSymptomReview }) {
  if (!review) return null;
  const rows = SYMPTOM_REVIEW_FIELDS.filter(({ key }) => review[key]);
  if (rows.length === 0 && typeof review.painSeverity !== "number") return null;

  return (
    <div data-slot="room-intake-symptom-review">
      <SectionLabel>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <Stethoscope className="size-3.5 shrink-0 text-(--text-subtle)" />
          Symptom review
        </span>
      </SectionLabel>
      <div className="space-y-2 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
        {typeof review.painSeverity === "number" ? (
          <span className="inline-flex rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-bold text-(--text-body)">
            Pain severity: {review.painSeverity}/10
          </span>
        ) : null}
        {rows.map(({ key, label }) => (
          <div key={key}>
            <span className="block text-[10px] font-bold text-(--text-subtle) uppercase">{label}</span>
            <span className="text-xs leading-relaxed text-(--text-body)">{review[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reproductive-health screening, present only when the patient answered it. */
function ReproductiveHealthCard({ health }: { health?: IntakeReproductiveHealth }) {
  if (!health) return null;

  return (
    <div data-slot="room-intake-reproductive-health">
      <SectionLabel>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <Baby className="size-3.5 shrink-0 text-(--text-subtle)" />
          Reproductive health
        </span>
      </SectionLabel>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
        <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold text-(--text-body)">
          Pregnancy possibility: {PREGNANCY_POSSIBILITY_LABELS[health.pregnancyPossibility] ?? health.pregnancyPossibility}
        </span>
        {health.cyclePattern ? (
          <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold text-(--text-body)">
            Cycle: {CYCLE_PATTERN_LABELS[health.cyclePattern] ?? health.cyclePattern}
          </span>
        ) : null}
        {health.lastMenstrualPeriod ? (
          <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10px] font-semibold text-(--text-body)">
            Last menstrual period: {health.lastMenstrualPeriod}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NotAnswered() {
  return <span className="text-(--text-subtle) italic">Not answered</span>;
}

function NoIntakePanel() {
  return (
    <div
      data-slot="room-intake-empty"
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-(--border-subtle) bg-(--surface-card) p-8 text-center"
    >
      <FileQuestion className="size-6 text-(--text-subtle)" />
      <p className="text-sm font-medium text-(--text-heading)">No intake submitted yet</p>
      <p className="text-xs text-(--text-muted)">
        The patient has not completed their intake form for this booking.
      </p>
    </div>
  );
}
