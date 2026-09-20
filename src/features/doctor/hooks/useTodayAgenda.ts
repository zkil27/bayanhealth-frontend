"use client";

import { useQuery } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";
import { listAgendaInRange, type DoctorBooking } from "../lib/api/agenda";
import { platformTodayRangeUtc } from "../lib/metrics";
import { TODAY_SCHEDULE_POLL_INTERVAL_MS } from "../lib/pollIntervals";

/**
 * Shared query key for "the doctor's bookings scheduled today". Exported so
 * every card reading today's agenda — Ready-to-start (Task 3) and
 * Upcoming-today (Task 4) — subscribes to the same React Query cache entry
 * instead of each issuing its own `GET /v1/bookings` read. Reusing the key is
 * what makes them share one poll instead of independent ones (dashboard
 * polling consolidation, Task 6) — see the cross-component cache-key drift
 * this codebase already learned the hard way in `usePatientBoard`'s
 * `DOCTOR_INTAKE_QUEUE_QUERY_KEY`.
 */
export const DOCTOR_TODAY_AGENDA_QUERY_KEY = "doctor-today-agenda";

/**
 * The doctor's own bookings scheduled on the platform-local "today".
 *
 * A thin React Query wrapper over {@link listAgendaInRange}, windowed to
 * {@link platformTodayRangeUtc} so the read costs one bounded query (per that
 * module's own pagination walk) rather than paging the doctor's whole booking
 * history.
 *
 * **Known limitation, stated rather than hidden**: the window is keyed to each
 * booking's `scheduledAt`, not to when a consultation actually started. A
 * consultation scheduled shortly before platform-local midnight that is still
 * `in_progress` after midnight falls outside the next read's window and would
 * drop off a card driven by this hook. This is the same class of edge case
 * `matcher.ts` documents and defers rather than solves outright — the fix would
 * be tracking session state instead of scheduled time, which is a larger change
 * than this task's scope.
 */
export function useTodayAgenda() {
  const idToken = useIdToken();

  const query = useQuery({
    queryKey: [DOCTOR_TODAY_AGENDA_QUERY_KEY, idToken],
    queryFn: () => {
      const { from, to } = platformTodayRangeUtc();
      return listAgendaInRange(idToken ?? "", from, to);
    },
    enabled: !!idToken,
    refetchInterval: TODAY_SCHEDULE_POLL_INTERVAL_MS,
    retry: false,
  });

  return {
    bookings: query.data ?? ([] as DoctorBooking[]),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
