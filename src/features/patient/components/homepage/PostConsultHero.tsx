"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock3, Pill, Stethoscope } from "lucide-react";

import { formatConsultationDateTime } from "@/lib/consultation-time";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { fetchReleasedPrescription } from "@/features/consultation/lib/api/releasedPrescription";
import { fetchReleasedPatientEducation } from "@/features/consultation/lib/api/patientEducation";
import {
  Avatar,
  Chip,
  IconBadge,
} from "@/features/patient/components/redesign/primitives";

/**
 * `POST_CONSULT` — the care kit for a consultation finished in the last week.
 *
 * Both reads are patient-scoped by contract ("the consultation's own `patient`,
 * or its assigned `doctor`") and each returns nothing until a physician releases
 * the artifact, so a chip appears only when there is a real document behind it.
 *
 * Two things the spec asked for are absent, deliberately:
 *
 * - **A diagnosis tag** ("Acute Bronchitis — follow-up in 5 days"). No
 *   patient-facing read carries a diagnosis: the released prescription is
 *   `{ medications[], notes? }` and the released education is
 *   `{ title, sections[], warningSigns[], citation? }`. Printing a diagnosis
 *   here would mean inventing one, on the screen where that is least acceptable.
 * - **"Send Rx to partner pharmacy for delivery"**. There is no pharmacy
 *   integration, no partner, and no fulfilment endpoint. A button that appears
 *   to send a prescription somewhere and does not is worse than its absence.
 *
 * A booking that never started a session has no `consultationId`, so there is
 * nothing to read; the hero still renders, saying the consultation is finished
 * and pointing at its record.
 */
export function PostConsultHero({ booking }: { booking: BookingListItem }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const consultationId = booking.consultationId ?? "";
  const doctorId = booking.doctorId ?? "";

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const prescriptionQuery = useQuery({
    queryKey: ["released-prescription", consultationId, idToken],
    queryFn: () => fetchReleasedPrescription(idToken ?? "", consultationId),
    enabled: !!idToken && consultationId.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: false,
  });

  const educationQuery = useQuery({
    queryKey: ["released-education", consultationId, idToken],
    queryFn: () => fetchReleasedPatientEducation(idToken ?? "", consultationId),
    enabled: !!idToken && consultationId.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: false,
  });

  const doctor = doctorQuery.data;
  const medications = prescriptionQuery.data?.payload.medications ?? [];
  const education = educationQuery.data?.payload;
  const detail = `/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`;
  const stillPreparing =
    consultationId.length > 0 &&
    (prescriptionQuery.isPending || educationQuery.isPending);
  const nothingReleased =
    !stillPreparing && medications.length === 0 && !education;

  return (
    <section
      data-slot="patient-home-hero"
      data-state="POST_CONSULT"
      className="flex flex-col gap-4 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) md:p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
          Your care plan
        </p>
        <div className="flex items-center gap-3 pt-1">
          {doctor?.fullName ? (
            <Avatar size={48}>{initialsOf(doctor.fullName)}</Avatar>
          ) : (
            <IconBadge tone="teal" className="size-12 rounded-(--radius-pill)">
              <Stethoscope />
            </IconBadge>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] leading-tight font-bold text-(--text-heading)">
              {doctor?.fullName
                ? `From ${doctor.fullName}`
                : "Your recent consultation"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[14px] text-(--text-muted)">
              <Clock3 className="size-3.5 shrink-0" />
              {formatConsultationDateTime(
                booking.updatedAt ?? booking.scheduledAt,
              )}
            </p>
          </div>
        </div>
      </div>

      {stillPreparing ? (
        <p
          data-slot="care-kit-preparing"
          className="rounded-(--radius-md) bg-(--surface-sunken) p-3.5 text-[14.5px] leading-[1.5] text-(--text-body)"
        >
          Your doctor is finishing your care summary. We will email you when it
          is ready, and it will appear here.
        </p>
      ) : nothingReleased ? (
        <p
          data-slot="care-kit-empty"
          className="rounded-(--radius-md) bg-(--surface-sunken) p-3.5 text-[14.5px] leading-[1.5] text-(--text-body)"
        >
          Your consultation is complete. Nothing has been released for this
          visit — if your doctor prepares a prescription or care guide, it will
          appear here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {medications.length > 0 ? (
            <Link
              href={detail}
              data-slot="care-kit-prescription"
              className="rounded-(--radius-pill) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              <Chip tone="safe" icon={<Pill />} className="min-h-9 px-3">
                Prescription ·{" "}
                {medications.length === 1
                  ? "1 medicine"
                  : `${medications.length} medicines`}
              </Chip>
            </Link>
          ) : null}

          {education ? (
            <Link
              href={detail}
              data-slot="care-kit-education"
              className="max-w-full rounded-(--radius-pill) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              <Chip tone="info" icon={<BookOpen />} className="min-h-9 max-w-full px-3">
                <span className="truncate">{education.title}</span>
              </Chip>
            </Link>
          ) : null}
        </div>
      )}

      {/* The warning signs a physician released are the one part of a care plan
          that is time-critical, so they are stated here rather than left behind
          a tap. */}
      {education?.warningSigns && education.warningSigns.length > 0 ? (
        <div className="rounded-(--radius-md) border border-(--danger-border) bg-(--danger-bg) p-3.5 text-(--danger-fg)">
          <p className="text-[14px] font-bold">See a doctor urgently if:</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {education.warningSigns.slice(0, 3).map((sign) => (
              <li key={sign} className="text-[14px] leading-[1.45]">
                • {sign}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={detail}
        className="self-start text-[13.5px] font-semibold text-(--text-muted) underline underline-offset-2 hover:text-(--text-heading)"
      >
        View full consultation record
      </Link>
    </section>
  );
}

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "—";
}
