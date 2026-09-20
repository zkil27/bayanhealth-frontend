"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Stethoscope,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listAgendaInRange, type DoctorBooking } from "@/features/doctor/lib/api/agenda";
import {
  defaultWindow,
  formatWindowLabel,
  isLatestWindow,
  stepWindow,
  type DateWindow,
} from "@/features/doctor/lib/completedWindow";
import type { AsyncState } from "@/lib/asyncView";
import { displayBookingStatus } from "@/lib/bookings";
import { useIdToken } from "@/stores/useAuthStore";
import { NumberTicker } from "@/components/primitives/NumberTicker";

/**
 * The doctor's route back into a completed consultation's post-consult workspace.
 *
 * The intake queue (`GET /v1/doctors/me/intake-queue`) returns only `confirmed`
 * bookings, so a consultation disappeared from every doctor-side surface the
 * moment it completed. The workspace itself was reachable only by the redirect
 * the "End consultation" button fires — close that tab and the Assessment became
 * unreachable, which matters because assessment-first gating means Plan, Rx,
 * final ICD, medical certificate, and patient education only unlock after the
 * physician confirms an Assessment post-consult (ADR-20260703-01).
 *
 * **Task 5 rewrite**: this used to walk up to five cursor pages of
 * `GET /v1/bookings` with no date filter at all — that endpoint paginates over
 * *every* status, so a doctor whose newest bookings were all
 * `confirmed`/`pending_payment` had completed consultations sitting behind
 * pages the walk might never reach, and the five-page cap existed purely to
 * bound the resulting fan-out. `GET /v1/bookings` does accept `from`/`to`
 * (`listAgendaInRange`, already used by the calendar and the today-strip), so
 * this now reads one explicit {@link DateWindow} at a time — default the last
 * seven platform-local days, with prev/next controls to page through prior
 * weeks — rather than guessing how many pages might contain a completed
 * consultation.
 *
 * The card itself collapses by default with a count badge in its header, per
 * the dashboard's "recent consultations is an archive, not a live queue"
 * layout decision — it should not compete with the four urgency-ordered cards
 * above it for vertical space on every visit.
 *
 * Patient names are deliberately absent: the `Booking` contract exposes
 * `patientId` and no name, and the platform holds no patient-name source for the
 * doctor surface. An entry is identified by service type and booking reference,
 * which are real, rather than by a person's name, which would have to be
 * invented (ADR-20260806-02).
 */

/** A completed consultation as this list renders it. */
export interface CompletedConsultation {
  bookingId: string;
  /**
   * Absent when the consultation completed without a one-time link ever being
   * activated, so no session — and therefore no consultation id — was written.
   */
  consultationId?: string;
  status?: string;
  serviceType?: string;
  /** Best available timestamp: when the booking last changed, else its slot. */
  occurredAt?: string;
}

/** Cache window: completed consultations are settled records, not a live queue. */
const STALE_TIME_MS = 1000 * 60;

/**
 * Keep only completed bookings, newest first.
 *
 * Exported for test: the filter and the ordering are the two behaviours worth
 * pinning, and neither needs a rendered tree to exercise.
 */
export function toCompletedConsultations(
  bookings: DoctorBooking[],
): CompletedConsultation[] {
  return bookings
    .filter((booking) => booking.status === "completed" && !!booking.bookingId)
    .map((booking) => ({
      bookingId: booking.bookingId,
      consultationId: booking.consultationId,
      status: booking.status,
      serviceType: booking.serviceType,
      occurredAt: booking.updatedAt ?? booking.scheduledAt,
    }))
    .sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt));
}

/**
 * Read completed consultations within one date window.
 *
 * `listAgendaInRange` already walks every cursor page inside `[fromIso, toIso]`
 * and de-dupes by `bookingId` (consecutive pages can overlap), so this is a
 * single bounded, complete read of the window rather than a page count picked
 * to bound an otherwise-unbounded scan.
 */
export async function fetchCompletedConsultationsInWindow(
  token: string,
  dateWindow: DateWindow,
): Promise<CompletedConsultation[]> {
  const bookings = await listAgendaInRange(token, dateWindow.fromIso, dateWindow.toIso);
  return toCompletedConsultations(bookings);
}

/**
 * Post-consult workspace URL for a consultation.
 *
 * Mirrors the redirect in `ConsultationRoom` exactly — same path, same two query
 * parameters. `bookingId` rides along because the patient's intake is addressed
 * by booking id, not consultation id, so the workspace needs both. Returns
 * `null` without a consultation id rather than routing to a workspace that
 * cannot resolve.
 */
export function postConsultationHref(
  entry: CompletedConsultation,
): string | null {
  if (!entry.consultationId) return null;
  return `/doctor/post-consultation/id?consultationId=${encodeURIComponent(
    entry.consultationId,
  )}&bookingId=${encodeURIComponent(entry.bookingId)}`;
}

