"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { displayBookingStatus, hasNextPage as metaHasNextPage } from "@/lib/bookings";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { useAuthStore } from "@/stores/useAuthStore";
import { initialsOf } from "@/lib/utils";
import {
  Avatar,
  Card,
  cardHoverClass,
  Chip,
  IconBadge,
  SectionLabel,
} from "@/features/patient/components/redesign/primitives";
import {
  fetchBookingPage,
  type BookingListItem,
} from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import {
  DOCTOR_RESOLVING_LABEL,
  assignedDoctorLabel,
} from "@/features/booking/lib/doctorLabels";
import {
  fetchMyPatientChart,
  type ChartEntryType,
  type PatientChartEntry,
} from "@/features/patient/lib/api/patientChart";
import {
  buildRecordNodes,
  groupByMonth,
  RECORD_FILTERS,
  type RecordFilter,
  type RecordNode,
} from "@/features/patient/lib/health/recordsModel";
import { HealthDrawer } from "./HealthDrawer";
import {
  ClinicalSummaryDrawerContent,
  MedicalCertificateDrawerContent,
  PrescriptionDrawerContent,
} from "./HealthDrawerContent";
import {
  LoadError,
  LoadingRows,
  NoMatches,
  formatOccurredAt,
  formatServiceType,
  titleCase,
} from "./healthStates";

/** Bookings fetched per cursor page. */
const PAGE_SIZE = 20;

/**
 * The signed-in patient's chart, shared across the record spine and every
 * drawer trigger that reads a booking's events.
 */
function useMyChart() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  return useQuery({
    queryKey: ["patient-health-chart", idToken],
    queryFn: () => fetchMyPatientChart(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });
}

/** Which of the three record previews is open, and the data it needs. */
type RecordDrawerContent =
  | {
      kind: "prescription";
      title: string;
      subtitle: string;
      consultationId: string;
    }
  | {
      kind: "clinical_summary";
      title: string;
      subtitle: string;
      entries: PatientChartEntry[];
    }
  | {
      kind: "medical_certificate";
      title: string;
      subtitle: string;
      scheduledAt?: string;
    };

/**
 * The Records tab — one consultation spine replacing what used to be three
 * separate tabs (Consultations, Documents, Timeline) reading the same two
 * sources. Each visit expands to reveal its own chart events; a chart event
 * with no loaded booking gets its own top-level row instead of vanishing.
 */
