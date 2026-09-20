"use client";

import { CalendarDays, Pencil } from "lucide-react";
import { addDays, startOfToday } from "date-fns";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { cn } from "@/lib/utils";

import type { DynamicIntakeFormValues } from "../../../schemas/intakeSchema";
import { DatePicker } from "../../DateTimePicker";
import {
  dateSegmentOf,
  timeSegmentOf,
  withDateSegment,
  withTimeSegment,
} from "./AdditionalInfoSection";
import { complaintTagLabel } from "./ConcernSafetyStep";
import { BlockLabel, COMPACT_INPUT } from "./IntakeChoice";
import { conditionLabel } from "./MedicalHistoryStep";
import { severityLabel } from "./PainAssessmentStep";

type Values = DynamicIntakeFormValues;

interface LedgerRow {
  label: string;
  primary: string;
  secondary?: string;
  /** A UI page index — see `IntakePage` in `AuthenticatedIntakeForm.tsx`. */
  editStep: number;
  editLabel: string;
}

const joinParts = (parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" · ");

/** Builds the recap rows from what the patient actually entered. */
export function buildLedger(values: Values): LedgerRow[] {
  const personal = values.personalDetails;
  const request = values.requestDetails;
  const teleconsult = request.type === "teleconsult" ? request : null;
  const history = personal.structuredMedicalHistory;
  const allergens = personal.allergens ?? [];

  const allergyText = allergens.includes(NONE_OPTION)
    ? "No known drug allergies (NKDA)"
    : allergens.length
      ? `Allergies: ${allergens.join(", ")}`
      : "Allergies not answered";

  const rows: LedgerRow[] = [];

  if (teleconsult) {
    const feverDays = teleconsult.safetyScreen?.feverDays;
    const tags = (teleconsult.complaintTags ?? []).map((tag) =>
      tag === "fever" && feverDays != null
        ? `Fever (${feverDays} day${feverDays === 1 ? "" : "s"})`
        : complaintTagLabel(tag),
    );
    const screen = teleconsult.safetyScreen;
    const flags = [
      screen?.chestPain === true && "chest pain",
      screen?.dyspnea === true && "shortness of breath",
    ].filter(Boolean);
    const safety = flags.length
      ? `Severe symptoms reported: ${flags.join(", ")}`
      : screen?.chestPain === false && screen?.dyspnea === false
        ? "No severe symptoms reported"
        : undefined;
    rows.push({
      label: "Chief concern",
      primary: joinParts([tags.join(", "), teleconsult.chiefComplaint?.trim()]) || "Not answered",
      secondary: safety,
      editStep: 2,
      editLabel: "Edit chief concern",
    });
  }

  rows.push({
    label: "Baseline profile",
    primary: joinParts([personal.bloodType && `Blood type ${personal.bloodType}`, allergyText]),
    secondary: joinParts([
      personal.height && `${personal.height} cm`,
      personal.weight && `${personal.weight} kg`,
    ]) || undefined,
    editStep: 0,
    editLabel: "Edit baseline profile",
  });

  const conditions = history?.noneReported
    ? "No pre-existing conditions"
    : history?.knownConditions?.length
      ? history.knownConditions
          .map((item) => (item === "other" && history.other ? history.other : conditionLabel(item)))
          .join(", ")
      : "Conditions not answered";
  rows.push({
    label: "Medical history",
    primary: conditions,
    secondary: joinParts([
      history?.currentMedications?.trim() && `Meds: ${history.currentMedications.trim()}`,
      history?.details?.trim() && `Surgeries: ${history.details.trim()}`,
    ]) || undefined,
    editStep: 1,
    editLabel: "Edit medical history",
  });

  if (teleconsult) {
    const vitals = teleconsult.vitals;
    const bp =
      vitals?.systolicBp != null || vitals?.diastolicBp != null
        ? `BP: ${vitals?.systolicBp ?? "—"}/${vitals?.diastolicBp ?? "—"} mmHg`
        : null;
    rows.push({
      label: "Home vitals",
      primary:
        joinParts([
          vitals?.temperatureC != null && `Temp: ${vitals.temperatureC}°C`,
          bp,
          vitals?.heartRateBpm != null && `Pulse: ${vitals.heartRateBpm} bpm`,
          vitals?.spo2Percent != null && `SpO₂: ${vitals.spo2Percent}%`,
        ]) || "None recorded",
      editStep: 2,
      editLabel: "Edit home vitals",
    });

    const review = teleconsult.symptomReview;
    const painPrimary = joinParts([
      typeof review?.painSeverity === "number" ? `${review.painSeverity}/10 · ${severityLabel(review.painSeverity)}` : undefined,
      review?.characteristics,
    ]);
    rows.push({
      label: "Pain assessment",
      primary: painPrimary || "Not answered",
      secondary: joinParts([
        review?.aggravatingFactors && `Worse: ${review.aggravatingFactors}`,
        review?.relievingFactors && `Better: ${review.relievingFactors}`,
        review?.location,
        review?.onset && `Started: ${review.onset}`,
        review?.pattern,
      ]) || undefined,
      editStep: 3,
      editLabel: "Edit pain assessment",
    });
  }

  return rows;
}

