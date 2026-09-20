"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import { readinessFor } from "@/lib/patient/patientHomeState";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { assignedDoctorLabel } from "@/features/booking/lib/doctorLabels";
import {
  fetchMyFollowUps,
  type FollowUpRecommendation,
} from "@/features/patient/lib/api/patientFollowUps";

import { ScheduledHero } from "./ScheduledHero";

/**
 * Tier 1's right column, under the week calendar: the detail for the one thing
 * the patient has to prepare for.
 *
 * Three outcomes only. An upcoming booking renders its readiness card; with
 * nothing booked but a physician-recommended follow-up on file, that
 * recommendation and a way to book it; otherwise **nothing at all**.
 *
 * The "otherwise" used to be a care-record summary — "0 documents saved · 9 past
 * visits recorded" with a link in. It read as filler: two counts a patient
 * cannot act on, in the most valuable column on the page, duplicating a link the
 * records section already carries. The week calendar above now answers "what is
 * on my schedule", so rendering nothing is the honest, quieter answer — and it
 * lets the rail end where its content ends instead of padding it out.
 */
export function NextVisitCard({
  booking,
  isLoading,
}: {
  booking?: BookingListItem;
  isLoading: boolean;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const { data: followUps } = useQuery({
    queryKey: ["patient-follow-ups", idToken],
    queryFn: () => fetchMyFollowUps(idToken ?? ""),
    // Only relevant when nothing is booked; skip the read entirely otherwise.
    enabled: !!idToken && !isLoading && !booking,
    staleTime: 1000 * 60 * 2,
    retry: false,
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div
        data-slot="next-visit-loading"
        role="status"
        aria-label="Loading your next appointment"
        className="h-40 animate-pulse rounded-2xl border border-(--border-subtle) bg-(--surface-warm)"
      />
    );
  }

  if (booking) {
    return <ScheduledHero booking={booking} readiness={readinessFor(booking)} />;
  }

  const recommendation = followUps?.[0];
  if (recommendation) return <FollowUpCard recommendation={recommendation} />;

  return null;
}

/**
 * The no-appointment slot when a physician has recommended a follow-up: whose
 * recommendation it is, when it is due, why, and a route to book it with the
 * same doctor.
 */
function FollowUpCard({
  recommendation,
}: {
  recommendation: FollowUpRecommendation;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const doctorId = recommendation.recommendedByActorId;

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });
  const doctorLabel = assignedDoctorLabel(doctorQuery.data?.fullName, doctorId);

  return (
    <section
      data-slot="next-visit-follow-up"
      className="flex flex-col gap-3 rounded-2xl border border-(--border-subtle)/60 bg-(--surface-accent-soft) p-4 shadow-(--shadow-float) md:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
          Follow-up recommended
        </p>
        <span className="shrink-0 rounded-(--radius-pill) bg-(--surface-card) px-2 py-0.5 text-[12px] font-bold text-(--status-available-fg)">
          {dueLabel(recommendation.targetDate)}
        </span>
      </div>

      <p className="text-[15px] leading-[1.4] text-(--text-body)">
        <span className="font-bold text-(--text-heading)">{doctorLabel}</span>{" "}
        recommended a follow-up by{" "}
        <span className="font-bold text-(--text-heading)">
          {formatTargetDate(recommendation.targetDate)}
        </span>
        .
      </p>

      {recommendation.reason ? (
        <p className="text-[13.5px] leading-[1.45] text-(--text-muted)">
          {recommendation.reason}
        </p>
      ) : null}

      <Link
        href={`/patient/booking/doctor/${encodeURIComponent(doctorId)}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-(--radius-pill) bg-(--action-primary) px-4 text-[14.5px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-(--action-primary-hover) hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <CalendarClock className="size-4" />
        Schedule follow-up
      </Link>
    </section>
  );
}

/** "in 5 days" / "due today" / "3 days overdue" for a YYYY-MM-DD date. */
function dueLabel(targetDate: string): string {
  const dueMs = Date.parse(`${targetDate}T00:00:00`);
  if (Number.isNaN(dueMs)) return "soon";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((dueMs - today.getTime()) / 86_400_000);
  if (days === 0) return "due today";
  if (days > 0) return `in ${days} ${days === 1 ? "day" : "days"}`;
  const overdue = -days;
  return `${overdue} ${overdue === 1 ? "day" : "days"} overdue`;
}

function formatTargetDate(targetDate: string): string {
  const date = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return targetDate;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
