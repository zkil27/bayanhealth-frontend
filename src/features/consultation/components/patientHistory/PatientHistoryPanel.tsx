"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CircleAlert,
  GitCompareArrows,
  History,
  Info,
  Pencil,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { cn } from "@/lib/utils";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import {
  usePatientHistory,
  type PatientHistoryState,
} from "@/features/consultation/hooks/usePatientHistory";
import { diffSection, type HistoryFieldChange } from "@/features/consultation/lib/patientHistory/diff";
import {
  DRAFT_STATE_TEXT,
  SECTION_LABELS,
  VERSION_STATE_TEXT,
} from "@/features/consultation/lib/patientHistory/labels";
import { sectionRows, visibleSections } from "@/features/consultation/lib/patientHistory/model";
import type {
  HistorySectionId,
  HistoryVersion,
  PatientHistoryData,
} from "@/features/consultation/lib/patientHistory/types";

import {
  AllergiesEditor,
  DemographicsEditor,
  FamilyEditor,
  MedicalEditor,
  ObGynEditor,
  SocialEditor,
  SurgicalEditor,
} from "./HistoryEditors";

/**
 * The patient chart ("Past medical history"), one component for every doctor
 * surface:
 * - queue drawer: `mode="read"`, opens on "changes since last visit";
 * - call room tab: `mode="edit"`, draft autosaves, saving happens after the call;
 * - post-consult rail: `mode="edit"` with `saveEnabled`.
 *
 * Layout follows its container (`@container`), not the viewport, because the
 * same panel lives in a 21rem rail, a ~36rem call tab and a 42rem drawer.
 * Below `lg` each section collapses to a 48px row and one opens at a time.
 */

type View = "draft" | number;

