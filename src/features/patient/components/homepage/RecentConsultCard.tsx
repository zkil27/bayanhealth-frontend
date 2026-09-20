"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Stethoscope } from "lucide-react";

import { formatConsultationDateTime } from "@/lib/consultation-time";
import { initialsOf } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import {
  DOCTOR_RESOLVING_LABEL,
  assignedDoctorLabel,
} from "@/features/booking/lib/doctorLabels";
import {
  Avatar,
  IconBadge,
  cardHoverClass,
} from "@/features/patient/components/redesign/primitives";

import { HomePanel } from "./HomePanel";

/**
 * The patient's most recent finished consultation — who they saw and when, with
 * a route back into it.
 *
 * No diagnosis and no summary line: no patient-facing read carries a diagnosis
 * (the released prescription is `{ medications[], notes? }`, the released
 * education is `{ title, sections[], warningSigns[] }`), so a condition printed
 * against a patient's own record would have to be invented. The card states the
 * doctor and the date, which the booking genuinely holds, and links to the
 * consultation where the released documents actually render.
 *
 * `cancelled` bookings never reach here — the caller slices with
 * `completedForDashboard`, the one definition of "already had" the dashboard
 * shares.
 */
export function RecentConsultCard({
  booking,
  isLoading,
}: {
  booking?: BookingListItem;
  isLoading: boolean;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const doctorId = booking?.doctorId ?? "";

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const doctorName = doctorQuery.data?.fullName;
  const doctorLabel =
    doctorId && doctorQuery.isPending
      ? DOCTOR_RESOLVING_LABEL
      : assignedDoctorLabel(doctorName, doctorId);

  return (
    <HomePanel
      slot="patient-home-recent-consult"
      title="Most recent consult"
      framed
      subCard
      isLoading={isLoading}
      isEmpty={!booking}
      emptyIcon={<Stethoscope strokeWidth={1.5} />}
      emptyLine="No consultations yet — your first one will show up here."
      emptyHref="/patient/booking"
      emptyLinkLabel="Book a consultation"
    >
      {booking ? (
        <Link
          href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
          data-slot="patient-home-recent-consult-link"
          className={`group flex items-center gap-3 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-card) px-3 py-2.5 hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${cardHoverClass}`}
        >
          {doctorName ? (
            <Avatar size={40} tone="soft">
              {initialsOf(doctorName)}
            </Avatar>
          ) : (
            <IconBadge tone="teal" className="size-10 rounded-(--radius-pill)">
              <Stethoscope />
            </IconBadge>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold text-(--text-heading)">
              {doctorLabel}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-(--text-muted)">
              {formatConsultationDateTime(
                booking.updatedAt ?? booking.scheduledAt,
              )}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-(--text-subtle) transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </HomePanel>
  );
}
