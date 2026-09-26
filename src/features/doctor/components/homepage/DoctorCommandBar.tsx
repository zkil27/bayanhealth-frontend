"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { initialsOf, cn } from "@/lib/utils";
import { NumberTicker } from "@/components/primitives/NumberTicker";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useIdToken } from "@/stores/useAuthStore";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";
import { useDoctorShiftMetrics } from "@/features/doctor/hooks/useDoctorShiftMetrics";
import { useDoctorQueueSummary } from "@/features/doctor/hooks/useDoctorQueueSummary";
import { updateDoctorProfile } from "@/features/doctor/lib/api/kyc";
import { DoctorNotification } from "../notification/DoctorNotification";

export const DOCTOR_ME_PROFILE_QUERY_KEY = "doctor-me-profile";

/**
 * The Doctor Command Bar — a unified horizontal cockpit bar mounted at the top of `/doctor`.
 *
 * Consolidates:
 * 1. Clinician Identity (avatar, name, specialty, date, and profile link).
 * 2. Master Operational Duty Switch (single source of truth for on-demand walk-in availability).
 * 3. Shift Overview Metrics Ribbon (Completed today, Live queue, Next appointment, Pending payout).
 * 4. Practice Notifications.
 *
 * This replaces the previous fragmented setup where the doctor had to look across 3 separate cards
 * (Identity card, standalone Duty card, and Shift Ledger) to see their operational state.
 */
export function DoctorCommandBar() {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const { profile, isLoading: isProfileLoading } = useMyDoctorProfile();
  const { metrics, completedToday, isLoading: metricsLoading } = useDoctorShiftMetrics();
  const { totalActive, isLoading: queueLoading } = useDoctorQueueSummary();

  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(createIdempotencyKeyManager());

  const name = profile?.fullName?.trim() || "Doctor";
  const specialty = profile?.specialty?.trim();
  const isOnDuty = profile?.onDemandAvailable ?? false;
  const isShiftLoading = Boolean(idToken && (metricsLoading || queueLoading));

  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
    const date = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayLabel(`${weekday} · ${date}`);
  }, []);

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (!idToken || !profile) throw new Error("Your profile hasn't loaded yet.");
      await updateDoctorProfile(
        idToken,
        {
          fullName: profile.fullName,
          licenseNumber: profile.licenseNumber,
          ...(profile.specialty ? { specialty: profile.specialty } : {}),
          ...(profile.phoneNumber ? { phoneNumber: profile.phoneNumber } : {}),
          ...(profile.bio ? { bio: profile.bio } : {}),
          onDemandAvailable: next,
        },
        keyRef.current.current(),
      );
      keyRef.current.reset();
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: [DOCTOR_ME_PROFILE_QUERY_KEY] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Couldn't update your duty status.");
    },
  });

  const nextAppointmentLabel = metrics.nextAppointment
    ? new Date(metrics.nextAppointment.scheduledAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "None today";

  return (
    <header
      data-slot="doctor-command-bar"
      aria-label="Doctor Command Center"
      className="flex flex-col gap-4 rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-float) lg:p-5"
    >
      {/* Top Row: Identity + Master Duty Switch + Notifications */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Clinician Identity */}
        <div className="flex items-center gap-3.5">
          <Link
            href="/doctor/profile"
            aria-label="Open your profile"
            className="group relative flex size-12 shrink-0 items-center justify-center rounded-full bg-(--surface-brand) text-sm font-bold text-(--text-on-brand) shadow-sm ring-2 ring-(--surface-page) transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            {initialsOf(name, "Dr")}
          </Link>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-(--status-available-fg) uppercase">
                Kumusta,
              </span>
              <span className="text-[11px] font-medium text-(--text-subtle)">
                {todayLabel ?? " "}
              </span>
            </div>
            <h1 className="truncate text-base font-bold text-(--text-heading) md:text-lg">
              {isProfileLoading ? (
                <span className="inline-block h-5 w-32 animate-pulse rounded bg-(--surface-warm)" />
              ) : (
                `Dr. ${name.replace(/^dr\.?\s*/i, "")}`
              )}
            </h1>
            <div className="flex items-center gap-2 text-xs text-(--text-muted)">
              {specialty ? (
                <span className="flex items-center gap-1 font-medium">
                  <Stethoscope className="size-3 text-(--text-subtle)" aria-hidden />
                  {specialty}
                </span>
              ) : null}
              <Link
                href="/doctor/profile"
                className="inline-flex items-center gap-1 font-semibold text-(--status-available-fg) hover:underline"
              >
                Profile <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {/* Duty Status Capsule & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Master Duty Switch Capsule */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3.5 py-2 transition-colors",
              isOnDuty
                ? "border-(--status-available-fg)/30 bg-(--status-available-bg)"
                : "border-(--border-subtle) bg-(--surface-warm)",
            )}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    isOnDuty ? "bg-(--status-available-fg)" : "bg-(--gray-fg)",
                  )}
                />
                <span className={isOnDuty ? "text-(--status-available-fg)" : "text-(--text-muted)"}>
                  {isOnDuty ? "On-duty" : "Offline"}
                </span>
              </div>
              <span className="text-[11px] text-(--text-subtle)">
                {isOnDuty ? "Accepting walk-ins" : "Walk-ins paused"}
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isOnDuty}
              aria-label={isOnDuty ? "Go offline" : "Go on-duty"}
              disabled={toggle.isPending || !profile}
              onClick={() => toggle.mutate(!isOnDuty)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:opacity-60",
                isOnDuty ? "bg-(--status-available-fg)" : "bg-(--gray-fg)",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-(--surface-raised) shadow-sm transition-transform",
                  isOnDuty && "translate-x-5",
                )}
              />
            </button>
          </div>

          {/* Notification Center */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) [&_svg]:size-4.5">
            <DoctorNotification />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-semibold text-(--danger-fg)">
          {error}
        </p>
      ) : null}

      {/* Bottom Row: Shift Overview Metrics Ribbon */}
      <dl className="grid grid-cols-2 gap-3 border-t border-(--border-subtle) pt-3 sm:grid-cols-4 md:gap-4">
        <StatCell label="Completed today" loading={isShiftLoading}>
          <NumberTicker value={completedToday} className="font-display" />
        </StatCell>
        <StatCell
          label="Live queue"
          loading={isShiftLoading}
          tone={totalActive > 0 ? "brand" : "default"}
        >
          <NumberTicker value={totalActive} className="font-display" />
        </StatCell>
        <StatCell label="Next appointment" loading={isShiftLoading} small={!metrics.nextAppointment}>
          {nextAppointmentLabel}
        </StatCell>
        <StatCell label="Pending payout" loading={isShiftLoading}>
          <NumberTicker value={metrics.pendingPayout} prefix="₱" className="font-display" />
        </StatCell>
      </dl>
    </header>
  );
}

function StatCell({
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
  small?: boolean;
}) {
  return (
    <div className="flex min-h-[68px] flex-col justify-between rounded-xl border border-(--border-subtle)/60 bg-(--surface-warm)/30 p-2.5 transition-colors sm:p-3">
      <dt className="text-[10px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
        {label}
      </dt>
      {loading ? (
        <dd aria-hidden className="mt-1 h-6 w-12 animate-pulse rounded bg-(--surface-warm)" />
      ) : (
        <dd
          className={cn(
            "mt-1 flex items-center tracking-tight",
            small
              ? "text-sm font-semibold text-(--text-muted) leading-tight"
              : cn(
                  "text-lg font-black md:text-xl leading-none font-display",
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
