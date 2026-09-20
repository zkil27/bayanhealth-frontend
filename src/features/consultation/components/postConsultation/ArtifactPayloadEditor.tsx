"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
 * The editable counterpart of {@link ArtifactPayloadView}.
 *
 * Every one of the seven protected outputs is model-authored, and the physician
 * whose name goes on it is accountable for the words. Until this existed the
 * only response to a wrong drug frequency or a clumsy sentence was to regenerate
 * and hope, so this renders the same closed schemas as typed fields rather than
 * as a JSON blob: one control per contract field, list controls that respect the
 * schema's `minItems`/`maxItems`, and no field that the server would reject.
 *
 * Two rules are load-bearing:
 *
 * 1. **Never emit a shape the amendment endpoint would refuse.** Array bounds
 *    are enforced here (add/remove disable at the limits) so the physician is
 *    stopped by a disabled button rather than by a 422 after they have typed.
 * 2. **Corpus-owned patient-education fields are read-only.** An approved
 *    education article's title, citation, warning signs, structure, and Filipino
 *    text are byte-compared server-side against the approved corpus entry
 *    (ADR-20260804-01). Only the English body content is the physician's to
 *    rewrite, so only that is given an input; the rest is shown, plainly
 *    labelled as fixed, rather than offered and then rejected.
 */

export interface ArtifactPayloadEditorProps {
  outputType: CdsProtectedOutputType;
  payload: CdsProtectedArtifactPayload;
  onChange: (payload: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}

/**
 * Whether this payload can be edited field-by-field at all.
 *
 * A payload that does not match its declared schema has no safe structured
 * editor — the fields to render are unknown. `ArtifactPayloadView` already
 * refuses to render it as a document, and the workspace suppresses the Edit
 * control on the same basis, so a physician is never offered an editor over a
 * shape neither side understands.
 */
export function isEditablePayload(
  outputType: CdsProtectedOutputType,
  payload: CdsProtectedArtifactPayload,
): boolean {
  const record = asRecord(payload);
  if (!record) return false;
  switch (outputType) {
    case "plan":
      return isText(record.summary) && isTextArray(record.goals);
    case "prescription":
      return Array.isArray(record.medications) && record.medications.length > 0;
    case "final_icd":
      return isText(record.code);
    case "medical_certificate":
      return isText(record.statement);
    case "lab_request":
      return Array.isArray(record.tests) && record.tests.length > 0;
    case "imaging_request":
      return Array.isArray(record.studies) && record.studies.length > 0;
    case "patient_education":
      return isText(record.title) && Array.isArray(record.sections);
    default:
      return false;
  }
}

export function ArtifactPayloadEditor(props: ArtifactPayloadEditorProps) {
  const { outputType, payload, onChange, disabled } = props;

  switch (outputType) {
    case "plan":
      return <PlanEditor payload={payload as CdsPlanPayload} onChange={onChange} disabled={disabled} />;
    case "prescription":
      return <PrescriptionEditor payload={payload as CdsPrescriptionPayload} onChange={onChange} disabled={disabled} />;
    case "final_icd":
      return <FinalIcdEditor payload={payload as CdsFinalIcdPayload} onChange={onChange} disabled={disabled} />;
    case "medical_certificate":
      return <MedicalCertificateEditor payload={payload as CdsMedicalCertificatePayload} onChange={onChange} disabled={disabled} />;
    case "lab_request":
      return <LabRequestEditor payload={payload as CdsLabRequestPayload} onChange={onChange} disabled={disabled} />;
    case "imaging_request":
      return <ImagingRequestEditor payload={payload as CdsImagingRequestPayload} onChange={onChange} disabled={disabled} />;
    case "patient_education":
      return <PatientEducationEditor payload={payload as CdsPatientEducationPayload} onChange={onChange} disabled={disabled} />;
    default:
      return null;
  }
}

/* ── Per-type editors ──────────────────────────────────────────────────────── */

function PlanEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsPlanPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  const patch = useCallback(
    (next: Partial<CdsPlanPayload>) => onChange({ ...payload, ...next }),
    [payload, onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <TextAreaField
        label="Summary"
        value={payload.summary}
        maxLength={4000}
        rows={3}
        disabled={disabled}
        onChange={(summary) => patch({ summary })}
      />
      <StringListField
        label="Goals"
        items={payload.goals}
        max={20}
        maxLength={500}
        disabled={disabled}
        addLabel="Add goal"
        onChange={(goals) => patch({ goals })}
      />
      <StringListField
        label="Interventions"
        items={payload.interventions}
        max={30}
        maxLength={1000}
        disabled={disabled}
        addLabel="Add intervention"
        onChange={(interventions) => patch({ interventions })}
      />
      <TextAreaField
        label="Follow-up"
        value={payload.followUp}
        maxLength={2000}
        rows={2}
        disabled={disabled}
        onChange={(followUp) => patch({ followUp })}
      />
    </div>
  );
}

const BLANK_MEDICATION = {
  genericName: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
};

function PrescriptionEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsPrescriptionPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  const medications = payload.medications;
  const setMedications = (next: CdsPrescriptionPayload["medications"]) =>
    onChange({ ...payload, medications: next });