export function PatientHistoryPanel({
  bookingId,
  mode,
  intake,
  saveEnabled = false,
  savedBy,
  showTitle = true,
  className,
}: {
  bookingId: string;
  mode: "read" | "edit";
  /** Intake already loaded by the host, to avoid a second read. */
  intake?: BookingIntakeForm | null;
  /** Show "Save as version N". Only the post-consult workspace saves. */
  saveEnabled?: boolean;
  /** Name stamped on a saved version. */
  savedBy?: string;
  showTitle?: boolean;
  className?: string;
}) {
  const history = usePatientHistory(bookingId, intake === undefined ? undefined : { intake });

  if (history.status === "loading") {
    return (
      <div className={cn("grid gap-2 p-3", className)} aria-busy="true" aria-label="Loading past medical history">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <PanelBody
      history={history}
      mode={mode}
      saveEnabled={saveEnabled}
      savedBy={savedBy}
      showTitle={showTitle}
      className={className}
    />
  );
}

function PanelBody({
  history,
  mode,
  saveEnabled,
  savedBy,
  showTitle,
  className,
}: {
  history: PatientHistoryState;
  mode: "read" | "edit";
  saveEnabled: boolean;
  savedBy?: string;
  showTitle: boolean;
  className?: string;
}) {
  const { versions, latest, draft } = history;
  const [view, setView] = useState<View>(mode === "edit" || !latest ? "draft" : latest.version);
  const [compare, setCompare] = useState(mode === "read");
  const [editing, setEditing] = useState<HistorySectionId | null>(null);
  const collapsible = useIsBreakpoint("max", 1024);
  const [openId, setOpenId] = useState<HistorySectionId | null>("allergies");

  const viewing: HistoryVersion | undefined =
    view === "draft" ? undefined : versions.find((v) => v.version === view);
  const data: PatientHistoryData = viewing?.data ?? draft.data;
  const previous: HistoryVersion | undefined =
    view === "draft" ? latest : versions.find((v) => v.version === (view as number) - 1);
  const isDraftView = view === "draft";
  const editable = mode === "edit" && isDraftView;

  const sections = useMemo(() => visibleSections(data), [data]);
  const changes = useMemo(() => {
    const out: Partial<Record<HistorySectionId, HistoryFieldChange[]>> = {};
    if (!previous) return out;
    for (const id of sections) out[id] = diffSection(previous.data, data, id);
    return out;
  }, [previous, data, sections]);
  const changedCount = Object.values(changes).filter((c) => c && c.length > 0).length;

  // Read mode on a first consult: nothing saved yet, say so before anything else.
  if (mode === "read" && versions.length === 0) {
    return (
      <div className={cn("@container grid gap-3 p-4", className)} data-slot="patient-history-panel">
        {showTitle ? <PanelTitle /> : null}
        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft) p-4">
          <p className="text-sm font-bold text-(--text-heading)">New patient · no chart yet</p>
          <p className="mt-1 text-sm leading-relaxed text-(--text-body)">
            This is their first consultation. The chart starts from today&apos;s intake; you complete it in the
            call under <span className="font-semibold">Past medical history</span> and save it as version 1 after.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-slot="patient-history-panel" className={cn("@container flex min-h-0 flex-col", className)}>
      <header className="grid gap-2 border-b border-(--border-subtle) px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showTitle ? <PanelTitle /> : null}
          {versions.length > 0 || mode === "edit" ? (
            <VersionSelect
              versions={versions}
              view={view}
              onChange={(next) => {
                setView(next);
                setEditing(null);
              }}
              includeDraft={mode === "edit"}
              hasDraft={history.hasDraft}
            />
          ) : null}
        </div>
        <VersionMeta
          viewing={viewing}
          latest={latest}
          isDraftView={isDraftView}
          mode={mode}
          savedThisVisit={!!latest && latest.bookingId === draft.bookingId}
        />
        {previous && (!isDraftView || changedCount > 0) ? (
          <button
            type="button"
            aria-pressed={compare}
            onClick={() => setCompare((c) => !c)}
            className={cn(
              "inline-flex h-12 items-center gap-2 justify-self-start rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:h-8 lg:text-xs",
              compare
                ? "border-(--navy-700) bg-(--surface-brand-soft) text-(--text-heading) dark:border-(--navy-300)"
                : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-warm-soft)",
            )}
          >
            <GitCompareArrows className="size-4" aria-hidden />
            {isDraftView ? `Changes since v${previous.version}` : `Changes from v${previous.version}`}
            <span className="font-normal text-(--text-muted)">
              ({changedCount === 0 ? "none" : `${changedCount} section${changedCount === 1 ? "" : "s"}`})
            </span>
          </button>
        ) : null}
        {mode === "edit" && history.availability === "unavailable" ? (
          <p className="flex gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-warm-soft) px-3 py-2 text-sm leading-snug text-(--text-body) lg:text-xs">
            <Info className="mt-0.5 size-4 shrink-0 text-(--text-muted)" aria-hidden />
            <span>
              Charts can&apos;t be saved to the record yet (server update needed). What you enter stays on this
              device as a draft.
            </span>
          </p>
        ) : null}
      </header>

      <ol className="divide-y divide-(--border-subtle)">
        {sections.map((id) => (
          <SectionBlock
            key={id}
            id={id}
            data={data}
            history={history}
            viewing={viewing}
            editable={editable}
            editing={editing === id}
            onEdit={(on) => setEditing(on ? id : null)}
            changes={compare ? changes[id] : undefined}
            collapsible={collapsible}
            open={!collapsible || openId === id}
            onToggleOpen={() => setOpenId((current) => (current === id ? null : id))}
          />
        ))}
      </ol>

      {mode === "edit" ? (
        <DraftFooter history={history} saveEnabled={saveEnabled} savedBy={savedBy} onSaved={() => setView("draft")} />
      ) : null}
    </div>
  );
}

function PanelTitle() {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-(--text-heading)">
      <History className="size-4 text-(--teal-750) dark:text-(--teal-300)" aria-hidden />
      Past medical history
    </h2>
  );
}

function formatSavedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

