"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIdToken } from "@/stores/useAuthStore";

import { fetchPatientIntake } from "@/features/booking/lib/api/patientIntake";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { ConsultationChatPanel } from "@/features/consultation/components/session/ConsultationChatPanel";
import type {
  IntakeDetailsSection,
  IntakeReproductiveHealth,
  IntakeStructuredMedicalHistory,
  IntakeSymptomReview,
} from "@/features/booking/lib/api/intake";
import { parseMedicalHistoryLines } from "@/features/consultation/components/postConsultation/PatientDetails";
import {
  CYCLE_PATTERN_LABELS,
  PREGNANCY_POSSIBILITY_LABELS,
  SUPPRESSED_BASELINE_HISTORY_LABELS,
  SYMPTOM_REVIEW_FIELDS,
  knownConditionLabels,
} from "@/features/consultation/lib/intakeDisplay";
import { formatDoctorName } from "@/lib/utils";

/**
 * Patient-facing companion for the active consultation room (dual-pane
 * patient view).
 *
 * Doctors get the plain {@link ConsultationChatPanel} in the room's right
 * pane; this is that same conversation for the patient, plus two read-only
 * tabs built from data the patient already has access to via
 * `fetchPatientIntake` (their own submitted intake) — nothing here reads a
 * clinician-only endpoint. There is no SOAP-note or intake-editing surface to
 * strip out on this side: the codebase does not have one, so this component
 * only adds patient-appropriate context around the existing chat panel.
 */
