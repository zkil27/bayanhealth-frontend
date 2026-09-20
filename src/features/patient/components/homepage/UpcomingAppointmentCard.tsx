"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock } from "lucide-react";

import { initialsOf } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import {
  DOCTOR_RESOLVING_LABEL,
  assignedDoctorLabel,
} from "@/features/booking/lib/doctorLabels";

/**
 * The next scheduled consultation: who, when, and a way into it.
 *
 * The caller passes the booking already sliced by `upcomingForDashboard`, which
 * is the one definition of "ahead" this dashboard shares and which never yields
 * a `cancelled` row.
 *
 * The doctor's avatar is initials, not a photo. There is no per-doctor image
 * anywhere in the API — `fabricated-data-scan.test.ts` explicitly asserts that
 * `SearchDoctor` declares no `avatarUrl` — so a portrait here would have to be
 * invented. `specialty` is real (`DoctorPublicSummary.specialty`) and is simply
 * omitted when the doctor has not set one.
 */
export function UpcomingAppointmentCard({
  booking,
  isLoading,
  embedded = false,
}: {
  booking?: BookingListItem;
  isLoading?: boolean;
  /** Rendered inside the consolidated care-status card: drop the card chrome. */
  embedded?: boolean;
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
  const specialty = doctorQuery.data?.specialty;
  const doctorLabel =
    doctorId && doctorQuery.isPending
      ? DOCTOR_RESOLVING_LABEL
      : assignedDoctorLabel(doctorName, doctorId);

  const serviceLine = booking?.serviceType
    ? booking.serviceType
        .split(/[_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : null;

  return (
    <section
      data-slot="next-visit"
      aria-labelledby="next-visit-heading"
      className={
        embedded
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-5 shadow-(--shadow-float)"
      }
    >
      <h3
        id="next-visit-heading"
        className="text-[10px] font-semibold tracking-(--tracking-overline) text-(--text-subtle) uppercase"
      >
        Upcoming visit
      </h3>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="h-16 animate-pulse rounded-(--radius-widget) bg-(--gray-bg)"
        />
      ) : !booking ? (
        <div data-slot="next-visit-empty" className="flex flex-col gap-1.5">
          <p className="text-[13px] text-(--text-muted)">
            No upcoming visits scheduled.
          </p>
          <Link
            href="/patient/booking/search"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-(--status-available-fg) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            Find a doctor
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <Link
          href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
          className="group flex flex-col gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--surface-brand) text-[13px] font-bold text-(--text-on-brand)">
              {doctorName ? initialsOf(doctorName) : "—"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-(--text-heading) group-hover:underline">
                {doctorLabel}
              </span>
              {specialty ? (
                <span className="block truncate text-[12px] text-(--text-muted)">
                  {specialty}
                </span>
              ) : null}
            </span>
            <CalendarClock
              aria-hidden
              className="size-4 shrink-0 text-(--text-subtle)"
            />
          </div>

          {serviceLine ? (
            <p className="text-[13px] font-semibold text-(--text-body)">
              {serviceLine}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-2 border-t border-(--border-subtle) pt-3">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                Date
              </dt>
              <dd className="mt-0.5 truncate text-[13.5px] font-bold text-(--text-heading)">
                {formatDate(booking.scheduledAt)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                Time
              </dt>
              <dd className="mt-0.5 truncate text-[13.5px] font-bold text-(--text-heading)">
                {formatTime(booking.scheduledAt)}
              </dd>
            </div>
          </dl>
        </Link>
      )}
    </section>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Rendered in the viewer's own locale and zone, like every other time on this
 * dashboard. Stamping "PHT" on a value formatted in the browser's zone would
 * mislabel it for anyone travelling.
 */
function formatTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