function VersionSelect({
  versions,
  view,
  onChange,
  includeDraft,
  hasDraft,
}: {
  versions: HistoryVersion[];
  view: View;
  onChange: (view: View) => void;
  includeDraft: boolean;
  hasDraft: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-(--text-muted) lg:text-xs">
      <span className="sr-only">Chart version</span>
      <span className="relative">
        <select
          value={String(view)}
          onChange={(e) => onChange(e.target.value === "draft" ? "draft" : Number(e.target.value))}
          className="h-12 appearance-none rounded-lg border border-(--border-default) bg-(--surface-card) py-0 pr-9 pl-3 text-base font-semibold text-(--text-heading) outline-none focus-visible:border-(--teal-700) focus-visible:ring-3 focus-visible:ring-(--focus-ring)/30 lg:h-8 lg:pr-8 lg:pl-2.5 lg:text-xs"
        >
          {includeDraft ? (
            <option value="draft">Today{hasDraft ? " · draft" : ""}</option>
          ) : null}
          {[...versions].reverse().map((v) => (
            <option key={v.version} value={v.version}>
              v{v.version} · {formatSavedAt(v.savedAt)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-(--text-muted)" aria-hidden />
      </span>
    </label>
  );
}

function VersionMeta({
  viewing,
  latest,
  isDraftView,
  mode,
  savedThisVisit,
}: {
  viewing?: HistoryVersion;
  latest?: HistoryVersion;
  isDraftView: boolean;
  mode: "read" | "edit";
  /** The latest version was saved from this same consultation. */
  savedThisVisit: boolean;
}) {
  let text: ReactNode;
  if (viewing) {
    text = (
      <>
        <span className="font-semibold text-(--text-heading)">Version {viewing.version}</span> · saved{" "}
        {formatSavedAt(viewing.savedAt)} by {viewing.savedBy}
        {latest && viewing.version !== latest.version ? (
          <span className="font-semibold text-(--attention-fg)"> · older version, read-only</span>
        ) : null}
      </>
    );
  } else if (isDraftView && latest && savedThisVisit && mode === "edit") {
    text = (
      <>
        <span className="font-semibold text-(--status-available-fg)">Saved as v{latest.version} for this consultation.</span>{" "}
        Only save again if something changed; it would become v{latest.version + 1}.
      </>
    );
  } else if (isDraftView && latest) {
    text = (
      <>
        Today&apos;s chart, starting from <span className="font-semibold text-(--text-heading)">v{latest.version}</span>{" "}
        ({formatSavedAt(latest.savedAt)}, {latest.savedBy}).{" "}
        {mode === "edit" ? "Update what changed, or mark a section reviewed." : null}
      </>
    );
  } else {
    text = (
      <>
        <span className="font-semibold text-(--text-heading)">First consultation · no saved chart.</span> Pre-filled
        from today&apos;s intake. Confirm each section with the patient.
      </>
    );
  }
  return <p className="text-sm leading-snug text-(--text-body) lg:text-xs">{text}</p>;
}

function SectionBlock({
  id,
  data,
  history,
  viewing,
  editable,
  editing,
  onEdit,
  changes,
  collapsible,
  open,
  onToggleOpen,
}: {
  id: HistorySectionId;
  data: PatientHistoryData;
  history: PatientHistoryState;
  viewing?: HistoryVersion;
  editable: boolean;
  editing: boolean;
  onEdit: (on: boolean) => void;
  changes?: HistoryFieldChange[];
  collapsible: boolean;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const title = SECTION_LABELS[id].title;
  const status = viewing
    ? VERSION_STATE_TEXT[viewing.sections[id]]
    : DRAFT_STATE_TEXT[history.states[id]];
  const draftState = history.states[id];
  const reviewed = history.draft.reviewed.includes(id);
  const canMarkReviewed = editable && !editing && (draftState === "carried" || draftState === "from_intake" || reviewed);
  const note = editable ? history.notes[id] : undefined;
  const headingId = `pmh-${id}`;
  const hasChanges = !!changes && changes.length > 0;

  const actions = (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
            {canMarkReviewed ? (
              <Button
                type="button"
                variant="ghost"
                aria-pressed={reviewed}
                onClick={() => history.toggleReviewed(id)}
                className={cn(
                  "h-12 px-3 text-sm lg:h-7 lg:px-2 lg:text-xs",
                  reviewed && "text-(--status-available-fg)",
                )}
              >
                <Check aria-hidden />
                {reviewed ? "Reviewed" : "Mark reviewed"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={editing ? "primary" : "outline"}
              onClick={() => onEdit(!editing)}
              aria-expanded={editing}
              className="h-12 px-3 text-sm lg:h-7 lg:px-2 lg:text-xs"
            >
              {editing ? <Check aria-hidden /> : <Pencil aria-hidden />}
              {editing ? "Done" : "Edit"}
            </Button>
    </div>
  );

  const heading = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span id={headingId} className="text-sm font-bold text-(--text-heading)">
        {title}
      </span>
      <StatusText tone={status.tone} size="sm">
        {status.label}
      </StatusText>
      {hasChanges ? (
        <StatusText tone="info" size="sm" icon={GitCompareArrows}>
          {changes.length} change{changes.length === 1 ? "" : "s"}
        </StatusText>
      ) : null}
      {note ? <CircleAlert className="size-4 text-(--attention-fg)" aria-label="Intake differs" /> : null}
    </span>
  );

  return (
    <li aria-labelledby={headingId} className={cn("px-3.5", hasChanges && "border-l-2 border-l-(--navy-700) dark:border-l-(--navy-300)")}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2 lg:min-h-10">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggleOpen}
            className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {heading}
            <ChevronDown className={cn("size-5 shrink-0 text-(--text-muted) transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        ) : (
          heading
        )}
        {editable && open && !collapsible ? actions : null}
      </div>

      {open ? (
        <div className="pb-3">
          {editable && collapsible ? <div className="mb-2">{actions}</div> : null}
          {note ? (

            <p className="mb-2 flex gap-2 rounded-lg border border-(--attention-border)/40 bg-(--attention-bg) px-2.5 py-1.5 text-sm text-(--attention-fg) lg:text-xs">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {note}
            </p>
          ) : null}
          {editing ? (
            <SectionEditor id={id} history={history} />
          ) : (
            <SectionRows data={data} id={id} changes={changes} />
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Label above value in a narrow container; side by side from `@md`. */
const PAIR = "grid gap-0.5 @md:grid-cols-[minmax(8rem,11rem)_1fr] @md:gap-4";

function SectionRows({ data, id, changes }: { data: PatientHistoryData; id: HistorySectionId; changes?: HistoryFieldChange[] }) {
  const rows = sectionRows(data, id).filter((row) => row.value !== "");
  const changeByKey = new Map((changes ?? []).map((c) => [c.key, c]));
  const removed = (changes ?? []).filter((c) => c.after === "");

  if (rows.length === 0 && removed.length === 0) {
    return <p className="text-sm text-(--text-muted) lg:text-xs">Not recorded</p>;
  }
  return (
    <dl className="grid gap-2.5 text-sm @md:gap-1.5 lg:text-[13px]">
      {rows.map((row) => {
        const change = changeByKey.get(row.key);
        return (
          <div key={row.key} className={PAIR}>
            <dt className="text-xs text-(--text-muted) @md:text-[length:inherit]">{row.label}</dt>
            <dd className="min-w-0 text-(--text-body)">
              <span className={cn(change && "font-semibold text-(--text-heading)")}>{row.value}</span>
              {change ? (
                <span className="block text-xs text-(--text-muted)">
                  {change.before ? (
                    <>
                      Was: <s>{change.before}</s>
                    </>
                  ) : (
                    "New"
                  )}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
      {removed.map((change) => (
        <div key={`removed-${change.key}`} className={PAIR}>
          <dt className="text-xs text-(--text-muted) @md:text-[length:inherit]">{change.label}</dt>
          <dd className="text-(--text-muted)">
            <s>{change.before}</s> <span className="text-xs font-semibold">Removed</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionEditor({ id, history }: { id: HistorySectionId; history: PatientHistoryState }) {
  const { data } = history.draft;
  switch (id) {
    case "allergies":
      return <AllergiesEditor value={data.allergies} onChange={(v) => history.updateSection("allergies", v)} />;
    case "demographics":
      return <DemographicsEditor value={data.demographics} onChange={(v) => history.updateSection("demographics", v)} />;
    case "medical":
      return <MedicalEditor value={data.medical} onChange={(v) => history.updateSection("medical", v)} />;
    case "surgical":
      return <SurgicalEditor value={data.surgical} onChange={(v) => history.updateSection("surgical", v)} />;
    case "family":
      return <FamilyEditor value={data.family} onChange={(v) => history.updateSection("family", v)} />;
    case "obgyn":
      return <ObGynEditor value={data.obgyn} onChange={(v) => history.updateSection("obgyn", v)} />;
    case "social":
      return <SocialEditor value={data.social} onChange={(v) => history.updateSection("social", v)} />;
  }
}

function draftSummary(history: PatientHistoryState): string {
  const counts = { updated: 0, reviewed: 0, from_intake: 0 };
  for (const id of history.sections) {
    const state = history.states[id];
    if (state === "updated" || state === "reviewed" || state === "from_intake") counts[state] += 1;
  }
  const parts = [
    counts.updated ? `${counts.updated} updated` : "",
    counts.reviewed ? `${counts.reviewed} reviewed` : "",
    counts.from_intake ? `${counts.from_intake} from intake to confirm` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No changes yet";
}

function DraftFooter({
  history,
  saveEnabled,
  savedBy,
  onSaved,
}: {
  history: PatientHistoryState;
  saveEnabled: boolean;
  savedBy?: string;
  onSaved: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const unconfirmed = history.sections.filter((id) => history.states[id] === "from_intake");
  const carried = history.sections.filter((id) => history.states[id] === "carried");

  const save = async () => {
    try {
      const version = await history.save(savedBy || "Attending doctor");
      setConfirming(false);
      onSaved();
      toast.success(`Chart saved as version ${version.version}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The chart could not be saved.");
    }
  };

  return (
    <div className="sticky bottom-0 z-10 grid gap-2 border-t border-(--border-subtle) bg-(--surface-card) px-3.5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
      <p className="text-sm text-(--text-body) lg:text-xs" aria-live="polite">
        {history.hasDraft ? (
          <>
            <span className="font-semibold text-(--text-heading)">Draft on this device</span>
            {" · "}
            {draftSummary(history)}
          </>
        ) : (
          <span className="font-semibold text-(--text-heading)">{draftSummary(history)}</span>
        )}
      </p>
      {saveEnabled ? (
        <>
          <Button
            type="button"
            variant="primary"
            className="h-12 w-full text-base lg:h-9 lg:text-sm"
            disabled={!history.canSave || history.saving}
            onClick={() => setConfirming(true)}
          >
            <Save aria-hidden />
            Save as version {history.nextVersion}
          </Button>
          {!history.canSave ? (
            <p className="text-xs text-(--text-muted)">Saving the chart needs a server update.</p>
          ) : null}
          <ResponsiveSheet
            open={confirming}
            onOpenChange={setConfirming}
            icon={Save}
            title={`Save chart as version ${history.nextVersion}?`}
            description="Saved versions can't be edited. The next consultation starts from this one."
            footer={
              <>
                <Button type="button" variant="primary" onClick={() => void save()} disabled={history.saving}>
                  {history.saving ? "Saving…" : `Save version ${history.nextVersion}`}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                  Keep editing
                </Button>
              </>
            }
          >
            <ul className="grid gap-1.5 text-sm">
              {history.sections.map((id) => {
                const status = DRAFT_STATE_TEXT[history.states[id]];
                return (
                  <li key={id} className="flex items-center justify-between gap-3">
                    <span className="text-(--text-body)">{SECTION_LABELS[id].title}</span>
                    <StatusText tone={status.tone} size="sm">
                      {status.label}
                    </StatusText>
                  </li>
                );
              })}
            </ul>
            {carried.length > 0 ? (
              <p className="mt-3 text-sm text-(--text-muted)">
                {`${carried.length === 1 ? "1 section was" : `${carried.length} sections were`} not reviewed today. They are saved as “Carried forward” from v${history.latest?.version ?? ""}.`}
              </p>
            ) : null}
            {unconfirmed.length > 0 ? (
              <p className="mt-3 flex gap-2 rounded-lg border border-(--attention-border)/40 bg-(--attention-bg) px-3 py-2 text-sm text-(--attention-fg)">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {`${unconfirmed.length === 1 ? "1 section is" : `${unconfirmed.length} sections are`} still as the patient entered them. They will be saved marked “Patient-reported”.`}
              </p>
            ) : null}
          </ResponsiveSheet>
        </>
      ) : (
        <p className="text-xs text-(--text-muted)">
          Saved automatically on this device. Save it as version {history.nextVersion} from the post-consult
          workspace.
        </p>
      )}
    </div>
  );
}