export function PatientCompanionSuite({
  bookingId,
  sessionId,
  doctorId,
}: {
  bookingId: string;
  sessionId?: string;
  doctorId?: string;
}) {
  const idToken = useIdToken();

  const intakeQuery = useQuery({
    queryKey: ["patient-intake", bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", bookingId),
    enabled: !!idToken && !!bookingId,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId ?? "", idToken ?? ""),
    enabled: !!idToken && !!doctorId,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const doctorName = doctorQuery.data?.fullName;
  const details = intakeQuery.data?.sections?.details;
  const purpose = intakeQuery.data?.sections?.purpose;

  return (
    <div data-slot="patient-companion-suite" className="flex h-full min-h-0 flex-1 flex-col text-(--text-body)">
      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="shrink-0 border-b border-(--border-subtle) bg-(--surface-card) p-2 sm:p-3">
          <TabsList className="h-auto w-full gap-1 rounded-xl bg-(--border-subtle)/50 p-1 sm:rounded-2xl">
            <TabsTrigger
              value="chat"
              className="flex-1 gap-1.5 rounded-xl py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-xs"
            >
              <MessageSquare className="size-3.5" />
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Conversation</span>
            </TabsTrigger>
            <TabsTrigger
              value="intake"
              className="flex-1 gap-1.5 rounded-xl py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-xs"
            >
              <FileText className="size-3.5" />
              <span className="sm:hidden">Shared</span>
              <span className="hidden sm:inline">What You Shared</span>
            </TabsTrigger>
            <TabsTrigger
              value="nextSteps"
              className="flex-1 gap-1.5 rounded-xl py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-xs"
            >
              <CheckCircle2 className="size-3.5" />
              Next Steps
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {doctorName ? (
            <p className="shrink-0 px-4 pt-3 text-xs text-(--text-muted)">
              You are connected with{" "}
              <span className="font-medium text-(--text-heading)">{formatDoctorName(doctorName)}</span>.
              Any medicine names, instructions, or follow-up links your doctor sends will
              appear here.
            </p>
          ) : null}
          <div className="min-h-0 flex-1">
            <ConsultationChatPanel bookingId={bookingId} sessionId={sessionId} embedded />
          </div>
        </TabsContent>

        <TabsContent value="intake" className="min-h-0 flex-1 overflow-y-auto p-4">
          <IntakeSummary
            isLoading={intakeQuery.isLoading}
            chiefComplaint={purpose?.chiefComplaint}
            details={details}
          />
        </TabsContent>

        <TabsContent value="nextSteps" className="min-h-0 flex-1 overflow-y-auto p-4">
          <NextStepsPanel doctorName={doctorName} />
        </TabsContent>
      </Tabs>

      <details
        data-slot="patient-companion-failsafe-mobile"
        className="group shrink-0 border-t border-amber-200/70 bg-amber-50 text-xs text-amber-900 sm:hidden"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 marker:hidden">
          <PhoneCall className="size-3.5 shrink-0" />
          <span className="font-semibold">If video disconnects</span>
          <span className="ml-auto text-[10px] group-open:hidden">View</span>
          <span className="ml-auto hidden text-[10px] group-open:inline">Close</span>
        </summary>
        <p className="border-t border-amber-200/60 px-3 py-2.5 leading-relaxed">
          Your doctor will reach out on your verified mobile number — no need to redial.
        </p>
      </details>
      <div
        data-slot="patient-companion-failsafe"
        className="hidden shrink-0 items-center gap-2 border-t border-amber-200/70 bg-amber-50 p-3 text-xs text-amber-900 sm:flex"
      >
        <PhoneCall className="size-3.5 shrink-0" />
        <span>
          If the video disconnects, your doctor will reach out on your verified mobile
          number — no need to redial.
        </span>
      </div>
    </div>
  );
}

/**
 * Everything the patient actually submitted on this booking's intake, read
 * from the same `IntakeDetailsSection` the doctor's room view and the
 * post-consult workspace read — nothing here is a placeholder value.
 */
function IntakeSummary({
  isLoading,
  chiefComplaint,
  details,
}: {
  isLoading: boolean;
  chiefComplaint?: string;
  details?: IntakeDetailsSection;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-(--text-muted)">
        <Spinner className="size-4" />
        Loading what you shared…
      </div>
    );
  }

  const allergies = details?.allergies;
  const medications = details?.medications?.trim();
  const vitals = details?.vitals;
  const hasVitals = Boolean(
    vitals?.temperatureC || vitals?.systolicBp || vitals?.heartRateBpm || vitals?.spo2Percent,
  );
  const baseline = details?.baselineMeasurements;
  const historyRows = parseMedicalHistoryLines(details?.medicalHistory).filter(
    (row) => !(baseline && SUPPRESSED_BASELINE_HISTORY_LABELS.has(row.label)),
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3">
        <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          Your reported concern
        </span>
        <p className="text-sm text-(--text-body)">
          {chiefComplaint || "General health consultation"}
        </p>
      </div>

      <div>
        <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          Allergies declared
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5">
          <ShieldCheck className="size-3.5 shrink-0 text-(--text-subtle)" />
          <span className="text-(--text-body)">{allergies || "No known drug allergies (NKDA)"}</span>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          Current medications
        </span>
        <p className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5 text-(--text-body)">
          {medications || "None reported"}
        </p>
      </div>

      <MedicalHistorySummary history={details?.structuredMedicalHistory} />

      <SymptomReviewSummary review={details?.symptomReview} />

      <ReproductiveHealthSummary health={details?.reproductiveHealth} />

      {baseline || historyRows.length > 0 ? (
        <div>
          <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
            Baseline details
          </span>
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3 text-xs">
            {baseline ? (
              <div>
                <span className="block text-(--text-subtle)">Height &amp; weight</span>
                <span className="font-semibold text-(--text-heading)">
                  {baseline.heightCm} cm · {baseline.weightKg} kg
                </span>
              </div>
            ) : null}
            {historyRows.map((row) => (
              <div key={row.label}>
                <span className="block text-(--text-subtle)">{row.label}</span>
                <span className="font-semibold text-(--text-heading)">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          Home vitals submitted
        </span>
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
            <VitalTile label="SpO2" value={vitals?.spo2Percent ? `${vitals.spo2Percent}%` : "—"} />
          </div>
        ) : (
          <p className="text-sm text-(--text-muted) italic">No home vitals logged for this visit.</p>
        )}
      </div>
    </div>
  );
}

function MedicalHistorySummary({ history }: { history?: IntakeStructuredMedicalHistory }) {
  if (!history) return null;
  const conditionLabels = knownConditionLabels(history);

  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
        Known medical conditions
      </span>
      <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5">
        {history.noneReported ? (
          <span className="text-(--text-body)">No known medical conditions reported</span>
        ) : conditionLabels.length > 0 || history.other ? (
          <div className="flex flex-wrap gap-1.5">
            {conditionLabels.map((label) => (
              <span
                key={label}
                className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-semibold text-(--text-body)"
              >
                {label}
              </span>
            ))}
            {history.other ? (
              <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-semibold text-(--text-body)">
                {history.other}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-(--text-muted) italic">Not answered</span>
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

function SymptomReviewSummary({ review }: { review?: IntakeSymptomReview }) {
  if (!review) return null;
  const rows = SYMPTOM_REVIEW_FIELDS.filter(({ key }) => review[key]);
  if (rows.length === 0 && typeof review.painSeverity !== "number") return null;

  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
        Symptom details
      </span>
      <div className="space-y-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5">
        {typeof review.painSeverity === "number" ? (
          <span className="inline-flex rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-bold text-(--text-body)">
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

function ReproductiveHealthSummary({ health }: { health?: IntakeReproductiveHealth }) {
  if (!health) return null;

  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
        Reproductive health
      </span>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5">
        <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-semibold text-(--text-body)">
          Pregnancy possibility:{" "}
          {PREGNANCY_POSSIBILITY_LABELS[health.pregnancyPossibility] ?? health.pregnancyPossibility}
        </span>
        {health.cyclePattern ? (
          <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-semibold text-(--text-body)">
            Cycle: {CYCLE_PATTERN_LABELS[health.cyclePattern] ?? health.cyclePattern}
          </span>
        ) : null}
        {health.lastMenstrualPeriod ? (
          <span className="rounded-md border border-(--border-subtle) bg-(--surface-card) px-2 py-0.5 text-xs font-semibold text-(--text-body)">
            Last menstrual period: {health.lastMenstrualPeriod}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VitalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2">
      <span className="block text-[10px] font-bold text-(--text-subtle) uppercase">{label}</span>
      <span className="text-xs font-bold text-(--text-heading)">{value}</span>
    </div>
  );
}

function NextStepsPanel({ doctorName }: { doctorName?: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-2xl border border-(--status-available-fg)/30 bg-(--status-available-bg) p-3">
        <span className="mb-2 inline-flex items-center rounded-full border border-(--border-subtle) bg-(--surface-card) px-2.5 py-0.5 text-[10px] font-bold text-(--status-available-fg)">
          Step 2 of 3 · Live consultation
        </span>
        <p className="text-(--text-heading)">
          Discuss your symptoms and questions with {formatDoctorName(doctorName)}.
          Your doctor will review and sign off on any e-prescription or care plan after the call.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          What may become available after review
        </span>
        <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-3">
          <span className="block text-sm font-medium text-(--text-heading)">E-prescription &amp; care plan</span>
          <p className="text-xs text-(--text-muted)">
            Downloadable instructions appear after your doctor confirms the assessment and signs off.
          </p>
        </div>
      </div>
    </div>
  );
}
