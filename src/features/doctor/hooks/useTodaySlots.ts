"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/useAuthStore";
import { listSlotsInRange, type Slot } from "../lib/api/schedule";
import { TODAY_SCHEDULE_POLL_INTERVAL_MS } from "../lib/pollIntervals";

/**
 * Shared query key for "the doctor's published/blocked slots for today",
 * mirroring {@link ../hooks/useTodayAgenda.ts}'s `DOCTOR_TODAY_AGENDA_QUERY_KEY}
 * — the Upcoming-today card (Task 4) merges both into one `CalendarEntry[]`
 * timeline, the same way `/doctor/schedule` merges a week's worth.
 */
export const DOCTOR_TODAY_SLOTS_QUERY_KEY = "doctor-today-slots";

/** Today's date as a platform-irrelevant YYYY-MM-DD — see the caveat below. */
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * The doctor's own slots for today.
 *
 * `GET /v1/doctors/{doctorId}/schedules` keys by `date` (YYYY-MM-DD), the
 * doctor's own wall-clock date — not the platform's Asia/Manila date. This is
 * consistent with how `DoctorScheduleView` already reads the same endpoint:
 * slot dates are what the doctor typed when they published availability, so
 * "today" for this read means the browser's local calendar day. In practice
 * doctors in this product are Philippines-based, so this rarely diverges from
 * the platform-local day {@link useTodayAgenda} uses — but the two hooks are
 * reading two different definitions of "today" by contract, not by coincidence,
 * and this is stated rather than silently assumed to agree.
 */
export function useTodaySlots() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? "");
  const doctorId = useAuthStore((s) => s.session?.userId ?? "");
  const date = todayIso();

  const query = useQuery({
    queryKey: [DOCTOR_TODAY_SLOTS_QUERY_KEY, doctorId, date],
    queryFn: () => listSlotsInRange(idToken, doctorId, date, date),
    enabled: !!idToken && !!doctorId,
    // Shared with `useTodayAgenda`'s poll cadence (see `lib/pollIntervals.ts`)
    // — both are "today's schedule" reads, and a doctor's own writes through
    // `BlockTimeDialog` invalidate this key explicitly rather than waiting on
    // the poll.
    refetchInterval: TODAY_SCHEDULE_POLL_INTERVAL_MS,
    retry: false,
  });

  return {
    slots: query.data ?? ([] as Slot[]),
    date,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