export function PatientRecordsTab({
  query,
  filter,
  onFilterChange,
}: {
  query: string;
  filter: RecordFilter;
  onFilterChange: (filter: RecordFilter) => void;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  // `content` is deliberately not cleared on close (only `open` flips false) so
  // the panel still has something to render while it slides out, the same
  // trick `ProtocolWorkflowDrawer` uses for the Med Hub's drawer.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<RecordDrawerContent | null>(null);
  const openDrawer = (content: RecordDrawerContent) => {
    setDrawerContent(content);
    setDrawerOpen(true);
  };

  /*
   * Paged through the contract's opaque cursor (`meta.pagination.cursor`), the
   * same mechanism the bookings list this screen absorbed used. Without it the
   * merge would have silently capped a patient's history at one page.
   *
   * Own cache key, distinct from Overview's `useQuery` — an infinite query's
   * cache entry is shaped `{ pages, pageParams }`, and a plain `useQuery`
   * sharing this key would seed it with a bare page instead, crashing whichever
   * hook reads it second.
   */
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["patient-health-bookings", idToken],
    queryFn: ({ pageParam }) => fetchBookingPage(idToken ?? "", pageParam, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      metaHasNextPage(lastPage.meta) ? (lastPage.meta.pagination?.cursor ?? undefined) : undefined,
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  // Flattened and de-duplicated by `bookingId`: a cursor page can legitimately
  // repeat a row that moved between pages while the patient was reading.
  const bookings = useMemo(() => {
    const seen = new Set<string>();
    const merged: BookingListItem[] = [];
    for (const page of data?.pages ?? []) {
      for (const booking of page.bookings) {
        if (seen.has(booking.bookingId)) continue;
        seen.add(booking.bookingId);
        merged.push(booking);
      }
    }
    return merged;
  }, [data?.pages]);

  // A chart failure must not take the record list down with it — entries
  // default to empty and every visit simply shows no nested events. Memoized
  // so the empty-array fallback is referentially stable across renders —
  // otherwise every render would hand `nodes` a "new" array and recompute it.
  const chartQuery = useMyChart();
  const chartEntries = useMemo(() => chartQuery.data?.timeline ?? [], [chartQuery.data]);

  const nodes = useMemo(
    () => buildRecordNodes({ bookings, entries: chartEntries, filter, query }),
    [bookings, chartEntries, filter, query],
  );
  const groups = useMemo(() => groupByMonth(nodes, (node) => node.occurredAtMs), [nodes]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [autoExpanded, setAutoExpanded] = useState(false);
  // Open the newest visit once real data has arrived, so a first-time reader
  // isn't met with a wall of collapsed rows. Only ever fires once — after that
  // the patient's own expand/collapse choices are what stick, including across
  // a filter change that might otherwise re-trigger it.
  useEffect(() => {
    if (autoExpanded) return;
    const first = groups[0]?.items[0];
    if (!first) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(new Set([first.key]));
    setAutoExpanded(true);
  }, [autoExpanded, groups]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) return <LoadingRows label="Loading your records…" />;
  if (error) return <LoadError error={error} onRetry={() => void refetch()} isFetching={isFetching} />;

  if (bookings.length === 0 && chartEntries.length === 0) {
    return (
      <Empty data-slot="patient-health-records-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Stethoscope />
          </EmptyMedia>
          <EmptyTitle>No health records yet</EmptyTitle>
          <EmptyDescription>
            Once you book a consultation, it will appear here together with the
            events that happen along the way — intake, the visit itself, and
            anything your doctor releases.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div data-slot="patient-health-records" className="flex flex-col gap-4">
      <div role="group" aria-label="Filter records" className="flex flex-wrap gap-2">
        {RECORD_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => onFilterChange(id)}
            className={`rounded-(--radius-pill) border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
              filter === id
                ? "border-(--action-primary) bg-(--surface-accent-soft) text-(--status-available-fg)"
                : "border-(--border-default) bg-(--surface-card) text-(--text-heading) hover:bg-(--action-secondary-hover-surface)"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <NoMatches />
      ) : (
        groups.map(({ label, items }) => (
          <div key={label} className="flex flex-col gap-2.5">
            <SectionLabel className="pt-1">{label}</SectionLabel>
            {items.map((node) =>
              node.kind === "consultation" ? (
                <ConsultationRow
                  key={node.key}
                  node={node}
                  chartEntries={chartEntries}
                  expanded={expanded.has(node.key)}
                  onToggle={() => toggle(node.key)}
                  onOpenDrawer={openDrawer}
                />
              ) : (
                <EventRow key={node.key} entry={node.event} />
              ),
            )}
          </div>
        ))
      )}

      {hasNextPage ? (
        <div className="flex justify-center pt-1">
          <Button
            data-slot="patient-health-next-page"
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Spinner className="mr-2 size-3" />
                Loading…
              </>
            ) : (
              "Load earlier consultations"
            )}
          </Button>
        </div>
      ) : null}

      <HealthDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerContent?.title ?? ""}
        subtitle={drawerContent?.subtitle}
      >
        {drawerContent?.kind === "prescription" ? (
          <PrescriptionDrawerContent consultationId={drawerContent.consultationId} />
        ) : drawerContent?.kind === "clinical_summary" ? (
          <ClinicalSummaryDrawerContent entries={drawerContent.entries} />
        ) : drawerContent?.kind === "medical_certificate" ? (
          <MedicalCertificateDrawerContent scheduledAt={drawerContent.scheduledAt} />
        ) : null}
      </HealthDrawer>
    </div>
  );
}

/** `displayBookingStatus` tone → {@link Chip} tone. */
const CHIP_TONE = {
  success: "safe",
  info: "info",
  warning: "pending",
  neutral: "neutral",
} as const;

function ConsultationRow({
  node,
  chartEntries,
  expanded,
  onToggle,
  onOpenDrawer,
}: {
  node: Extract<RecordNode, { kind: "consultation" }>;
  chartEntries: PatientChartEntry[];
  expanded: boolean;
  onToggle: () => void;
  onOpenDrawer: (content: RecordDrawerContent) => void;
}) {
  const { booking } = node;
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const status = displayBookingStatus(booking.status, !!booking.declinedBy);

  // Same query key and cache window as the home rail and the booking detail,
  // so a doctor already resolved on another patient screen costs nothing here.
  const doctorId = booking.doctorId ?? "";
  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const doctorName = doctorQuery.data?.fullName;
  const doctorLabel =
    doctorId && doctorQuery.isPending ? DOCTOR_RESOLVING_LABEL : assignedDoctorLabel(doctorName, doctorId);
  const chipTone = CHIP_TONE[status.tone as keyof typeof CHIP_TONE] ?? "neutral";
  const StatusIcon = status.tone === "success" ? CircleCheck : status.tone === "warning" ? Clock : null;

  const consultationId = booking.consultationId ?? "";
  const canPreviewRecord = booking.status === "completed" && !!consultationId;
  const recordSubtitle = `${doctorLabel} · ${formatConsultationDateTime(booking.scheduledAt)}`;
  const panelId = `record-panel-${booking.bookingId}`;
  const buttonId = `record-toggle-${booking.bookingId}`;

  return (
    <div data-slot="patient-health-record-row" className="flex flex-col gap-2">
      <Card className="p-0 overflow-hidden">
        <div className="flex items-stretch gap-0">
          <button
            type="button"
            id={buttonId}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {/* Initials of the real assigned doctor; a booking with no doctor
                yet gets the neutral stethoscope rather than invented initials. */}
            {doctorName ? (
              <Avatar>{initialsOf(doctorName)}</Avatar>
            ) : (
              <IconBadge tone="teal" className="rounded-(--radius-pill)">
                <Stethoscope />
              </IconBadge>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-(--text-heading)">{doctorLabel}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-(--text-muted)">
                <CalendarClock className="size-3.5 shrink-0" />
                <span className="truncate">
                  {formatServiceType(booking.serviceType)} · {formatConsultationDateTime(booking.scheduledAt)}
                </span>
              </p>
            </div>
            <Chip tone={chipTone} icon={StatusIcon ? <StatusIcon /> : undefined} className="shrink-0">
              {status.label}
            </Chip>
            <ChevronDown
              aria-hidden
              className={`size-4 shrink-0 text-(--text-subtle) transition-transform duration-200 motion-reduce:transition-none ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
          <Link
            href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
            data-slot="patient-health-consultation"
            aria-label="Open booking"
            className="flex shrink-0 items-center border-l border-(--border-subtle) px-3 text-(--text-subtle) transition-colors hover:bg-(--action-secondary-hover-surface) hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            <ChevronRight className="size-[18px]" />
          </Link>
        </div>

        {expanded ? (
          <div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            className="flex flex-col gap-2.5 border-t border-(--border-subtle) bg-(--surface-sunken) p-4"
          >
            {node.entries.length > 0 ? (
              <ol className="flex flex-col gap-2">
                {node.entries.map((entry, index) => (
                  <ChartEventRow key={`${entry.type}:${index}`} entry={entry} compact />
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-(--text-muted)">No events recorded for this visit.</p>
            )}

            {canPreviewRecord ? (
              <div
                data-slot="patient-health-consultation-record-actions"
                className="flex flex-wrap gap-2 pt-1"
              >
                <DrawerLinkButton
                  onClick={() =>
                    onOpenDrawer({
                      kind: "prescription",
                      title: "Your prescription",
                      subtitle: recordSubtitle,
                      consultationId,
                    })
                  }
                >
                  Prescription
                </DrawerLinkButton>
                <DrawerLinkButton
                  onClick={() =>
                    onOpenDrawer({
                      kind: "clinical_summary",
                      title: "Consultation record",
                      subtitle: recordSubtitle,
                      entries: chartEntries.filter((entry) => entry.bookingId === booking.bookingId),
                    })
                  }
                >
                  Clinical summary
                </DrawerLinkButton>
                <DrawerLinkButton
                  onClick={() =>
                    onOpenDrawer({
                      kind: "medical_certificate",
                      title: "Medical certificate",
                      subtitle: recordSubtitle,
                      scheduledAt: booking.scheduledAt,
                    })
                  }
                >
                  Medical certificate
                </DrawerLinkButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/** Compact text trigger for opening a {@link HealthDrawer} from a row. */
function DrawerLinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-(--radius-pill) border border-(--border-default) bg-(--surface-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      {children}
    </button>
  );
}

/** Icon and readable label per chart entry type. */
const ENTRY_META: Record<
  ChartEntryType,
  { label: string; Icon: typeof CalendarClock; tone: "teal" | "navy" | "neutral" }
> = {
  booking: { label: "Booking", Icon: CalendarClock, tone: "neutral" },
  intake: { label: "Intake", Icon: ClipboardList, tone: "neutral" },
  session: { label: "Consultation", Icon: Stethoscope, tone: "teal" },
  document: { label: "Document", Icon: FileText, tone: "teal" },
  lab_result: { label: "Lab result", Icon: FlaskConical, tone: "navy" },
};

/** One chart event, either nested under its visit (`compact`) or standalone. */
function ChartEventRow({ entry, compact = false }: { entry: PatientChartEntry; compact?: boolean }) {
  const meta = ENTRY_META[entry.type] ?? { label: titleCase(entry.type), Icon: CalendarClock, tone: "neutral" as const };
  const { Icon } = meta;

  const body = (
    <div
      data-slot="patient-health-record-event"
      className={`flex gap-3 rounded-(--radius-md) ${
        compact ? "border border-(--border-subtle) bg-(--surface-card) px-3 py-2.5" : `border border-(--border-subtle) bg-(--surface-card) px-3.5 py-3 hover:border-(--border-strong) ${cardHoverClass}`
      }`}
    >
      <IconBadge tone={meta.tone} className={compact ? "size-9 [&_svg]:size-[18px]" : undefined}>
        <Icon />
      </IconBadge>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
            {meta.label}
          </span>
          {entry.status ? <Chip tone="neutral">{titleCase(entry.status)}</Chip> : null}
        </div>
        <p className="text-[14px] font-bold text-(--text-heading)">{entry.title}</p>
        {entry.summary ? (
          <p className="text-[13px] leading-[1.4] text-(--text-muted)">{entry.summary}</p>
        ) : null}
        <p className="text-[12.5px] text-(--text-subtle)">
          <time dateTime={entry.occurredAt}>{formatOccurredAt(entry.occurredAt)}</time>
        </p>
      </div>
    </div>
  );

  if (compact) return <li>{body}</li>;
  return <>{body}</>;
}

/** A chart event whose booking hasn't loaded (or has none) — its own top-level row. */
function EventRow({ entry }: { entry: PatientChartEntry }) {
  const body = <ChartEventRow entry={entry} />;
  if (!entry.bookingId) return body;
  return (
    <Link
      href={`/patient/booking/getBooking/${encodeURIComponent(entry.bookingId)}`}
      className="block rounded-(--radius-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      {body}
    </Link>
  );
}
