"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, PhilippinePeso, Stethoscope } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncView } from "@/components/async-view";
import { NumberTicker } from "@/components/primitives/NumberTicker";
import { api } from "@/lib/api";
import { useIdToken } from "@/stores/useAuthStore";
import {
  composeDoctorTodayMetrics,
  type DoctorPayoutLike,
} from "@/features/doctor/lib/metrics";
import { useTodayAgenda } from "@/features/doctor/hooks/useTodayAgenda";
import type { AsyncState } from "@/lib/asyncView";

/**
 * The doctor dashboard's "today" strip — replaces the old metrics row
 * (Task 2 of the doctor-dashboard rebuild).
 *
 * The previous row paired a lifetime-earnings card with a "patients this week"
 * bar chart bucketed from the *current* intake queue — a completed booking
 * leaves that queue, so every past weekday read 0 and the total equalled the
 * queue count. It was one number, drawn twice. This strip renders three real,
 * distinct figures in one compact band instead: how many consultations are
 * today, when the next one starts, and how much payout is still pending.
 *
 * **Task 6 polling consolidation**: this used to run its own independent
 * `GET /v1/bookings` read with a day-bounded `from`/`to` — the exact same
 * request `useTodayAgenda` already makes for `ReadyToStartCard` and
 * `UpcomingTodayCard`, just issued a second time under a different cache key.
 * Composing today's bookings from {@link useTodayAgenda} instead means this
 * strip shares that one cached read and poll rather than adding a fourth. The
 * payout read has no other consumer on the dashboard, so it keeps its own
 * query.
 */
export function DoctorTodayStrip({
  orientation = "row",
}: {
  /**
   * `row` — the original three-across band (used when the strip is full-width).
   * `column` — stacked, for the dashboard's narrow identity rail.
   */
  orientation?: "row" | "column";
} = {}) {
  const idToken = useIdToken();
  const { bookings, isLoading: bookingsLoading, error: bookingsError } = useTodayAgenda();

  const payoutsQuery = useQuery({
    queryKey: ["doctor-payouts", idToken],
    queryFn: () => api.get<DoctorPayoutLike[]>("/v1/doctors/me/payouts", idToken ?? ""),
    enabled: !!idToken,
    retry: false,
  });

  const isLoading = bookingsLoading || payoutsQuery.isLoading;
  const error = bookingsError ?? payoutsQuery.error;

  // Two independent async sources composed by hand, so this drives AsyncView
  // in controlled mode rather than its single-fetcher form — the same pattern
  // `ReadyToStartCard` already uses for its own two-source read.
  let state: AsyncState<ReturnType<typeof composeDoctorTodayMetrics>>;
  if (!idToken || isLoading) {
    state = { status: "loading" };
  } else if (error) {
    state = {
      status: "error",
      message: error instanceof Error ? error.message : "Couldn't load today's metrics.",
    };
  } else {
    // Never `empty`: the strip always renders, saying "No consultations
    // today" rather than disappearing — see `isDoctorTodayMetricsEmpty`'s own
    // doc for why that predicate always returns false.
    state = {
      status: "data",
      value: composeDoctorTodayMetrics(bookings, payoutsQuery.data?.data ?? []),
    };
  }

  return (
    <AsyncView
      state={state}
      onRetry={() => void payoutsQuery.refetch()}
      loading={<DoctorTodayStripSkeleton orientation={orientation} />}
    >
      {(metrics) => (
        <div
          className={
            orientation === "column"
              ? "grid w-full grid-cols-1 gap-3"
              : "grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
          }
          data-slot="doctor-today-strip"
        >
          <StripItem
            icon={<Stethoscope className="size-5" />}
            label="Consultations today"
          >
            <NumberTicker value={metrics.todayCount} className="font-display" />
          </StripItem>

          <StripItem icon={<CalendarClock className="size-5" />} label="Next appointment">
            {metrics.nextAppointment ? (
              <span className="font-display text-lg font-bold text-(--text-heading)">
                {formatTimeOfDay(metrics.nextAppointment.scheduledAt)}
              </span>
            ) : (
              <span className="text-sm text-(--text-muted)">
                No consultations today
              </span>
            )}
          </StripItem>

          <StripItem icon={<PhilippinePeso className="size-5" />} label="Pending payout">
            <span className="flex items-center font-display text-lg font-bold text-(--text-heading)">
              ₱<NumberTicker value={metrics.pendingPayout} className="font-display" />
            </span>
          </StripItem>
        </div>
      )}
    </AsyncView>
  );
}

function StripItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex-row items-center gap-3 rounded-[18px] border-(--border-subtle) bg-(--surface-card) p-4 shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(--status-available-fg)">
        {icon}
      </div>
      <CardContent className="flex flex-col gap-0.5 p-0">
        <span className="font-display text-lg font-bold text-(--text-heading)">{children}</span>
        <span className="text-xs text-(--text-muted)">{label}</span>
      </CardContent>
    </Card>
  );
}

/** `HH:MM AM/PM`, platform-local, for an ISO instant. */
function formatTimeOfDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function StripItemSkeleton() {
  return (
    <Card className="flex-row items-center gap-3 rounded-[18px] border-(--border-subtle) bg-(--surface-card) p-4 shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <CardContent className="flex flex-col gap-1.5 p-0">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function DoctorTodayStripSkeleton({
  orientation = "row",
}: {
  orientation?: "row" | "column";
} = {}) {
  return (
    <div
      className={
        orientation === "column"
          ? "grid w-full grid-cols-1 gap-3"
          : "grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
      }
    >
      <StripItemSkeleton />
      <StripItemSkeleton />
      <StripItemSkeleton />
    </div>
  );
}