  return (
    <div className="flex flex-col gap-4">
      <RepeatingGroup
        legend="Medications"
        count={medications.length}
        min={1}
        max={30}
        disabled={disabled}
        addLabel="Add medication"
        onAdd={() => setMedications([...medications, { ...BLANK_MEDICATION }])}
      >
        {medications.map((med, index) => (
          <GroupItem
            key={index}
            title={med.genericName.trim() || `Medication ${index + 1}`}
            disabled={disabled}
            removable={medications.length > 1}
            onRemove={() => setMedications(medications.filter((_, i) => i !== index))}
          >
            <TextField
              label="Generic name"
              value={med.genericName}
              maxLength={255}
              disabled={disabled}
              onChange={(genericName) =>
                setMedications(medications.map((item, i) => (i === index ? { ...item, genericName } : item)))
              }
            />
            {/*
              Dose, route, frequency and duration sit in one grid because they
              are the four fields a dispensing error comes from, and reading
              them together is how a physician checks them.
            */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["dose", "route", "frequency", "duration"] as const).map((field) => (
                <TextField
                  key={field}
                  label={field === "dose" ? "Dose" : field === "route" ? "Route" : field === "frequency" ? "Frequency" : "Duration"}
                  value={med[field]}
                  maxLength={120}
                  disabled={disabled}
                  onChange={(value) =>
                    setMedications(medications.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
                  }
                />
              ))}
            </div>
            <TextAreaField
              label="Instructions"
              value={med.instructions}
              maxLength={1000}
              rows={2}
              disabled={disabled}
              onChange={(instructions) =>
                setMedications(medications.map((item, i) => (i === index ? { ...item, instructions } : item)))
              }
            />
          </GroupItem>
        ))}
      </RepeatingGroup>
      <TextAreaField
        label="Notes"
        optional
        value={payload.notes ?? ""}
        maxLength={2000}
        rows={2}
        disabled={disabled}
        onChange={(notes) => onChange({ ...payload, ...(notes.trim() ? { notes } : { notes: undefined }) })}
      />
    </div>
  );
}

function FinalIcdEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsFinalIcdPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <TextField
          label="Code"
          value={payload.code}
          maxLength={16}
          mono
          disabled={disabled}
          /*
            The contract's pattern is `^[A-Z][0-9A-Z]{2}(\.[0-9A-Z]{1,4})?$`, so
            an uppercase-only field is the difference between a physician typing
            `j20.9` and getting a 422, and it simply working.
          */
          onChange={(code) => onChange({ ...payload, code: code.toUpperCase() })}
          hint="ICD-10, e.g. J20.9"
        />
        <TextField
          label="Description"
          value={payload.description}
          maxLength={500}
          disabled={disabled}
          onChange={(description) => onChange({ ...payload, description })}
        />
      </div>
      <ReadOnlyNote>
        Coding system is fixed at {payload.system}.
      </ReadOnlyNote>
    </div>
  );
}

function MedicalCertificateEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsMedicalCertificatePayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TextAreaField
        label="Statement"
        value={payload.statement}
        maxLength={4000}
        rows={4}
        disabled={disabled}
        onChange={(statement) => onChange({ ...payload, statement })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Valid from"
          type="date"
          value={payload.validFrom}
          disabled={disabled}
          onChange={(validFrom) => onChange({ ...payload, validFrom })}
        />
        <TextField
          label="Valid through"
          type="date"
          value={payload.validThrough}
          disabled={disabled}
          onChange={(validThrough) => onChange({ ...payload, validThrough })}
        />
      </div>
      <TextAreaField
        label="Restrictions"
        optional
        value={payload.restrictions ?? ""}
        maxLength={2000}
        rows={2}
        disabled={disabled}
        onChange={(restrictions) =>
          onChange({ ...payload, ...(restrictions.trim() ? { restrictions } : { restrictions: undefined }) })
        }
      />
    </div>
  );
}

function LabRequestEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsLabRequestPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  const tests = payload.tests;
  const setTests = (next: CdsLabRequestPayload["tests"]) => onChange({ ...payload, tests: next });

  return (
    <div className="flex flex-col gap-4">
      <RepeatingGroup
        legend="Tests"
        count={tests.length}
        min={1}
        max={40}
        disabled={disabled}
        addLabel="Add test"
        onAdd={() => setTests([...tests, { testName: "", rationale: "", priority: "routine" }])}
      >
        {tests.map((test, index) => (
          <GroupItem
            key={index}
            title={test.testName.trim() || `Test ${index + 1}`}
            disabled={disabled}
            removable={tests.length > 1}
            onRemove={() => setTests(tests.filter((_, i) => i !== index))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <TextField
                label="Test name"
                value={test.testName}
                maxLength={255}
                disabled={disabled}
                onChange={(testName) => setTests(tests.map((item, i) => (i === index ? { ...item, testName } : item)))}
              />
              <PriorityField
                value={test.priority}
                disabled={disabled}
                onChange={(priority) => setTests(tests.map((item, i) => (i === index ? { ...item, priority } : item)))}
              />
            </div>
            <TextAreaField
              label="Rationale"
              value={test.rationale}
              maxLength={1000}
              rows={2}
              disabled={disabled}
              onChange={(rationale) => setTests(tests.map((item, i) => (i === index ? { ...item, rationale } : item)))}
            />
          </GroupItem>
        ))}
      </RepeatingGroup>
      <TextAreaField
        label="Instructions"
        optional
        value={payload.instructions ?? ""}
        maxLength={2000}
        rows={2}
        disabled={disabled}
        onChange={(instructions) =>
          onChange({ ...payload, ...(instructions.trim() ? { instructions } : { instructions: undefined }) })
        }
      />
    </div>
  );
}

function ImagingRequestEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsImagingRequestPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  const studies = payload.studies;
  const setStudies = (next: CdsImagingRequestPayload["studies"]) => onChange({ ...payload, studies: next });

  return (
    <div className="flex flex-col gap-4">
      <RepeatingGroup
        legend="Studies"
        count={studies.length}
        min={1}
        max={20}
        disabled={disabled}
        addLabel="Add study"
        onAdd={() => setStudies([...studies, { studyName: "", bodyRegion: "", rationale: "", priority: "routine" }])}
      >
        {studies.map((study, index) => (
          <GroupItem
            key={index}
            title={study.studyName.trim() || `Study ${index + 1}`}
            disabled={disabled}
            removable={studies.length > 1}
            onRemove={() => setStudies(studies.filter((_, i) => i !== index))}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
              <TextField
                label="Study name"
                value={study.studyName}
                maxLength={255}
                disabled={disabled}
                onChange={(studyName) => setStudies(studies.map((item, i) => (i === index ? { ...item, studyName } : item)))}
              />
              <TextField
                label="Body region"
                value={study.bodyRegion}
                maxLength={255}
                disabled={disabled}
                onChange={(bodyRegion) => setStudies(studies.map((item, i) => (i === index ? { ...item, bodyRegion } : item)))}
              />
              <PriorityField
                value={study.priority}
                disabled={disabled}
                onChange={(priority) => setStudies(studies.map((item, i) => (i === index ? { ...item, priority } : item)))}
              />
            </div>
            <TextAreaField
              label="Rationale"
              value={study.rationale}
              maxLength={1000}
              rows={2}
              disabled={disabled}
              onChange={(rationale) => setStudies(studies.map((item, i) => (i === index ? { ...item, rationale } : item)))}
            />
          </GroupItem>
        ))}
      </RepeatingGroup>
      <TextAreaField
        label="Instructions"
        optional
        value={payload.instructions ?? ""}
        maxLength={2000}
        rows={2}
        disabled={disabled}
        onChange={(instructions) =>
          onChange({ ...payload, ...(instructions.trim() ? { instructions } : { instructions: undefined }) })
        }
      />
    </div>
  );
}