/** Sortable epoch value; an absent or unparseable timestamp sorts last. */
function timestamp(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function CompletedConsultations() {
  const idToken = useIdToken();
  const [expanded, setExpanded] = useState(false);
  const [dateWindow, setDateWindow] = useState<DateWindow>(() => defaultWindow());

  const query = useQuery({
    queryKey: [
      "doctor-completed-consultations",
      idToken,
      dateWindow.fromIso,
      dateWindow.toIso,
    ],
    queryFn: (): Promise<CompletedConsultation[]> =>
      fetchCompletedConsultationsInWindow(idToken ?? "", dateWindow),
    enabled: !!idToken,
    staleTime: STALE_TIME_MS,
    retry: false,
  });

  // React Query owns the data lifecycle here, so drive AsyncView in controlled
  // mode and let it render the standard loading / empty / error+retry slots.
  let state: AsyncState<CompletedConsultation[]>;
  if (!idToken || query.isPending) {
    state = { status: "loading" };
  } else if (query.error) {
    state = {
      status: "error",
      message:
        query.error instanceof Error
          ? query.error.message
          : "Couldn't load your completed consultations.",
    };
  } else if (!query.data || query.data.length === 0) {
    state = { status: "empty" };
  } else {
    state = { status: "data", value: query.data };
  }

  const count = state.status === "data" ? state.value.length : null;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="flex w-full flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
      data-slot="completed-consultations"
    >
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 bg-(--surface-brand) p-4 text-left text-lg font-semibold text-(--text-on-brand)"
            aria-expanded={expanded}
            data-slot="completed-consultations-toggle"
          >
            <ClipboardCheck className="size-5" />
            Recent consultations
            {count !== null ? (
              <span className="ml-auto flex h-4 items-center overflow-hidden font-mono text-sm">
                <NumberTicker value={count} />
              </span>
            ) : null}
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"} ${
                count !== null ? "" : "ml-auto"
              }`}
              aria-hidden="true"
            />
          </button>
        }
      />

      <CollapsibleContent>
        <div className="flex flex-col gap-3 p-4">
          <WindowNav
            dateWindow={dateWindow}
            onStep={(direction) => setDateWindow((current) => stepWindow(current, direction))}
          />

          <AsyncView<CompletedConsultation[]>
            state={state}
            onRetry={() => void query.refetch()}
            empty={<CompletedConsultationsEmpty dateWindow={dateWindow} />}
          >
            {(entries) => (
              <ul className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <CompletedConsultationRow key={entry.bookingId} entry={entry} />
                ))}
              </ul>
            )}
          </AsyncView>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WindowNav({
  dateWindow,
  onStep,
}: {
  dateWindow: DateWindow;
  onStep: (direction: 1 | -1) => void;
}) {
  const atLatest = isLatestWindow(dateWindow);
  return (
    <div className="flex items-center justify-between gap-2" data-slot="completed-window-nav">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous week"
        onClick={() => onStep(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm font-medium text-(--text-muted)" data-slot="completed-window-label">
        {formatWindowLabel(dateWindow)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next week"
        disabled={atLatest}
        onClick={() => onStep(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function CompletedConsultationRow({ entry }: { entry: CompletedConsultation }) {
  const href = postConsultationHref(entry);
  const status = displayBookingStatus(entry.status);

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-1.5 truncate font-semibold text-(--text-heading)">
        <Stethoscope className="size-4 shrink-0 text-(--text-muted)" />
        {formatServiceType(entry.serviceType)}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-(--text-muted)">
        <CalendarClock className="size-4 shrink-0" />
        {formatOccurredAt(entry.occurredAt)}
      </span>
      <span className="truncate font-mono text-xs text-(--text-subtle)">
        #{entry.bookingId}
      </span>
      {href ? null : (
        // No consultation id means the consultation ended without a session
        // being activated, so there is no workspace to open. Say so instead of
        // offering a link that resolves to nothing.
        <span
          data-slot="completed-consultation-unavailable"
          className="text-xs text-(--text-muted)"
        >
          No consultation record — post-consult actions unavailable
        </span>
      )}
    </div>
  );

  const statusBadge = (
    <Badge data-slot="booking-status" variant="outline" data-tone={status.tone}>
      {status.label}
    </Badge>
  );

  return (
    <li data-slot="completed-consultation-item">
      {href ? (
        <Link
          href={href}
          data-slot="completed-consultation-link"
          className="flex items-center justify-between gap-4 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4 transition-colors hover:bg-(--surface-warm-soft)"
        >
          {body}
          {statusBadge}
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4 opacity-70">
          {body}
          {statusBadge}
        </div>
      )}
    </li>
  );
}

function CompletedConsultationsEmpty({ dateWindow }: { dateWindow: DateWindow }) {
  return (
    <Empty data-slot="completed-consultations-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardCheck />
        </EmptyMedia>
        <EmptyTitle>No completed consultations</EmptyTitle>
        <EmptyDescription>
          Nothing completed between {formatWindowLabel(dateWindow)}. Use the
          arrows above to look at an earlier week.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Present the contract `serviceType` enum as a readable label. */
function formatServiceType(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return serviceType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Present an ISO timestamp as a readable date-time, falling back gracefully. */
function formatOccurredAt(occurredAt?: string): string {
  if (!occurredAt) return "Time not recorded";
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return occurredAt;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
