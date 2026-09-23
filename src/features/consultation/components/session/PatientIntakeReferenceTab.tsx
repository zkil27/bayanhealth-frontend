"use client";

import { useCallback } from "react";
import {
  Activity,
  Baby,
  CheckCircle2,
  FileQuestion,
  ListChecks,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
    <div className="p-3 sm:p-3.5 text-xs flex-1 min-h-0 flex flex-col" data-slot="room-patient-intake">
      <AsyncView<BookingIntakeForm | null>
        fetcher={fetcher}
        deps={[idToken, bookingId]}
        empty={<NoIntakePanel />}
        className="flex-1 min-h-0 flex flex-col"
      >
        {(form) =>
          form ? (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3">
              <RedFlagCard screen={form.sections?.details?.safetyScreen} />
              <ChiefComplaintCard form={form} />
              <SymptomReviewCard review={form.sections?.details?.symptomReview} />

              {/* Side-by-side Allergies & Known Conditions */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 min-h-fit">
                <AllergyCard allergies={form.sections?.details?.allergies} />
                <MedicalHistoryCard history={form.sections?.details?.structuredMedicalHistory} />
              </div>

              {form.sections?.details?.reproductiveHealth ? (
                <ReproductiveHealthCard health={form.sections?.details?.reproductiveHealth} />
              ) : null}

              <VitalsCard vitals={form.sections?.details?.vitals} />
              <BaselineCard form={form} />
            </div>
          ) : (
            <NoIntakePanel />
          )
        }
      </AsyncView>
    </div>
  );
}

