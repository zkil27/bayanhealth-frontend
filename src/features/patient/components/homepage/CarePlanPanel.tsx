"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { assignedDoctorLabel } from "@/features/booking/lib/doctorLabels";
import {
  fetchReleasedPatientEducation,
  groupSectionsByHeading,
} from "@/features/consultation/lib/api/patientEducation";

import { HomePanel } from "./HomePanel";
import { PendingLabOrders } from "./PendingLabOrders";

/**
 * Home's "Latest care plan" panel: the doctor's released guidance for the most
 * recent finished consultation, condensed to what a patient scans on the home
 * screen — the topics covered and the warning signs to act on.
 *
 * Everything here is a real read of `getReleasedPatientEducation`, the patient's
 * one CDS route. It returns nothing until a physician releases the article, so
 * the panel has three honest states: no finished consultation yet, a finished
 * consultation whose guidance is not released, and released guidance. No
 * diagnosis is shown — no patient-facing read carries one — and the warning
 * signs are the physician's own words from `payload.warningSigns`, not a
 * template.
 *
 * The full article (every section in full, both languages where bilingual) is on
 * the booking's detail page; this panel links there rather than reproducing it.
 */
export function CarePlanPanel({ booking }: { booking?: BookingListItem }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const consultationId = booking?.consultationId ?? "";
  const doctorId = booking?.doctorId ?? "";

  const educationQuery = useQuery({
    queryKey: ["released-patient-education", consultationId, idToken],
    queryFn: () => fetchReleasedPatientEducation(idToken ?? "", consultationId),
    enabled: !!idToken && consultationId.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: false,
  });

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const education = educationQuery.data ?? null;
  const doctorLabel = assignedDoctorLabel(doctorQuery.data?.fullName, doctorId);

  // No finished consultation to draw a plan from.
  const noConsult = !booking || !consultationId;
  // A finished consultation, but nothing released (yet, or ever).
  const awaitingRelease =
    !noConsult && !educationQuery.isPending && education === null;

  const headings = education
    ? groupSectionsByHeading(education.payload.sections)
        .map((section) => section.heading)
        .slice(0, 4)
    : [];

  return (
    <HomePanel
      slot="patient-home-care-plan"
      title="Latest care plan"
      framed
      subCard
      headingClassName="text-(--widget-care-fg)"
      className="border-(--widget-care-border)/40 bg-(--widget-care-bg)"
      isLoading={!noConsult && educationQuery.isPending}
    >
      {/* Compact single rows, matching `HomePanel`'s empty state — a new
          account shows several of these at once, and a column of centred
          dashed boxes reads as breakage rather than as an empty record. */}
      {noConsult ? (
        <div className="flex flex-col gap-2 rounded-(--radius-widget) border border-dashed border-(--widget-care-border)/45 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TriangleAlert
              strokeWidth={1.5}
              aria-hidden
              className="size-4 shrink-0 text-(--text-subtle)"
            />
            <p className="min-w-0 text-[13px] leading-[1.4] text-(--text-muted)">
              No care plan yet — this fills in after your first consultation.
            </p>
          </div>
          <Link
            href="/patient/health"
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-(--text-heading) transition-colors hover:text-(--text-link-hover)"
          >
            Health record
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : awaitingRelease ? (
        <div className="flex flex-col gap-2 rounded-(--radius-widget) border border-dashed border-(--widget-care-border)/45 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1.5">
          <p className="min-w-0 flex-1 text-[13px] leading-[1.4] text-(--text-muted)">
            Your doctor hasn&apos;t published guidance for your last visit yet.
          </p>
          <Link
            href={`/patient/booking/getBooking/${encodeURIComponent(booking!.bookingId)}`}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-(--text-heading) transition-colors hover:text-(--text-link-hover)"
          >
            Open consultation
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : education ? (
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-(--widget-care-fg)/80">
              From {doctorLabel}
              {" · "}
              {formatReleasedAt(education.releasedAt)}
            </p>
            <p className="mt-0.5 text-[14.5px] leading-[1.3] font-bold text-(--text-heading) break-words">
              {education.payload.title}
            </p>
          </div>

          {headings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {headings.map((heading) => (
                <li
                  key={heading}
                  className="flex items-start gap-1.5 text-[13px] leading-[1.4] text-(--text-body)"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-(--text-subtle)"
                  />
                  {heading}
                </li>
              ))}
            </ul>
          ) : null}

          {education.payload.warningSigns.length > 0 ? (
            <div className="rounded-(--radius-md) border border-(--danger-border)/40 bg-(--danger-bg) px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-(--danger-fg)">
                <TriangleAlert className="size-3.5 shrink-0" />
                See a doctor urgently if:
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {education.payload.warningSigns.slice(0, 3).map((sign) => (
                  <li
                    key={sign}
                    className="text-[12.5px] leading-[1.4] text-(--danger-fg)"
                  >
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link
            href={`/patient/booking/getBooking/${encodeURIComponent(booking!.bookingId)}`}
            className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-(--widget-care-fg) hover:underline"
          >
            Read full care plan
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}

      <PendingLabOrders />
    </HomePanel>
  );
}

function formatReleasedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
