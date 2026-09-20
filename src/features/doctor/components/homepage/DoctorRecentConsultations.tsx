"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Stethoscope } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/features/patient/components/redesign/primitives";
import { bookingServices } from "@/types/booking.types";
import { useIdToken } from "@/stores/useAuthStore";
import type { AsyncState } from "@/lib/asyncView";

import { defaultWindow } from "../../lib/completedWindow";
import {
  fetchCompletedConsultationsInWindow,
  postConsultationHref,
  type CompletedConsultation,
} from "../consultations/CompletedConsultations";

/** Rows shown in place before the doctor has to leave the dashboard for the full archive. */
const VISIBLE_CAP = 3;

/** Settled records, not a live queue — same cadence `CompletedConsultations` itself uses. */
const STALE_TIME_MS = 1000 * 60;

function formatOccurredAt(occurredAt?: string): string {
  if (!occurredAt) return "Recent";
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function serviceLabel(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return bookingServices.find((s) => s.value === serviceType)?.label ?? "Consultation";
}

/**
 * The sheet's lower deck — a static, non-accordion replacement for the
 * collapsible `CompletedConsultations` card this dashboard used to embed.
 *
 * The collapsible version was built for `/doctor/history`-style browsing (week
 * paging, an expand toggle), which is exactly the wrong shape for a dashboard
 * summary: collapsed, it left a tall empty void; expanded, it could dump
 * every one of a busy week's records into the page and blow out the layout
 * mid-render. This reads the same 7-day window through the same real query
 * (`fetchCompletedConsultationsInWindow` — no new endpoint), but always
 * renders top {@link VISIBLE_CAP} statically and sends "see more" to the real
 * archive route (`/doctor/history`) instead of expanding in place.
 *
 * **Left column** — the top 3 real completed consultations, service type +
 * date, linking to the post-consult workspace when one exists.
 *
 * **Right column** — "This week at a glance": a real breakdown of the same
 * window by service type. A brief asked for "Clinical Deliverables" counters
 * here (prescriptions/certs/lab-reviews awaiting signature, each hardcoded to
 * `0`) and links to `/guidelines/*` pages. Neither is real: there is no
 * endpoint listing a doctor's outstanding paperwork across consultations
 * (prescriptions and lab orders exist only *inside* one consultation record —
 * see `careContinuity.ts`), and `/guidelines/*` are not routes this app
 * serves. A permanent `0` would tell a physician "nothing is pending" when the
 * platform has no idea, and a guideline link would 404 — this panel fills the
 * same space with a number that is actually true.
 */
export function DoctorRecentConsultations() {
  const idToken = useIdToken();
  const dateWindow = useMemo(() => defaultWindow(), []);

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

  let state: AsyncState<CompletedConsultation[]>;
  if (!idToken || query.isPending) {
    state = { status: "loading" };
  } else if (query.error) {
    state = {
      status: "error",
      message:
        query.error instanceof Error
          ? query.error.message
          : "Couldn't load your recent consultations.",
    };
  } else {
    state = { status: "data", value: query.data ?? [] };
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 border-t border-(--border-subtle) pt-4 lg:grid-cols-12"
      data-slot="doctor-recent-consultations"
    >
      {/* --------------------------------------------- recent consultations -- */}
      <div className="flex flex-col gap-3 lg:col-span-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SectionLabel>Recent consultations</SectionLabel>
            {state.status === "data" ? (
              <span className="rounded-full bg-(--surface-warm) px-2 py-0.5 text-[10px] font-bold text-(--text-muted)">
                {state.value.length}
              </span>
            ) : null}
          </div>
          <Link
            href="/doctor/history"
            className="shrink-0 text-[12.5px] font-bold text-(--status-available-fg) hover:underline"
          >
            {state.status === "data" && state.value.length > 0
              ? `View all ${state.value.length} →`
              : "View history →"}
          </Link>
        </div>

        <AsyncView
          state={state}
          onRetry={() => void query.refetch()}
          loading={
            <ul className="flex flex-col gap-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                </li>
              ))}
            </ul>
          }
        >
          {(entries) =>
            entries.length === 0 ? (
              <p className="rounded-xl border border-(--border-subtle) bg-(--surface-warm)/60 p-4 text-center text-[12.5px] text-(--text-muted)">
                No consultations completed in the last 7 days.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.slice(0, VISIBLE_CAP).map((entry) => (
                  <RecentConsultationRow key={entry.bookingId} entry={entry} />
                ))}
              </ul>
            )
          }
        </AsyncView>
      </div>

      {/* -------------------------------------------------- week at a glance -- */}
      <div className="flex flex-col gap-3 lg:col-span-5 lg:border-l lg:border-(--border-subtle) lg:pl-6">
        <SectionLabel>This week at a glance</SectionLabel>
        {state.status === "data" ? (
          <WeekGlance entries={state.value} />
        ) : (
          <Skeleton className="h-24 w-full rounded-xl" />
        )}
      </div>
    </div>
  );
}

function RecentConsultationRow({ entry }: { entry: CompletedConsultation }) {
  const href = postConsultationHref(entry);
  const label = serviceLabel(entry.serviceType);
  const dateLabel = formatOccurredAt(entry.occurredAt);

  const body = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Stethoscope className="size-4 shrink-0 text-(--text-muted)" />
      <span className="truncate text-[13px] font-semibold text-(--text-heading)">{label}</span>
      <span className="shrink-0 text-[11px] text-(--text-subtle)">· {dateLabel}</span>
    </div>
  );

  return (
    <li
      className="flex items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3"
      data-slot="recent-consultation-row"
    >
      {body}
      {href ? (
        <Link
          href={href}
          className="shrink-0 rounded-xl border border-(--border-default) px-2.5 py-1 text-[11.5px] font-bold text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface)"
        >
          Chart →
        </Link>
      ) : (
        <span className="shrink-0 text-[11px] text-(--text-subtle)">No record</span>
      )}
    </li>
  );
}

function WeekGlance({ entries }: { entries: CompletedConsultation[] }) {
  const byService = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const label = serviceLabel(entry.serviceType);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-warm)/50 p-3.5">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 font-semibold text-(--text-heading)">
          <ClipboardCheck className="size-3.5 text-(--status-available-fg)" />
          Completed this week
        </span>
        <span className="font-mono font-bold text-(--text-heading)">{entries.length}</span>
      </div>
      {byService.length === 0 ? (
        <p className="text-[11.5px] text-(--text-muted)">Nothing completed yet this week.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {byService.map(([label, count]) => (
            <li
              key={label}
              className="flex items-center justify-between border-t border-(--border-subtle) pt-1.5 text-[12px] text-(--text-muted) first:border-t-0 first:pt-0"
            >
              <span className="truncate">{label}</span>
              <span className="font-mono font-semibold text-(--text-heading)">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