/**
 * Compact Red-flag screening horizontal banner.
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

  const headline = !anyAnswered
    ? "Red-flag screening not answered"
    : anyPositive
      ? "Red flag reported"
      : anyUnasked
        ? "Screening incomplete"
        : "No red flags reported";

  const Icon = tone === "teal" ? ShieldCheck : tone === "rose" ? ShieldAlert : TriangleAlert;

  return (
    <div
      className={cn("rounded-xl border px-3.5 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs shrink-0", toneClasses)}
      data-slot="room-intake-red-flags"
    >
      <div className="flex items-center gap-2 font-bold text-xs">
        <Icon className="size-4 shrink-0" />
        <span>{headline}</span>
      </div>
      {anyAnswered ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-medium",
              chestPain === true
                ? "border-(--danger-border)/50 bg-rose-100/90 text-rose-900 font-bold"
                : "border-(--border-subtle) bg-(--surface-card) text-(--text-body)"
            )}
          >
            Chest pain: <strong className="font-semibold">{chestPain === undefined ? "—" : chestPain ? "Yes" : "No"}</strong>
          </span>
          <span
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-medium",
              dyspnea === true
                ? "border-(--danger-border)/50 bg-rose-100/90 text-rose-900 font-bold"
                : "border-(--border-subtle) bg-(--surface-card) text-(--text-body)"
            )}
          >
            Shortness of breath: <strong className="font-semibold">{dyspnea === undefined ? "—" : dyspnea ? "Yes" : "No"}</strong>
          </span>
          <span
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
              typeof feverDays === "number" && feverDays > 0
                ? "border-(--danger-border)/50 bg-rose-100/90 text-rose-900 font-bold"
                : "border-(--border-subtle) bg-(--surface-card) text-(--text-body)"
            )}
          >
            {typeof feverDays === "number"
              ? feverDays === 0
                ? "No fever"
                : `Fever ${feverDays}d`
              : "Fever: —"}
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
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 min-h-fit flex flex-col justify-center" data-slot="room-intake-chief-complaint">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <MessageSquare className="size-3 text-(--surface-nav)" />
        <span>Reported Chief Concern</span>
      </div>
      <p className="border-l-2 border-(--surface-nav-accent) pl-2.5 text-xs sm:text-[13px] font-semibold leading-relaxed text-(--text-heading)">
        {chiefComplaint ? `“${chiefComplaint}”` : <NotAnswered />}
      </p>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-(--border-subtle)/60 pt-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-[10.5px] font-medium text-(--text-muted)"
            >
              {tag.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SymptomReviewCard({ review }: { review?: IntakeSymptomReview }) {
  if (!review) return null;
  const rows = SYMPTOM_REVIEW_FIELDS.filter(({ key }) => review[key]);
  if (rows.length === 0 && typeof review.painSeverity !== "number") return null;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 min-h-fit flex flex-col justify-center" data-slot="room-intake-symptom-review">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="size-3 text-(--surface-nav)" />
          <span>Symptom Review</span>
        </div>
        {typeof review.painSeverity === "number" ? (
          <span className="rounded-md border border-(--border-subtle) bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 text-[10.5px] font-bold text-(--text-body)">
            Pain: {review.painSeverity}/10
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {rows.map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-(--border-subtle)/60 bg-slate-50/70 dark:bg-slate-900/40 p-2 sm:p-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-(--text-muted) mb-0.5">{label}</span>
            <span className="text-xs font-semibold leading-snug text-(--text-heading) block truncate">
              {review[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllergyCard({ allergies }: { allergies?: string }) {
  const trimmed = allergies?.trim();
  const isNoKnown =
    !trimmed ||
    /^(none|no known|nkda|n\/a|no drug allergies|none reported)/i.test(trimmed);
  const usable = isNoKnown ? undefined : usableAllergyLabel(allergies);

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 flex flex-col justify-between" data-slot="room-intake-allergies">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <ShieldAlert className="size-3 text-(--surface-nav)" />
        <span>Allergies</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs sm:text-[13px]">
        {usable ? (
          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs truncate block">
            {usable}
          </span>
        ) : trimmed ? (
          <span className="flex items-center gap-1 text-emerald-800 text-xs sm:text-[13px] font-semibold truncate">
            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
            NKDA (No known)
          </span>
        ) : (
          <NotAnswered />
        )}
      </div>
    </div>
  );
}

function MedicalHistoryCard({ history }: { history?: IntakeStructuredMedicalHistory }) {
  if (!history) return null;
  const conditionLabels = knownConditionLabels(history);

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 flex flex-col justify-between" data-slot="room-intake-medical-history">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <ListChecks className="size-3 text-(--surface-nav)" />
        <span>Conditions</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs sm:text-[13px]">
        {history.noneReported ? (
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] font-medium truncate">
            <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
            None reported
          </span>
        ) : conditionLabels.length > 0 || history.other ? (
          <span className="text-xs sm:text-[13px] font-semibold text-(--text-heading) truncate block">
            {[...conditionLabels, history.other].filter(Boolean).join(", ")}
          </span>
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
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 min-h-fit flex flex-col justify-center" data-slot="room-intake-vitals">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <Activity className="size-3 text-(--surface-nav)" />
        <span>Self-Reported Vitals</span>
      </div>
      {hasVitals ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <VitalTile
            label="Temp"
            value={vitals?.temperatureC ? `${vitals.temperatureC}°C` : "—"}
            isElevated={typeof vitals?.temperatureC === "number" && vitals.temperatureC >= 38.0}
          />
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
        <p className="rounded-lg border border-(--border-subtle) bg-(--surface-card) p-2 text-(--text-muted) italic text-xs">
          No vitals logged.
        </p>
      )}
    </div>
  );
}

function VitalTile({
  label,
  value,
  isElevated = false,
}: {
  label: string;
  value: string;
  isElevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2 sm:p-2.5 shadow-2xs transition-colors flex flex-col items-center justify-center",
        isElevated
          ? "border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 ring-1 ring-amber-300/50"
          : "border-(--border-subtle) bg-slate-50/50 dark:bg-slate-900/30"
      )}
    >
      <span
        className={cn(
          "block text-[9px] font-bold uppercase tracking-wider mb-0.5",
          isElevated ? "text-amber-800 dark:text-amber-300" : "text-(--text-muted)"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-xs sm:text-sm font-bold tracking-tight",
          isElevated ? "font-extrabold text-amber-950 dark:text-amber-200" : "text-(--text-heading)"
        )}
      >
        {value}
      </span>
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

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 sm:p-3.5 shadow-2xs flex-1 min-h-fit flex flex-col justify-center" data-slot="room-intake-baseline">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
        <User className="size-3 text-(--surface-nav)" />
        <span>Baseline Information</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="block text-[9px] font-semibold text-(--text-muted) uppercase mb-0.5">Patient</span>
          <span className="font-bold text-(--text-heading) truncate block text-xs sm:text-[13px]">{form.patientName ?? "—"}</span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold text-(--text-muted) uppercase mb-0.5">Age &amp; Sex</span>
          <span className="font-bold text-(--text-heading) truncate block text-xs sm:text-[13px]">
            {typeof age === "number" ? `${age} y/o` : "—"}{sex ? ` · ${sex}` : ""}
          </span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold text-(--text-muted) uppercase mb-0.5">Medications</span>
          <span className="font-semibold text-(--text-body) truncate block text-xs">
            {medications || "None reported"}
          </span>
        </div>
        <div>
          <span className="block text-[9px] font-semibold text-(--text-muted) uppercase mb-0.5">Body Metrics</span>
          <span className="font-semibold text-(--text-heading) truncate block text-xs">
            {baseline ? `${baseline.heightCm}cm · ${baseline.weightKg}kg` : "Not logged"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Reproductive-health screening, present only when the patient answered it. */
function ReproductiveHealthCard({ health }: { health?: IntakeReproductiveHealth }) {
  if (!health) return null;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-1.5 shadow-2xs" data-slot="room-intake-reproductive-health">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-(--text-muted)">
        <Baby className="size-2.5 text-(--surface-nav)" />
        <span>Reproductive health</span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded border border-(--border-subtle) bg-slate-50 px-1.5 py-0.5 font-medium text-(--text-body)">
          Pregnancy: {PREGNANCY_POSSIBILITY_LABELS[health.pregnancyPossibility] ?? health.pregnancyPossibility}
        </span>
        {health.cyclePattern ? (
          <span className="rounded border border-(--border-subtle) bg-slate-50 px-2 py-0.5 font-medium text-(--text-body)">
            Cycle: {CYCLE_PATTERN_LABELS[health.cyclePattern] ?? health.cyclePattern}
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
