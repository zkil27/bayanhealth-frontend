"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useIdToken } from "@/stores/useAuthStore";
import { composeDoctorTodayMetrics, type DoctorPayoutLike } from "../lib/metrics";
import { useTodayAgenda } from "./useTodayAgenda";

/**
 * The doctor dashboard's shift numbers, composed once and shared by both
 * {@link ../components/homepage/DoctorShiftLedger} and
 * {@link ../components/homepage/ScheduleCollisionBanner} — they need the same
 * "what does today look like" answer, so this exists to give it to them from
 * one payouts read rather than two.
 *
 * `completedToday` and `todayCount`/`nextAppointment`/`pendingPayout` are all
 * real, distinct figures: none of it is invented to fill a slot the platform
 * has no data for (unlike, say, a per-doctor "pending signatures" count, which
 * has no backing endpoint and is deliberately not on this dashboard).
 */
export function useDoctorShiftMetrics() {
  const idToken = useIdToken();
  const { bookings, isLoading: agendaLoading, error: agendaError } = useTodayAgenda();

  const payoutsQuery = useQuery({
    queryKey: ["doctor-payouts", idToken],
    queryFn: () => api.get<DoctorPayoutLike[]>("/v1/doctors/me/payouts", idToken ?? ""),
    enabled: !!idToken,
    retry: false,
  });

  const isLoading = agendaLoading || payoutsQuery.isLoading;
  const error = agendaError ?? payoutsQuery.error;

  const metrics = composeDoctorTodayMetrics(bookings, payoutsQuery.data?.data ?? []);
  const completedToday = bookings.filter((b) => b.status === "completed").length;

  return {
    metrics,
    completedToday,
    isLoading,
    error,
    refetch: () => void payoutsQuery.refetch(),
  };
}
