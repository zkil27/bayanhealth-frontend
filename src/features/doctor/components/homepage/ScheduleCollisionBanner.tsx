"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

import { useDoctorShiftMetrics } from "@/features/doctor/hooks/useDoctorShiftMetrics";

/** How close a scheduled appointment has to be to warrant the warning. */
const COLLISION_WINDOW_MS = 20 * 60 * 1000;

/** How often the countdown re-checks how close the next appointment is. */
const TICK_MS = 15_000;

/**
 * Schedule Collision Guard — an advisory banner when the doctor's next
 * confirmed scheduled appointment is due within 20 minutes, so accepting a
 * live on-demand request now risks running into it.
 *
 * `metrics.nextAppointment` (`useDoctorShiftMetrics`, shared with
 * `DoctorShiftLedger`) is already "the earliest `confirmed`/`in_progress`
 * booking today at or after now" — exactly the candidate this banner needs,
 * so no second read is added.
 *
 * **What this deliberately does not show**: a patient name. `GET /v1/bookings`
 * (what `useTodayAgenda` reads) carries no patient-identity field at all — see
 * `DoctorBooking` in `lib/api/agenda.ts` — so naming the patient here would be
 * invented. The service type and the time are real; that is what is shown.
 */
export function ScheduleCollisionBanner() {
  const { metrics, isLoading } = useDoctorShiftMetrics();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (isLoading || !metrics.nextAppointment) return null;

  const dueMs = Date.parse(metrics.nextAppointment.scheduledAt);
  if (Number.isNaN(dueMs)) return null;

  const remainingMs = dueMs - nowMs;
  if (remainingMs < 0 || remainingMs > COLLISION_WINDOW_MS) return null;

  const minutesUntil = Math.max(0, Math.round(remainingMs / 60_000));
  const dueLabel = new Date(dueMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      data-slot="schedule-collision-banner"
      role="status"
      className="flex flex-col gap-2 rounded-2xl border border-(--status-soon-fg)/25 bg-(--status-soon-bg) p-3.5 text-(--status-soon-fg) sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Schedule overlap warning
            </span>
            <span className="rounded-full bg-(--status-soon-fg)/15 px-2 py-0.5 text-[10px] font-bold">
              {dueLabel} · in {minutesUntil}m
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-[1.4]">
            You have a confirmed scheduled consultation coming up. Accepting a
            live on-demand request now may delay it.
          </p>
        </div>
      </div>
      <Link
        href="/doctor/schedule"
        className="shrink-0 self-start rounded-xl border border-(--status-soon-fg)/30 bg-(--surface-card) px-3.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap text-(--status-soon-fg) transition-colors hover:bg-(--status-soon-bg) sm:self-center"
      >
        View schedule
      </Link>
    </div>
  );
}
