"use client";

import { Activity, Clock, Target } from "lucide-react";
import type {
  CdsFinalIcdPayload,
  CdsImagingRequestPayload,
  CdsLabRequestPayload,
  CdsMedicalCertificatePayload,
  CdsPatientEducationPayload,
  CdsPlanPayload,
  CdsPrescriptionPayload,
  CdsProtectedArtifactPayload,
  CdsProtectedOutputType,
} from "@/types/cds-contract";

/**
 * Renders a protected artifact's payload as the clinical document it is.
 *
 * This replaces `JSON.stringify(payload, null, 2)` in a `<pre>`. That was not a
 * cosmetic problem: directly beneath it the physician ticks "I reviewed this
 * artifact against the confirmed Assessment and current clinical record" and
 * signs. An attestation made over an unrendered object literal is a weak
 * attestation — the reviewer is reading field names and escaping, not a
 * prescription. Every one of the seven output types has a closed schema in
 * contracts/openapi.yaml, so there is nothing to infer and no reason to show raw
 * JSON to a clinician.
 *
 * Each renderer below mirrors exactly one `Cds*Payload` schema. They are
 * deliberately total over the required fields and defensive about the optional
 * ones: a payload that does not match its declared shape falls back to the raw
 * view rather than rendering a half-empty document that looks complete.
 */
export function ArtifactPayloadView({
  outputType,
  payload,
}: {
  outputType: CdsProtectedOutputType;
  payload: CdsProtectedArtifactPayload;
}) {
  const body = renderPayload(outputType, payload);

  // A payload that does not match its declared schema is shown verbatim rather
  // than silently rendered as an empty document. A physician must be able to
  // tell "this draft is malformed" from "this draft has no medications".
  if (!body) {
    return (
      <div data-slot="artifact-payload" data-shape="unrecognised">
        <p className="mb-2 text-sm text-(--danger-fg)">
          This draft did not match its expected format, so it is shown exactly as
          the server returned it. Do not sign it — draft it again.
        </p>
        <pre className="max-h-48 overflow-auto rounded-[10px] bg-(--surface-sunken) p-3 text-xs whitespace-pre-wrap text-(--text-body)">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div
      data-slot="artifact-payload"
      data-output-type={outputType}
      className="flex flex-col gap-3 text-sm"
    >
      {body}
    </div>
  );
}

function renderPayload(
  outputType: CdsProtectedOutputType,
  payload: CdsProtectedArtifactPayload,
): React.ReactNode | null {
  switch (outputType) {
    case "plan":
      return isPlan(payload) ? <PlanView payload={payload} /> : null;
    case "prescription":
      return isPrescription(payload) ? <PrescriptionView payload={payload} /> : null;
    case "final_icd":
      return isFinalIcd(payload) ? <FinalIcdView payload={payload} /> : null;
    case "medical_certificate":
      return isMedicalCertificate(payload) ? <MedicalCertificateView payload={payload} /> : null;
    case "lab_request":
      return isLabRequest(payload) ? <LabRequestView payload={payload} /> : null;
    case "imaging_request":
      return isImagingRequest(payload) ? <ImagingRequestView payload={payload} /> : null;
    case "patient_education":
      return isPatientEducation(payload) ? <PatientEducationView payload={payload} /> : null;
    default:
      return null;
  }
}

/* ── Documents ─────────────────────────────────────────────────────────────── */

function PlanView({ payload }: { payload: CdsPlanPayload }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-lg border-l-3 border-l-(--teal-600) bg-(--surface-brand-soft)/40 p-3 text-xs font-semibold leading-relaxed text-(--text-heading)">
        {payload.summary}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-lg bg-(--surface-warm-soft)/60 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
            <Target className="size-3.5 text-(--teal-700)" />
            Clinical goals
          </p>
          <div className="mt-1.5">
            <Bullets items={payload.goals} />
          </div>
        </div>

        <div className="rounded-lg bg-(--surface-warm-soft)/60 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
            <Activity className="size-3.5 text-(--teal-700)" />
            Interventions
          </p>
          <div className="mt-1.5">
            <Bullets items={payload.interventions} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-(--border-subtle) bg-(--surface-warm-soft)/30 p-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
          <Clock className="size-3.5 text-(--teal-700)" />
          Follow-up &amp; red flags
        </p>
        <p className="mt-1 text-xs leading-relaxed text-(--text-body)">{payload.followUp}</p>
      </div>
    </div>
  );
}