/**
 * Whether this education payload came from the approved corpus, and therefore
 * carries corpus-owned fields the server byte-compares on amendment
 * (ADR-20260804-01). Mirrors the same test the amendment endpoint applies, so
 * the editor offers exactly the fields the server will accept.
 */
export function isCorpusBackedEducation(payload: CdsPatientEducationPayload): boolean {
  return (
    payload.language === "bilingual" ||
    Boolean(payload.icd10Code?.trim()) ||
    Boolean(payload.citation?.trim()) ||
    Boolean(payload.corpusVersion?.trim()) ||
    Boolean(payload.titleFilipino?.trim())
  );
}

function PatientEducationEditor({
  payload,
  onChange,
  disabled,
}: {
  payload: CdsPatientEducationPayload;
  onChange: (next: CdsProtectedArtifactPayload) => void;
  disabled?: boolean;
}) {
  const corpusBacked = isCorpusBackedEducation(payload);
  const sections = payload.sections;
  const setSections = (next: CdsPatientEducationPayload["sections"]) =>
    onChange({ ...payload, sections: next });

  return (
    <div className="flex flex-col gap-4">
      {corpusBacked ? (
        <ReadOnlyNote>
          This article comes from the approved patient-education corpus. Its title,
          warning signs, citation, structure and Filipino text are fixed to the
          reviewed entry — the English body below is yours to rewrite.
        </ReadOnlyNote>
      ) : (
        <TextField
          label="Title"
          value={payload.title}
          maxLength={200}
          disabled={disabled}
          onChange={(title) => onChange({ ...payload, title })}
        />
      )}

      <div className="flex flex-col gap-3">
        <FieldLabel>Sections</FieldLabel>
        {sections.map((section, index) => {
          const fixed = corpusBacked && section.language === "filipino";
          return (
            <div
              key={index}
              className="rounded-[12px] border border-(--border-subtle) bg-(--surface-card) p-3"
            >
              {corpusBacked ? (
                <p className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold text-(--text-heading)">
                  {section.heading}
                  {section.language ? (
                    <span className="rounded-full bg-(--gray-bg) px-2 py-0.5 text-xs font-normal text-(--gray-fg)">
                      {section.language === "filipino" ? "Filipino" : "English"}
                    </span>
                  ) : null}
                </p>
              ) : (
                <TextField
                  label="Heading"
                  value={section.heading}
                  maxLength={200}
                  disabled={disabled}
                  onChange={(heading) =>
                    setSections(sections.map((item, i) => (i === index ? { ...item, heading } : item)))
                  }
                />
              )}
              <TextAreaField
                label={corpusBacked ? "Content" : "Content"}
                value={section.content}
                maxLength={4000}
                rows={4}
                disabled={disabled || fixed}
                hint={fixed ? "Fixed to the approved Filipino text." : undefined}
                onChange={(content) =>
                  setSections(sections.map((item, i) => (i === index ? { ...item, content } : item)))
                }
              />
            </div>
          );
        })}
      </div>

      {corpusBacked ? (
        <div>
          <FieldLabel>Warning signs (fixed)</FieldLabel>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-(--text-muted)">
            {(payload.warningSigns ?? []).map((sign, index) => (
              <li key={index}>{sign}</li>
            ))}
          </ul>
        </div>
      ) : (
        <StringListField
          label="Warning signs"
          items={payload.warningSigns ?? []}
          max={20}
          maxLength={1000}
          disabled={disabled}
          addLabel="Add warning sign"
          onChange={(warningSigns) => onChange({ ...payload, warningSigns })}
        />
      )}
    </div>
  );
}

