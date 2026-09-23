"use client";

import { useCallback } from "react";
import {
  AlertTriangle,
  Baby,
  FileQuestion,
  ListChecks,
  Pill,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ageFromDateOfBirth,
  fetchBookingIntake,
  isNegativeAllergy,
  SEX_LABELS,
  type BookingIntakeForm,
  type IntakeReproductiveHealth,
  type IntakeSafetyScreen,
  type IntakeStructuredMedicalHistory,
  type IntakeSymptomReview,
} from "@/features/doctor/lib/api/bookingIntake";
import {
  CYCLE_PATTERN_LABELS,
  PREGNANCY_POSSIBILITY_LABELS,
  SUPPRESSED_BASELINE_HISTORY_LABELS,
  SYMPTOM_REVIEW_FIELDS,
  knownConditionLabels,
} from "@/features/consultation/lib/intakeDisplay";

/**
 * Patient details for the post-consult workspace, read from the real intake.
 *
 * This component previously rendered a module-level constant with **no props and
 * no fetch**: height `"150" cm`, weight `"60" kg`, allergens shrimp / milk / eggs
 * / peanuts / wheat, and diet vegetarian / gluten-free, identically for every
 * consultation. A physician writing an Assessment was reading five invented
 * allergies — a direct prescribing hazard, not a cosmetic placeholder.
 *
 * What it shows now is what `GET /v1/bookings/{bookingId}/intake` actually holds.
 *
 * Height, weight, and diet have no dedicated contract field — the intake mapper
 * folds them into `details.medicalHistory` as a fixed set of `"Label: value"`
 * lines it generates itself (`buildMedicalHistory` in
 * `features/booking/lib/intakeMapper.ts`). {@link parseMedicalHistoryLines} reads
 * that same deterministic format back into a lookup, which is different from
 * parsing free-text prose: every line it reads was written by this codebase in a
 * fixed shape, not composed by the patient, so recovering "Height" or "Diet" from
 * it is not inventing data. Age and sex instead come from the structured
 * `demographics` field, which both this panel and the workspace header already
 * read the same way.
 */
export function PatientDetails({
  bookingId,
  form,
}: {
  bookingId?: string;
  /**
   * Pre-loaded intake, when an ancestor already holds it. The post-consult
   * workspace reads this same intake for its header, so passing it down keeps
   * one screen to one `GET /v1/bookings/{bookingId}/intake` rather than two.
   * Absent, this component fetches for itself as before.
   */
  form?: BookingIntakeForm | null;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchBookingIntake(idToken ?? "", bookingId ?? ""),
    [idToken, bookingId],
  );

  if (form !== undefined) {
    return form ? (
      <IntakeDetails form={form} />
    ) : (
      <Unavailable
        title="No intake submitted"
        detail="This patient did not complete an intake form for this booking."
      />
    );
  }

  if (!bookingId) {
    return (
      <Unavailable
        title="Patient details unavailable"
        detail="Open this workspace from a completed consultation to load the patient's intake."
      />
    );
  }

  return (
    <AsyncView<BookingIntakeForm | null>
      fetcher={fetcher}
      deps={[idToken, bookingId]}
      empty={
        <Unavailable
          title="No intake submitted"
          detail="This patient did not complete an intake form for this booking."
        />
      }
    >
      {(form) =>
        form ? (
          <IntakeDetails form={form} />
        ) : (
          <Unavailable
            title="No intake submitted"
            detail="This patient did not complete an intake form for this booking."
          />
        )
      }
    </AsyncView>
  );
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      data-slot="patient-details-unavailable"
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-6 text-center"
    >
      <FileQuestion className="size-6 text-muted-foreground" />
      <span className="text-base font-semibold text-foreground">{title}</span>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

/**
 * Labels the medical-history text block always carries that this panel shows
 * elsewhere already, so they must not also appear in the key-value list:
 *
 *   - "Chief complaint" — shown prominently in the Subjective card.
 *   - "Service requested" — shown prominently in the Subjective card's context
 *     (the booking the consultation was opened from).
 *   - "Date of birth" / "Sex at birth" — the same values, sourced from the
 *     structured `demographics` field rather than re-derived from this text,
 *     are already shown as this panel's own Age / Sex rows.
 */
const SUPPRESSED_HISTORY_LABELS = new Set([
  "Chief complaint",
  "Service requested",
  "Date of birth",
  "Sex at birth",
]);

/**
 * Read `details.medicalHistory` back into an ordered list of label/value pairs.
 *
 * This is safe to parse — unlike the patient's own free text — because every
 * line in this block was generated by `buildMedicalHistory` in
 * `features/booking/lib/intakeMapper.ts` in the fixed shape `"Label: value"`,
 * one fact per line, with a single blank line as a section break. Nothing here
 * is prose the patient composed; it is this codebase's own deterministic
 * serialization of structured form fields that have no dedicated contract
 * field of their own (height, weight, diet, and the certificate-service
 * fields). Recovering them is reading a fixed format back, not inferring
 * meaning from a paragraph.
 */
export function parseMedicalHistoryLines(
  history: string | undefined,
): Array<{ label: string; value: string }> {
  if (!history) return [];
  const rows: Array<{ label: string; value: string }> = [];
  for (const rawLine of history.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const label = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!label || !value || SUPPRESSED_HISTORY_LABELS.has(label)) continue;
    rows.push({ label, value });
  }
  return rows;
}