function PrescriptionView({ payload }: { payload: CdsPrescriptionPayload }) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {payload.medications.map((med, index) => (
          <li
            key={`${med.genericName}-${index}`}
            data-slot="prescription-medication"
            className="rounded-[10px] border border-(--border-subtle) bg-(--surface-warm-soft) p-3"
          >
            <p className="font-bold text-(--text-heading)">{med.genericName}</p>
            {/*
              Dose, route, frequency and duration are the four fields a
              dispensing error comes from, so they are laid out as labelled
              pairs rather than run together into one sentence.
            */}
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <Pair label="Dose" value={med.dose} />
              <Pair label="Route" value={med.route} />
              <Pair label="Frequency" value={med.frequency} />
              <Pair label="Duration" value={med.duration} />
            </dl>
            <p className="mt-2 text-(--text-body)">{med.instructions}</p>
          </li>
        ))}
      </ul>
      {payload.notes?.trim() ? (
        <Field label="Notes">
          <Prose>{payload.notes}</Prose>
        </Field>
      ) : null}
    </>
  );
}

function FinalIcdView({ payload }: { payload: CdsFinalIcdPayload }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="rounded-[8px] bg-(--surface-warm-soft) px-2.5 py-1 font-mono text-[15px] font-bold text-(--text-heading)">
        {payload.code}
      </span>
      <span className="text-(--text-body)">{payload.description}</span>
      <span className="text-xs text-(--text-subtle)">{payload.system}</span>
    </div>
  );
}

function MedicalCertificateView({ payload }: { payload: CdsMedicalCertificatePayload }) {
  return (
    <>
      <Prose>{payload.statement}</Prose>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Pair label="Valid from" value={formatDate(payload.validFrom)} />
        <Pair label="Valid through" value={formatDate(payload.validThrough)} />
      </dl>
      {payload.restrictions?.trim() ? (
        <Field label="Restrictions">
          <Prose>{payload.restrictions}</Prose>
        </Field>
      ) : null}
    </>
  );
}

function LabRequestView({ payload }: { payload: CdsLabRequestPayload }) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {payload.tests.map((test, index) => (
          <li
            key={`${test.testName}-${index}`}
            className="rounded-[10px] border border-(--border-subtle) p-3"
          >
            <p className="flex flex-wrap items-center gap-2 font-bold text-(--text-heading)">
              {test.testName}
              <PriorityChip priority={test.priority} />
            </p>
            <p className="mt-1 text-(--text-muted)">{test.rationale}</p>
          </li>
        ))}
      </ul>
      {payload.instructions?.trim() ? (
        <Field label="Instructions">
          <Prose>{payload.instructions}</Prose>
        </Field>
      ) : null}
    </>
  );
}

function ImagingRequestView({ payload }: { payload: CdsImagingRequestPayload }) {
  return (
    <>
      <ul className="flex flex-col gap-2">
        {payload.studies.map((study, index) => (
          <li
            key={`${study.studyName}-${index}`}
            className="rounded-[10px] border border-(--border-subtle) p-3"
          >
            <p className="flex flex-wrap items-center gap-2 font-bold text-(--text-heading)">
              {study.studyName}
              <span className="text-sm font-normal text-(--text-muted)">
                {study.bodyRegion}
              </span>
              <PriorityChip priority={study.priority} />
            </p>
            <p className="mt-1 text-(--text-muted)">{study.rationale}</p>
          </li>
        ))}
      </ul>
      {payload.instructions?.trim() ? (
        <Field label="Instructions">
          <Prose>{payload.instructions}</Prose>
        </Field>
      ) : null}
    </>
  );
}

