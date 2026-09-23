"use client";

import { NumberTicker } from "@/components/primitives/NumberTicker";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/features/patient/components/redesign/primitives";
import { useDoctorQueueSummary } from "@/features/doctor/hooks/useDoctorQueueSummary";
import { useDoctorShiftMetrics } from "@/features/doctor/hooks/useDoctorShiftMetrics";

import { DoctorNotification } from "../notification/DoctorNotification";

/**
 * "Shift overview" — a borderless metrics row atop the dashboard's sheet,
 * replacing the "Your practice" shortcut tiles (Calendar/Consults/Chat
 * already live in the sidebar; repeating them here was pure duplication) and
 * carrying the notification bell that used to sit in that row's corner.
 *
 * Four real, distinct figures, every one already read elsewhere on this
 * dashboard so this adds no new request:
 * - **Completed today** — today's agenda bookings with `status ===
 *   "completed"`.
 * - **Live queue** — patients actually needing a decision right now: the
 *   on-demand pool plus the ready/in-progress queue plus scheduled bookings
 *   still awaiting intake confirmation ({@link useDoctorQueueSummary}).
 * - **Next appointment** — the same earliest-live-booking figure
 *   {@link ../homepage/ScheduleCollisionBanner} watches, shown here even
 *   outside its 20-minute collision window so the strip stays a genuine
 *   4-column row rather than 3 real numbers plus a filler.
 * - **Pending payout** — the same figure the old `DoctorTodayStrip` showed.
 *
 * A "pending sign-offs" stat was asked for twice now, and is still not here:
 * there is no endpoint that lists a doctor's outstanding e-prescriptions or
 * certificates across consultations — prescriptions and lab orders exist only
 * *inside* a given consultation record (see `careContinuity.ts`,
 * `prescription.types.ts`). Rendering a hardcoded `0` for it, as the brief's
 * own JSX did, would assert "you have zero pending signatures" to a physician
 * when the platform has no idea whether that is true — exactly the fabricated
 * *outcome* class `fabricated-data-scan.test.ts` was written to catch. Adding
 * this honestly needs a real backend list endpoint first.
 */
export function DoctorShiftLedger() {
  const { metrics, completedToday, isLoading: metricsLoading } = useDoctorShiftMetrics();
  const { totalActive, isLoading: queueLoading } = useDoctorQueueSummary();

  const loading = metricsLoading || queueLoading;
  const nextAppointmentLabel = metrics.nextAppointment
    ? new Date(metrics.nextAppointment.scheduledAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "None today";

  return (
    <section
      data-slot="doctor-shift-ledger"
      aria-labelledby="doctor-shift-ledger-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <SectionLabel id="doctor-shift-ledger-heading">Shift overview</SectionLabel>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) [&_svg]:size-4.5">
          <DoctorNotification />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-b border-(--border-subtle) pb-4 lg:grid-cols-4">
        <Stat label="Completed today" loading={loading}>
          <NumberTicker value={completedToday} className="font-display" />
        </Stat>
        <Stat label="Live queue" loading={loading} tone={totalActive > 0 ? "brand" : "default"}>
          <NumberTicker value={totalActive} className="font-display" />
        </Stat>
        <Stat label="Next appointment" loading={loading} small={!metrics.nextAppointment}>
          {nextAppointmentLabel}
        </Stat>
        <Stat label="Pending payout" loading={loading}>
          <NumberTicker value={metrics.pendingPayout} prefix="₱" className="font-display" />
        </Stat>
      </dl>
    </section>
  );
}

function Stat({
  label,
  children,
  loading,
  tone = "default",
  small = false,
}: {
  label: string;
  children: React.ReactNode;
  loading: boolean;
  tone?: "default" | "brand";
  /** A time-of-day reads oversized at the numeric stats' type scale. */
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
        {label}
      </dt>
      {loading ? (
        <dd aria-hidden className="h-6 w-12 animate-pulse rounded-(--radius-sm) bg-(--surface-warm)" />
      ) : (
        <dd
          className={cn(
            "flex items-center tracking-tight",
            small
              ? "text-[15px] font-semibold text-(--text-muted) leading-tight"
              : cn(
                  "text-xl font-black font-display",
                  tone === "brand" ? "text-(--status-available-fg)" : "text-(--text-heading)",
                ),
          )}
        >
          {children}
        </dd>
      )}
    </div>
  );
}