function IntakeDetails({ form }: { form: BookingIntakeForm }) {
  const details = form.sections.details;
  const allergies = details?.allergies?.trim();
  const medications =
    details?.structuredMedicalHistory?.currentMedications?.trim()
    || details?.medications?.trim();
  const demographics = details?.demographics;
  const age = ageFromDateOfBirth(demographics?.dateOfBirth);
  const sex = demographics?.sex ? SEX_LABELS[demographics.sex] : undefined;
  const baseline = details?.baselineMeasurements;
  const historyRows = parseMedicalHistoryLines(details?.medicalHistory).filter(
    (row) => !(baseline && SUPPRESSED_BASELINE_HISTORY_LABELS.has(row.label)),
  );

  return (
    <div className="flex flex-col gap-3" data-slot="patient-details">
      <ClinicalAlerts
        allergies={allergies}
        safety={details?.safetyScreen}
        reproductiveHealth={details?.reproductiveHealth}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[10px] border border-(--border-subtle) bg-(--surface-card) p-2.5 shadow-2xs">
          <Section icon={<Pill className="size-3.5 shrink-0 text-(--teal-700)" />} label="Allergies">
            {allergies ? (
              <span className={isNegativeAllergy(allergies) ? "text-xs font-semibold text-(--text-body)" : "text-xs font-bold text-(--danger-fg)"}>
                {allergies}
              </span>
            ) : (
              <NotAnswered />
            )}
          </Section>
        </div>
        <div className="rounded-[10px] border border-(--border-subtle) bg-(--surface-card) p-2.5 shadow-2xs">
          <Section icon={<Pill className="size-3.5 shrink-0 text-(--teal-700)" />} label="Medications">
            <span className="text-xs font-medium text-(--text-body)">{medications || <NotAnswered />}</span>
          </Section>
        </div>
      </div>

      <Disclosure title="Presenting symptoms" open>
        <SafetyScreen screen={details?.safetyScreen} />
        <SymptomReviewSection review={details?.symptomReview} />
      </Disclosure>

      <Disclosure title="Medical & reproductive history">
        <MedicalHistorySection history={details?.structuredMedicalHistory} />
        <ReproductiveHealthSection health={details?.reproductiveHealth} />
      </Disclosure>

      <Disclosure title="Demographics & measurements">
        <dl data-slot="patient-details-summary" className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <SummaryRow label="Age">
            {typeof age === "number" ? (age === 0 ? "<1 y/o (infant)" : `${age} y/o`) : <NotAnswered />}
          </SummaryRow>
          <SummaryRow label="Sex">{sex || <NotAnswered />}</SummaryRow>
          {baseline ? (
            <SummaryRow label="Height & weight">
              {baseline.heightCm} cm · {baseline.weightKg} kg
              {baseline.selfReported ? (
                <span className="ml-1 font-normal text-muted-foreground">(self-reported)</span>
              ) : null}
            </SummaryRow>
          ) : null}
          {historyRows.map((row) => (
            <SummaryRow key={row.label} label={row.label}>
              {row.value}
            </SummaryRow>
          ))}
        </dl>
      </Disclosure>
    </div>
  );
}

