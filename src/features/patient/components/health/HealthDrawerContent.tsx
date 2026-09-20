"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Pill } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useIdToken } from "@/stores/useAuthStore";
import {
  fetchReleasedPrescription,
  isPlaceholderMedication,
  isPlaceholderPrescription,
  type PrescriptionMedication,
} from "@/features/consultation/lib/api/releasedPrescription";
import type { PatientChartEntry } from "@/features/patient/lib/api/patientChart";
import { formatConsultationDateTime } from "@/lib/consultation-time";

/**
 * Content modules for {@link HealthDrawer}.
 *
 * Only the prescription drawer reads live data: `fetchReleasedPrescription`
 * is the one patient-reachable source for any of this (see its doc comment —
 * the legacy `prescription`/`medical_certificate`/`soap_note` consultation
 * document types are permanently retired, 410, and nothing populates them).
 * The other two show exactly what the chart already knows and say plainly
 * that the rest isn't in the app yet, rather than inventing PRC numbers,
 * ICD-10 codes or vitals to fill the space.
 */

/* ------------------------------------------------------------ shared bits -- */

function DrawerSpinner({ label }: { label: string }) {
  return (
    <div
      data-slot="health-drawer-loading"
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-[13.5px] text-(--text-muted)"
    >
      <Spinner className="size-4" />
      {label}
    </div>
  );
}

function DrawerNote({
  icon,
  children,
  tone = "info",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "flex gap-2 rounded-(--radius-md) border border-(--danger-border)/40 bg-(--danger-bg) p-3.5 text-[13px] leading-relaxed text-(--danger-fg)"
          : "flex gap-2 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) p-3.5 text-[13px] leading-relaxed text-(--text-muted)"
      }
    >
      {icon}
      <div>{children}</div>
    </div>
  );
}

/** Turn `snake_case` into a Title Case label — mirrors `PatientHealthView`'s own helper. */
function titleCase(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatOccurredAt(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/* ------------------------------------------------------------ prescription -- */

export function PrescriptionDrawerContent({
  consultationId,
}: {
  consultationId: string;
}) {
  const idToken = useIdToken();

  const { data, isLoading } = useQuery({
    queryKey: ["released-prescription", consultationId, idToken],
    queryFn: () => fetchReleasedPrescription(idToken ?? "", consultationId),
    enabled: !!idToken && !!consultationId,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  if (isLoading) {
    return <DrawerSpinner label="Checking for a prescription from your doctor…" />;
  }

  if (!data) {
    return (
      <DrawerNote icon={<Info className="size-4 shrink-0" />}>
        No prescription has been released for this consultation yet.
      </DrawerNote>
    );
  }

  const incomplete = isPlaceholderPrescription(data.payload);

  return (
    <div data-slot="prescription-drawer" className="flex flex-col gap-4">
      <p className="text-[12.5px] text-(--text-subtle)">
        Shared {formatConsultationDateTime(data.releasedAt)}
      </p>

      {incomplete ? (
        <DrawerNote tone="warning" icon={<AlertTriangle className="size-4 shrink-0" />}>
          <span className="font-bold">Your doctor has not finished this yet.</span>{" "}
          No medicine has been selected. Please message your doctor in the
          consultation chat before acting on this, and do not take anything
          based on this page.
        </DrawerNote>
      ) : (
        <ul className="flex flex-col gap-3" data-slot="prescription-drawer-medications">
          {data.payload.medications.map((medication, index) => (
            <MedicationRow key={`${medication.genericName}-${index}`} medication={medication} />
          ))}
        </ul>
      )}

      {data.payload.notes ? (
        <div>
          <p className="text-[12.5px] font-bold text-(--text-heading)">Notes from your doctor</p>
          <p className="mt-1 text-[13.5px] whitespace-pre-line text-(--text-muted)">
            {data.payload.notes}
          </p>
        </div>
      ) : null}

      <DrawerNote icon={<Info className="size-4 shrink-0" />}>
        This is your record of what your doctor prescribed. It is not a signed
        prescription document and cannot be presented at a pharmacy on its
        own — ask your doctor in the chat if you need a dispensable copy.
      </DrawerNote>
    </div>
  );
}

function MedicationRow({ medication }: { medication: PrescriptionMedication }) {
  if (isPlaceholderMedication(medication)) {
    return (
      <li className="rounded-(--radius-md) border border-(--danger-border)/40 bg-(--danger-bg) p-3 text-[12.5px] text-(--danger-fg)">
        <span className="font-bold">Incomplete entry.</span> Your doctor has not
        selected a medicine for this line. Ask them about it in the
        consultation chat.
      </li>
    );
  }

  return (
    <li className="rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) p-3.5">
      <p className="flex items-center gap-1.5 text-[14px] font-bold text-(--text-heading)">
        <Pill className="size-3.5 shrink-0 text-(--status-available-fg)" />
        {medication.genericName}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
        <Field label="Dose" value={medication.dose} />
        <Field label="How to take it" value={medication.route} />
        <Field label="How often" value={medication.frequency} />
        <Field label="For how long" value={medication.duration} />
      </dl>
      {medication.instructions ? (
        <p className="mt-2 text-[12.5px] text-(--text-muted)">{medication.instructions}</p>
      ) : null}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-(--text-subtle)">{label}</dt>
      <dd className="font-semibold text-(--text-body)">{value || "Not specified"}</dd>
    </div>
  );
}

/* --------------------------------------------------------- clinical summary -- */

/** Label per chart entry type, for the drawer's own compact rendering. */
const TYPE_LABEL: Record<PatientChartEntry["type"], string> = {
  booking: "Booking",
  intake: "Intake",
  session: "Consultation",
  document: "Document",
  lab_result: "Lab result",
};

export function ClinicalSummaryDrawerContent({
  entries,
}: {
  entries: PatientChartEntry[];
}) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return (
    <div data-slot="clinical-summary-drawer" className="flex flex-col gap-4">
      {sorted.length > 0 ? (
        <ol className="flex flex-col gap-2.5">
          {sorted.map((entry, index) => (
            <li
              key={`${entry.type}:${entry.occurredAt}:${index}`}
              className="rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                  {TYPE_LABEL[entry.type] ?? titleCase(entry.type)}
                </span>
                <span className="text-[12px] text-(--text-subtle)">
                  {formatOccurredAt(entry.occurredAt)}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] font-bold text-(--text-heading)">{entry.title}</p>
              {entry.summary ? (
                <p className="mt-0.5 text-[13px] leading-relaxed text-(--text-muted)">
                  {entry.summary}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <DrawerNote icon={<Info className="size-4 shrink-0" />}>
        Your doctor&apos;s detailed clinical notes (history, exam findings,
        diagnosis and plan) aren&apos;t available in the app yet. Message your
        doctor in the consultation chat if you need specifics from this visit.
      </DrawerNote>
    </div>
  );
}

/* ------------------------------------------------------- medical certificate -- */

export function MedicalCertificateDrawerContent({
  scheduledAt,
}: {
  scheduledAt?: string;
}) {
  return (
    <div data-slot="medical-certificate-drawer" className="flex flex-col gap-4">
      <DrawerNote icon={<Info className="size-4 shrink-0" />}>
        No medical certificate has been issued
        {scheduledAt ? ` for your ${formatConsultationDateTime(scheduledAt)} consultation` : ""}.
        If you need one, ask your doctor in the consultation chat — issued
        certificates don&apos;t yet appear in the app and are shared directly
        by your doctor.
      </DrawerNote>
    </div>
  );
}