function PatientEducationView({ payload }: { payload: CdsPatientEducationPayload }) {
  return (
    <>
      <div>
        <p className="text-[15px] font-bold text-(--text-heading)">{payload.title}</p>
        {payload.titleFilipino?.trim() ? (
          <p className="text-(--text-muted)">{payload.titleFilipino}</p>
        ) : null}
      </div>

      {/*
        Warning signs lead rather than following the sections. This is the part
        that sends a patient back to care, and it is the part the reviewing
        physician is most accountable for.
      */}
      <div className="rounded-[10px] border border-(--danger-border) bg-(--danger-bg) p-3">
        <p className="text-xs font-bold tracking-wide text-(--danger-fg) uppercase">
          Warning signs — return to care
        </p>
        <Bullets items={payload.warningSigns} className="mt-1 text-(--text-body)" />
      </div>

      {payload.sections.map((section, index) => (
        <Field
          key={`${section.heading}-${index}`}
          label={section.heading}
          note={section.language}
        >
          <Prose>{section.content}</Prose>
        </Field>
      ))}

      {/*
        ADR-20260804-01 makes the citation mandatory for corpus-backed education,
        and the ICD-10 code states which approved entry it was keyed from. Both
        are shown so the reviewer can see what the content rests on.
      */}
      {payload.citation?.trim() || payload.icd10Code?.trim() ? (
        <p className="border-t border-(--border-subtle) pt-2 text-xs text-(--text-muted)">
          {payload.icd10Code?.trim() ? <>Retrieved by {payload.icd10Code} · </> : null}
          {payload.citation}
          {payload.corpusVersion?.trim() ? <> · Corpus {payload.corpusVersion}</> : null}
        </p>
      ) : null}
    </>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────────── */

function Field({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold text-(--text-heading)">
        {label}
        {note ? <span className="ml-1.5 font-medium text-(--text-muted)">({note})</span> : null}
      </p>
      {children}
    </div>
  );
}

function Prose({ children }: { children: string }) {
  return <p className="leading-relaxed whitespace-pre-line text-sm text-(--text-body)">{children}</p>;
}

function Bullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-1.5 text-xs text-(--text-body) ${className ?? ""}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--teal-700)" aria-hidden />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-(--text-muted)">{label}</dt>
      <dd className="font-bold text-(--text-heading)">{value}</dd>
    </div>
  );
}

function PriorityChip({ priority }: { priority: "routine" | "urgent" }) {
  return (
    <span
      data-priority={priority}
      className={
        priority === "urgent"
          ? "rounded-full bg-(--danger-bg) px-2 py-0.5 text-xs font-bold text-(--danger-fg)"
          : "rounded-full bg-(--gray-bg) px-2 py-0.5 text-xs font-bold text-(--gray-fg)"
      }
    >
      {priority === "urgent" ? "Urgent" : "Routine"}
    </span>
  );
}

/** Render an ISO date as written when it cannot be parsed, rather than "Invalid Date". */
function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

/* ── Shape guards ──────────────────────────────────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isTextArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isText);

function isObjectArray(value: unknown, keys: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      const record = asRecord(item);
      return record !== null && keys.every((key) => isText(record[key]));
    })
  );
}

function isPlan(payload: CdsProtectedArtifactPayload): payload is CdsPlanPayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isText(record.summary) &&
    isTextArray(record.goals) &&
    isTextArray(record.interventions) &&
    isText(record.followUp)
  );
}

function isPrescription(payload: CdsProtectedArtifactPayload): payload is CdsPrescriptionPayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isObjectArray(record.medications, [
      "genericName",
      "dose",
      "route",
      "frequency",
      "duration",
      "instructions",
    ])
  );
}

function isFinalIcd(payload: CdsProtectedArtifactPayload): payload is CdsFinalIcdPayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isText(record.system) &&
    isText(record.code) &&
    isText(record.description)
  );
}

function isMedicalCertificate(
  payload: CdsProtectedArtifactPayload,
): payload is CdsMedicalCertificatePayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isText(record.statement) &&
    isText(record.validFrom) &&
    isText(record.validThrough)
  );
}

function isLabRequest(payload: CdsProtectedArtifactPayload): payload is CdsLabRequestPayload {
  const record = asRecord(payload);
  return record !== null && isObjectArray(record.tests, ["testName", "rationale", "priority"]);
}

function isImagingRequest(
  payload: CdsProtectedArtifactPayload,
): payload is CdsImagingRequestPayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isObjectArray(record.studies, ["studyName", "bodyRegion", "rationale", "priority"])
  );
}

function isPatientEducation(
  payload: CdsProtectedArtifactPayload,
): payload is CdsPatientEducationPayload {
  const record = asRecord(payload);
  return (
    record !== null &&
    isText(record.title) &&
    isText(record.language) &&
    isObjectArray(record.sections, ["heading", "content"]) &&
    isTextArray(record.warningSigns)
  );
}
