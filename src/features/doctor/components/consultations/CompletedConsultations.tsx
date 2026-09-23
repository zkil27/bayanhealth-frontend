"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
  Stethoscope,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  const atLatest = isLatestWindow(dateWindow);

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
      data-slot="completed-consultations"
    >
      {/* ------------------------------------------- panel header bar -- */}
      <div className="flex flex-col gap-3 border-b border-(--border-subtle) bg-(--surface-brand) px-5 py-4 text-(--text-on-brand) sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardCheck className="size-5 shrink-0" />
          <span className="text-base font-semibold sm:text-lg">Recent consultations</span>
          {count !== null ? (
            <span className="flex items-center rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-white">
              <NumberTicker value={count} />
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!atLatest && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setDateWindow(defaultWindow())}
              className="border-white/30 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 hover:text-white"
            >
              <RotateCcw className="size-3" />
              Latest
            </Button>
          )}

          <WindowNav
            dateWindow={dateWindow}
            onStep={(direction) => setDateWindow((current) => stepWindow(current, direction))}
          />
        </div>
      </div>

      {/* ------------------------------------------ panel content deck -- */}
      <div className="flex min-h-[380px] flex-col p-4 sm:p-5">
        <AsyncView<CompletedConsultation[]>
          state={state}
          onRetry={() => void query.refetch()}
          loading={
            <ul className="flex flex-col gap-3" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </li>
              ))}
            </ul>
          }
          empty={
            <CompletedConsultationsEmpty
              dateWindow={dateWindow}
              onResetWindow={!atLatest ? () => setDateWindow(defaultWindow()) : undefined}
            />
          }
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
    </div>
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
    <div
      className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-1.5 py-1 text-white"
      data-slot="completed-window-nav"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Previous week"
        className="text-white hover:bg-white/20 hover:text-white"
        onClick={() => onStep(-1)}
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <span
        className="px-1.5 text-xs font-medium text-white"
        data-slot="completed-window-label"
      >
        {formatWindowLabel(dateWindow)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Next week"
        disabled={atLatest}
        className="text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
        onClick={() => onStep(1)}
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

function CompletedConsultationRow({ entry }: { entry: CompletedConsultation }) {
  const href = postConsultationHref(entry);
  const status = displayBookingStatus(entry.status);

  return (
    <li data-slot="completed-consultation-item">
      <div
        className={cn(
          "group flex flex-col justify-between gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4 transition-all hover:border-(--border-default) hover:bg-(--surface-warm-soft)/50 sm:flex-row sm:items-center sm:gap-4",
          !href && "opacity-75"
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--surface-warm) text-(--text-muted) transition-colors group-hover:text-(--text-heading)">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-(--text-heading)">
                {formatServiceType(entry.serviceType)}
              </span>
              <span className="font-mono text-xs text-(--text-subtle)">
                #{entry.bookingId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-(--text-muted)">
              <CalendarClock className="size-3.5 shrink-0" />
              <span>{formatOccurredAt(entry.occurredAt)}</span>
            </div>
            {!href && (
              <span
                data-slot="completed-consultation-unavailable"
                className="text-xs text-(--text-muted)"
              >
                No consultation record — post-consult actions unavailable
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
          <Badge
            data-slot="booking-status"
            variant="outline"
            className="border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 font-medium"
          >
            {status.label}
          </Badge>

          {href ? (
            <Link
              href={href}
              data-slot="completed-consultation-link"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-(--border-default) bg-(--surface-card) px-3 text-xs font-semibold text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) hover:text-(--text-heading)"
            >
              <span>Chart</span>
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className="text-xs text-(--text-subtle)">No chart</span>
          )}
        </div>
      </div>
    </li>
  );
}

function CompletedConsultationsEmpty({
  dateWindow,
  onResetWindow,
}: {
  dateWindow: DateWindow;
  onResetWindow?: () => void;
}) {
  return (
    <div
      data-slot="completed-consultations-empty"
      className="my-auto flex min-h-[300px] w-full flex-1 flex-col items-center justify-center p-8 text-center"
    >
      <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-(--border-subtle) bg-(--surface-warm) text-(--text-muted)">
        <ClipboardCheck className="size-6 text-(--text-muted)" />
      </div>
      <h3 className="font-display text-base font-semibold text-(--text-heading)">
        No recent consults
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-(--text-muted)">
        No completed consultations found between {formatWindowLabel(dateWindow)}.
      </p>
      {onResetWindow && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetWindow}
          className="mt-4 gap-1.5 text-xs font-semibold"
        >
          <RotateCcw className="size-3.5" />
          Jump to latest week
        </Button>
      )}
    </div>
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