function ClinicalAlerts({
  allergies,
  safety,
  reproductiveHealth,
}: {
  allergies?: string;
  safety?: IntakeSafetyScreen;
  reproductiveHealth?: IntakeReproductiveHealth;
}) {
  const alerts: string[] = [];
  if (allergies && !isNegativeAllergy(allergies)) alerts.push(`Allergy: ${allergies}`);
  if (safety?.chestPain === true) alerts.push("Chest pain reported");
  if (safety?.dyspnea === true) alerts.push("Shortness of breath reported");
  if (
    !safety
    || (safety.chestPain === undefined
      && safety.dyspnea === undefined
      && safety.feverDays === undefined)
  ) {
    alerts.push("Red-flag screening incomplete");
  }
  if (reproductiveHealth?.pregnancyPossibility === "possible") {
    alerts.push("Pregnancy is possible");
  } else if (
    reproductiveHealth?.pregnancyPossibility === "unsure"
    || reproductiveHealth?.pregnancyPossibility === "prefer_not_to_say"
  ) {
    alerts.push("Pregnancy status is not confirmed");
  }

  return (
    <section
      data-slot="patient-clinical-alerts"
      className={
        alerts.length > 0
          ? "rounded-[12px] border border-(--danger-border) bg-(--danger-bg) p-2.5 shadow-2xs"
          : "rounded-[12px] border border-(--status-available-fg)/30 bg-(--status-available-bg) p-2.5 shadow-2xs"
      }
      aria-label="Clinical alerts"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
        <AlertTriangle className={alerts.length > 0 ? "size-3.5 text-(--danger-fg)" : "size-3.5 text-(--status-available-fg)"} />
        Clinical alerts ({alerts.length})
      </p>
      {alerts.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-xs font-bold text-(--danger-fg)">
          {alerts.map((alert) => <li key={alert}>• {alert}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-xs font-medium text-(--status-available-fg)">No patient-reported alerts identified.</p>
      )}
    </section>
  );
}

function Disclosure({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="group overflow-hidden rounded-[12px] border border-(--border-subtle) bg-(--surface-card) shadow-2xs"
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-(--text-heading) hover:bg-(--surface-warm-soft)/40">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span aria-hidden className="text-(--text-muted) transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="flex flex-col gap-2.5 border-t border-(--border-subtle) p-3">{children}</div>
    </details>
  );
}

/**
 * Structured medical-history checklist — the known-conditions multi-select
 * the updated intake form collects, distinct from the free-text
 * `medicalHistory` block. `noneReported` is an explicit patient assertion and
 * is rendered as one, not left blank.
 */
function MedicalHistorySection({ history }: { history?: IntakeStructuredMedicalHistory }) {
  if (!history) return null;
  const conditionLabels = knownConditionLabels(history);

  return (
    <Section icon={<ListChecks className="size-4 shrink-0" />} label="Known medical conditions">
      {history.noneReported ? (
        "No known medical conditions reported"
      ) : conditionLabels.length > 0 || history.other ? (
        <div className="flex flex-wrap gap-1.5">
          {conditionLabels.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
          {history.other ? <Badge variant="outline">{history.other}</Badge> : null}
        </div>
      ) : (
        <NotAnswered />
      )}
      {history.details ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{history.details}</p>
      ) : null}
    </Section>
  );
}

/**
 * Extended symptom review (beyond the base OLDCART set folded into `oldcart`)
 * the updated intake form collects for teleconsult and sick-leave bookings.
 */
function SymptomReviewSection({ review }: { review?: IntakeSymptomReview }) {
  if (!review) return null;
  const rows = SYMPTOM_REVIEW_FIELDS.filter(({ key }) => review[key]);
  if (rows.length === 0 && typeof review.painSeverity !== "number") return null;

  return (
    <Section icon={<Stethoscope className="size-3.5 shrink-0 text-(--teal-700)" />} label="Symptom review">
      <div className="flex flex-col gap-2">
        {typeof review.painSeverity === "number" ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-(--text-muted)">Pain:</span>
            <Badge
              variant="outline"
              className={cn(
                "w-fit font-bold",
                review.painSeverity >= 7
                  ? "border-(--danger-border) bg-(--danger-bg) text-(--danger-fg)"
                  : review.painSeverity >= 4
                    ? "border-(--status-soon-fg)/40 bg-(--status-soon-bg) text-(--status-soon-fg)"
                    : "border-(--border-default) text-(--text-body)"
              )}
            >
              {review.painSeverity}/10 {review.painSeverity >= 7 ? "Severe" : review.painSeverity >= 4 ? "Moderate" : "Mild"}
            </Badge>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-2 rounded-lg bg-(--surface-warm-soft)/40 p-2.5 sm:grid-cols-2">
          {rows.map(({ key, label }) => (
            <div key={key} className="flex flex-col">
              <span className="text-[11px] font-semibold text-(--text-muted)">{label}</span>
              <span className="text-xs font-semibold text-(--text-heading)">{review[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Reproductive-health screening, present only when the patient answered it. */
function ReproductiveHealthSection({ health }: { health?: IntakeReproductiveHealth }) {
  if (!health) return null;

  return (
    <Section icon={<Baby className="size-3.5 shrink-0 text-(--teal-700)" />} label="Reproductive health">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-(--border-default) font-semibold text-(--text-body)">
          Pregnancy possibility:{" "}
          {PREGNANCY_POSSIBILITY_LABELS[health.pregnancyPossibility] ?? health.pregnancyPossibility}
        </Badge>
        {health.cyclePattern ? (
          <Badge variant="outline" className="border-(--border-default) font-semibold text-(--text-body)">
            Cycle: {CYCLE_PATTERN_LABELS[health.cyclePattern] ?? health.cyclePattern}
          </Badge>
        ) : null}
        {health.lastMenstrualPeriod ? (
          <Badge variant="outline" className="border-(--border-default) font-semibold text-(--text-body)">
            Last menstrual period: {health.lastMenstrualPeriod}
          </Badge>
        ) : null}
      </div>
    </Section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold text-(--text-muted)">{label}</dt>
      <dd className="text-xs font-semibold text-(--text-heading)">{children}</dd>
    </div>
  );
}

/**
 * Red-flag answers, with "not asked" kept distinct from "no".
 *
 * The deterministic router treats a missing answer as a non-match, so a UI that
 * drew an unanswered question as a negative would conceal the gap from the
 * physician as well as from the router.
 */
function SafetyScreen({ screen }: { screen?: IntakeSafetyScreen }) {
  const answered =
    screen &&
    (typeof screen.chestPain === "boolean" ||
      typeof screen.dyspnea === "boolean" ||
      typeof screen.feverDays === "number");

  return (
    <div className="flex flex-col gap-1.5" data-slot="patient-details-safety-screen">
      <span className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
        <ShieldAlert className="size-3.5 shrink-0 text-amber-600" />
        Red-flag screening
      </span>
      {!answered ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-(--text-muted)">
          <AlertTriangle className="size-3.5 shrink-0 text-(--danger-fg)" />
          Not answered — treat as unscreened, not as negative.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Answer label="Chest pain" value={screen?.chestPain} />
          <Answer label="Shortness of breath" value={screen?.dyspnea} />
          {typeof screen?.feverDays === "number" ? (
            <Badge variant="outline" className="border-(--border-default) font-semibold text-(--text-body)">
              {screen.feverDays === 0
                ? "No fever"
                : `Fever ${screen.feverDays} day${screen.feverDays === 1 ? "" : "s"}`}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-(--border-subtle) font-medium text-(--text-muted)">
              Fever: not asked
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function Answer({ label, value }: { label: string; value?: boolean }) {
  if (value === undefined) {
    return (
      <Badge variant="outline" className="border-(--border-subtle) font-medium text-(--text-muted)">
        {label}: not asked
      </Badge>
    );
  }
  return (
    <Badge
      variant={value ? "destructive" : "outline"}
      className={value ? "font-bold" : "border-(--border-default) font-semibold text-(--text-body)"}
    >
      {label}: {value ? "Yes" : "No"}
    </Badge>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
        {icon}
        {label}
      </span>
      <div className="text-sm font-medium text-(--text-body)">{children}</div>
    </div>
  );
}

function NotAnswered() {
  return <span className="text-xs text-(--text-muted) italic">Not answered</span>;
}
