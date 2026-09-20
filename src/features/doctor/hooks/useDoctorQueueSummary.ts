"use client";

import { useQuery } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";
import { fetchRequestPool } from "../lib/api/requestPool";
import { composeReadyToStartItems } from "../lib/readyToStart";
import { usePatientBoard } from "./usePatientBoard";
import { useTodayAgenda } from "./useTodayAgenda";

/**
 * Same key + poll `RequestPool` itself uses — one shared cache entry, not a
 * second poll. Exported so the standby panel's "Refresh now" action can
 * invalidate it alongside the intake queue and today's agenda.
 */
export const REQUEST_POOL_QUERY_KEY = "doctor-request-pool";

/**
 * A read-only summary across the dashboard's three patient-queue sources
 * (the on-demand pool, the ready/in-progress queue, and scheduled bookings
 * still awaiting intake confirmation) — enough to answer two questions
 * without duplicating any card's own mutations:
 *
 * - **Is the whole queue empty?** So the dashboard can render one calm
 *   standby panel instead of three separate empty states stacked on top of
 *   each other.
 * - **How many patients need attention right now?** Feeds the "Live queue"
 *   figure on {@link ../components/homepage/DoctorShiftLedger}.
 *
 * Every number here is real and already polled elsewhere on the dashboard —
 * this hook only re-subscribes to the same React Query keys `RequestPool` and
 * `usePatientBoard` already use, so it adds no new network request.
 */
export function useDoctorQueueSummary() {
  const idToken = useIdToken();

  const poolQuery = useQuery({
    queryKey: [REQUEST_POOL_QUERY_KEY, idToken],
    queryFn: () => fetchRequestPool(idToken ?? ""),
    enabled: !!idToken,
    retry: false,
  });

  const { board, isConnecting: boardLoading, error: boardError } = usePatientBoard();
  const { bookings: todayBookings, isLoading: agendaLoading } = useTodayAgenda();

  const poolCount = poolQuery.data?.kind === "ok" ? poolQuery.data.requests.length : 0;
  const readyCount = composeReadyToStartItems(board.ready, todayBookings).length;
  const incomingCount = board.requests.length;

  const isLoading = poolQuery.isLoading || boardLoading || agendaLoading;
  const totalActive = poolCount + readyCount + incomingCount;

  return {
    isLoading,
    error: boardError,
    poolCount,
    readyCount,
    incomingCount,
    totalActive,
    isEmpty: !isLoading && !boardError && totalActive === 0,
  };
}
