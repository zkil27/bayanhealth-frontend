"use client";

import { useCallback } from "react";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  fetchMyPatientChart,
  type ChartEntryType,
  type PatientChart,
  type PatientChartEntry,
} from "../lib/api/patientChart";

/**
 * Patient chart (longitudinal timeline) view (PatientChart slice).
 *
 * Reads the signed-in patient's aggregated health timeline from
 * `GET /v1/patients/me/chart` via {@link fetchMyPatientChart}, rendered through
 * {@link AsyncView} so the four states are standardised:
 * - loading: AsyncView's defined loading indicator while the request is in flight;
 * - data: the timeline rendered as a vertical list, sorted by `occurredAt` DESC;
 * - empty: a defined empty state when `timeline.length === 0`;
 * - error: AsyncView's defined error state with a retry control on failure/timeout.
 */
export function PatientChartView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchMyPatientChart(idToken ?? ""),
    [idToken],
  );

  return (
    <AsyncView<PatientChart>
      fetcher={fetcher}
      deps={[idToken]}
      isEmpty={(chart) => chart.timeline.length === 0}
      empty={<PatientChartEmpty />}
    >
      {(chart) => {
        const entries = [...chart.timeline].sort(
          (a, b) => occurredAtMs(b.occurredAt) - occurredAtMs(a.occurredAt),
        );
        return (
          <ol
            data-slot="patient-chart-timeline"
            className="flex flex-col gap-3"
          >
            {entries.map((entry, index) => (
              <TimelineEntry
                key={entryKey(entry, index)}
                entry={entry}
              />
            ))}
          </ol>
        );
      }}
    </AsyncView>
  );
}

const ENTRY_ICONS: Record<ChartEntryType, LucideIcon> = {
  booking: CalendarClock,
  intake: ClipboardList,
  session: Stethoscope,
  document: FileText,
  lab_result: FlaskConical,
};

function TimelineEntry({ entry }: { entry: PatientChartEntry }) {
  const Icon = ENTRY_ICONS[entry.type] ?? Activity;
  return (
    <li
      data-slot="patient-chart-entry"
      data-type={entry.type}
      className="flex gap-3 rounded-xl border p-4"
    >
      <div
        data-slot="patient-chart-entry-icon"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            data-slot="patient-chart-entry-type"
            variant="secondary"
          >
            {formatEntryType(entry.type)}
          </Badge>
          {entry.status ? (
            <Badge
              data-slot="patient-chart-entry-status"
              variant="outline"
            >
              {formatStatus(entry.status)}
            </Badge>
          ) : null}
        </div>
        <span className="font-semibold text-foreground">{entry.title}</span>
        {entry.summary ? (
          <p
            data-slot="patient-chart-entry-summary"
            className="text-sm text-muted-foreground"
          >
            {entry.summary}
          </p>
        ) : null}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          <time dateTime={entry.occurredAt}>
            {formatOccurredAt(entry.occurredAt)}
          </time>
        </span>
      </div>
    </li>
  );
}

/**
 * Defined empty state with visible text: shown when the backend returns an
 * empty timeline rather than a blank chart area.
 */
function PatientChartEmpty() {
  return (
    <Empty data-slot="patient-chart-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HeartPulse />
        </EmptyMedia>
        <EmptyTitle>Your health timeline is empty</EmptyTitle>
        <EmptyDescription>
          You don&apos;t have any health records yet. Bookings, intakes,
          consultations, documents, and lab results will appear here over time.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Stable-ish key for a timeline entry, falling back to the list index. */
function entryKey(entry: PatientChartEntry, index: number): string {
  const id =
    entry.consultationId ?? entry.bookingId ?? entry.documentId ?? "";
  return `${entry.type}:${id || entry.occurredAt}:${index}`;
}

/** Parse an ISO timestamp to epoch ms for sorting; invalid values sort last. */
function occurredAtMs(occurredAt: string): number {
  const ms = new Date(occurredAt).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}

/** Present a `ChartEntryType` discriminator as a readable label. */
function formatEntryType(type: ChartEntryType): string {
  switch (type) {
    case "booking":
      return "Booking";
    case "intake":
      return "Intake";
    case "session":
      return "Consultation";
    case "document":
      return "Document";
    case "lab_result":
      return "Lab result";
    default:
      return titleCase(type);
  }
}

/** Present a backend status string as a readable label. */
function formatStatus(status: string): string {
  return titleCase(status);
}

/** Present an ISO timestamp as a readable date-time, falling back gracefully. */
function formatOccurredAt(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Turn `snake_case`/`kebab-case` tokens into a Title Case label. */
function titleCase(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