export function ReviewConsentStep({
  onEdit,
  isOnDemand = false,
  children,
}: {
  /** A UI page index — see `IntakePage` in `AuthenticatedIntakeForm.tsx`. */
  onEdit: (step: number) => void;
  /**
   * On-demand bookings are matched to the next available doctor immediately,
   * like an on-demand ride — there is no appointment slot to state a
   * preference for, so the date/time picker is skipped entirely rather than
   * asking a question with no meaningful answer.
   */
  isOnDemand?: boolean;
  /** Optional extra block rendered after the notes (e.g. reproductive health). */
  children?: React.ReactNode;
}) {
  const { control } = useFormContext<Values>();
  const values = useWatch({ control }) as Values;
  const rows = buildLedger(values);
  const today = startOfToday();

  return (
    <div className="space-y-8">
      <section aria-labelledby="ledger-heading" data-slot="pre-consult-ledger" className="space-y-2">
        <BlockLabel id="ledger-heading">Pre-consult summary</BlockLabel>
        <dl className="divide-y divide-(--border-subtle)">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-[11px] font-bold tracking-wider text-(--text-muted) uppercase sm:pt-0.5">
                  {row.label}
                </dt>
                <dd className="mt-0.5 min-w-0 sm:mt-0">
                  <p className="line-clamp-2 text-sm font-medium break-words text-(--text-body)">{row.primary}</p>
                  {row.secondary ? (
                    <p className="mt-0.5 line-clamp-2 text-xs break-words text-(--text-muted)">{row.secondary}</p>
                  ) : null}
                </dd>
              </div>
              <button
                type="button"
                aria-label={row.editLabel}
                onClick={() => onEdit(row.editStep)}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-(--text-link) hover:bg-(--surface-canvas) hover:text-(--text-link-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              >
                <Pencil aria-hidden className="size-3.5" /> Edit
              </button>
            </div>
          ))}
        </dl>
      </section>

      {isOnDemand ? null : (
        <Controller
          name="additionalInfo.dateOfConsultation"
          control={control}
          render={({ field, fieldState }) => (
            <section aria-labelledby="schedule-heading" className="space-y-3 border-t border-(--border-subtle) pt-6">
              <div>
                <BlockLabel id="schedule-heading" required>Preferred consultation time</BlockLabel>
                <p className="mt-1 text-xs text-(--text-muted)">
                  A preference only. Your confirmed time comes from the doctor&apos;s booked slot.
                </p>
              </div>
              <div className="grid gap-3 rounded-2xl bg-(--surface-canvas) p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-(--text-muted) uppercase">Date</span>
                  <DatePicker
                    date={dateSegmentOf(field.value)}
                    onDateChange={(date) => field.onChange(withDateSegment(field.value, date))}
                    minDate={today}
                    maxDate={addDays(today, 90)}
                    placeholder="Select preferred date"
                    icon={CalendarDays}
                    error={fieldState.error?.message}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="preferred-consultation-time" className="block text-[10px] font-bold text-(--text-muted) uppercase">
                    Time window (optional)
                  </label>
                  <input
                    id="preferred-consultation-time"
                    type="time"
                    data-slot="intake-preferred-time"
                    value={timeSegmentOf(field.value)}
                    // A bare time with no date is not a preference anyone can act on.
                    disabled={!dateSegmentOf(field.value)}
                    onChange={(event) => field.onChange(withTimeSegment(field.value, event.target.value))}
                    className={cn(COMPACT_INPUT, "min-h-11 disabled:cursor-not-allowed disabled:opacity-50")}
                  />
                </div>
              </div>
              {fieldState.error ? <p className="text-xs text-(--danger-fg)">{fieldState.error.message}</p> : null}
            </section>
          )}
        />
      )}

      <Controller
        name="additionalInfo.additionalConcerns"
        control={control}
        render={({ field }) => (
          <section className="space-y-2 border-t border-(--border-subtle) pt-6">
            <BlockLabel htmlFor="doctor-notes">Notes for doctor</BlockLabel>
            <textarea
              id="doctor-notes"
              {...field}
              value={field.value ?? ""}
              rows={3}
              aria-describedby="doctor-notes-hint"
              placeholder="Anything else the attending doctor should know before calling? (optional)"
              className={cn(COMPACT_INPUT, "block resize-y")}
            />
            <p id="doctor-notes-hint" className="text-[11px] text-(--text-subtle)">
              Documents can&apos;t be attached here. Bring lab results or prescriptions to the consultation.
            </p>
          </section>
        )}
      />

      {children}

      <Controller
        name="additionalInfo.consent"
        control={control}
        render={({ field, fieldState }) => (
          <div className="border-t border-(--border-subtle) pt-6">
            <label
              htmlFor="intake-consent"
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm text-(--text-body) transition-colors",
                field.value
                  ? "border-(--surface-nav-accent) bg-(--safe-bg)"
                  : "border-(--border-default) hover:bg-(--surface-canvas)",
              )}
            >
              <input
                id="intake-consent"
                type="checkbox"
                checked={field.value === true}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid || undefined}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-(--surface-nav)"
              />
              <span>
                I confirm that the details provided are accurate and consent to teleconsult evaluation under the BayanHealth Clinical Terms of Service.
              </span>
            </label>
            {fieldState.error ? <p className="mt-1 text-xs text-(--danger-fg)">{fieldState.error.message}</p> : null}
          </div>
        )}
      />
    </div>
  );
}