/* ── Field primitives ──────────────────────────────────────────────────────── */

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-xs font-bold tracking-wide text-(--text-subtle) uppercase">
      {children}
      {optional ? <span className="ml-1.5 font-normal normal-case">(optional)</span> : null}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  disabled,
  type,
  mono,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  type?: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        className={cn("rounded-[10px]", mono && "font-mono")}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="text-xs text-(--text-subtle)">{hint}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  maxLength,
  rows,
  disabled,
  optional,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <Textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className="rounded-[10px]"
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="text-xs text-(--text-subtle)">{hint}</span> : null}
    </label>
  );
}

function PriorityField({
  value,
  onChange,
  disabled,
}: {
  value: "routine" | "urgent";
  onChange: (value: "routine" | "urgent") => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <FieldLabel>Priority</FieldLabel>
      {/*
        A native select rather than a custom listbox: two closed options with no
        search, no async load, and a value the schema constrains to exactly
        these strings.
      */}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === "urgent" ? "urgent" : "routine")}
        className="h-9 rounded-[10px] border border-(--border-subtle) bg-(--surface-card) px-3 text-sm text-(--text-body) disabled:opacity-50"
      >
        <option value="routine">Routine</option>
        <option value="urgent">Urgent</option>
      </select>
    </label>
  );
}

/**
 * A `minItems`/`maxItems`-bounded list of plain strings (plan goals, warning
 * signs). Removal stops at one entry and addition stops at the schema maximum,
 * so the editor can never produce an array the endpoint rejects.
 */
function StringListField({
  label,
  items,
  onChange,
  max,
  maxLength,
  disabled,
  addLabel,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  maxLength: number;
  disabled?: boolean;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <Textarea
              value={item}
              rows={1}
              maxLength={maxLength}
              disabled={disabled}
              aria-label={`${label} ${index + 1}`}
              className="min-h-9 flex-1 rounded-[10px]"
              onChange={(event) =>
                onChange(items.map((existing, i) => (i === index ? event.target.value : existing)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0 rounded-full text-(--text-subtle) hover:text-(--danger-fg)"
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              disabled={disabled || items.length <= 1}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start rounded-full"
        disabled={disabled || items.length >= max}
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  );
}

function RepeatingGroup({
  legend,
  children,
  count,
  min,
  max,
  onAdd,
  addLabel,
  disabled,
}: {
  legend: string;
  children: React.ReactNode;
  count: number;
  min: number;
  max: number;
  onAdd: () => void;
  addLabel: string;
  disabled?: boolean;
}) {
  void min;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-bold tracking-wide text-(--text-subtle) uppercase">
        {legend}
      </legend>
      {children}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start rounded-full"
        disabled={disabled || count >= max}
        onClick={onAdd}
      >
        <Plus className="size-4" /> {addLabel}
      </Button>
    </fieldset>
  );
}

function GroupItem({
  title,
  children,
  onRemove,
  removable,
  disabled,
}: {
  title: string;
  children: React.ReactNode;
  onRemove: () => void;
  removable: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-(--border-subtle) bg-(--surface-card) p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-(--text-heading)">{title}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full text-(--text-subtle) hover:text-(--danger-fg)"
          aria-label={`Remove ${title}`}
          disabled={disabled || !removable}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] bg-(--surface-sunken) px-3 py-2 text-xs text-(--text-muted)">
      {children}
    </p>
  );
}

/* ── Guards ────────────────────────────────────────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const isTextArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isText);
