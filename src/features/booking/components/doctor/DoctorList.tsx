"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchDoctor } from "../../types/searchDoctors.types";

interface DoctorListProps {
  recommendedDoctors?: SearchDoctor[];
  doctors?: SearchDoctor[];
  maxDisplay?: number;
  inBookingPage?: boolean;
}

/**
 * Patient-facing doctor cards.
 *
 * Every card previously rendered ten fabricated fields, all of which fired on
 * every render because `mapDoctorToSearchDoctor` never populated them: a
 * "Featured" badge (`doctor.isFeatured ?? true`), specialty `"Cardiologist"`,
 * `"St. Luke's Medical Center · BGC"`, a bare `~ 30 km away`,
 * `"English · Filipino"`, `"Adult cardiology, heart failure, preventive care"`,
 * four-and-a-half hardcoded stars, rating `"4.9"`, `312` reviews, and `14 yrs`
 * experience.
 *
 * The data layer states outright that the platform holds none of those
 * (`lib/api/doctors.ts`: "no email, licence number, phone number, hospital,
 * distance, or rating — the platform does not hold those, so the UI must not
 * invent them"). Fabricated peer credentials are the single most damaging kind of
 * placeholder on a clinical marketplace, so the card now shows only what
 * `DoctorPublicSummary` and the schedules endpoint actually return: name,
 * specialty, and real availability.
 *
 * The "Visit Page" link also pointed at `doctor.id` — the numeric hash used for
 * React keys — instead of `doctor.doctorId`, so it never resolved to a real
 * doctor page.
 */
export function DoctorList({
  recommendedDoctors = [],
  doctors = [],
  inBookingPage = false,
}: DoctorListProps) {
  const allDoctors = [...recommendedDoctors, ...doctors];

  return (
    <div className="flex w-full flex-col gap-3 px-4">
      {inBookingPage && (
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
            Doctors for you
          </h2>
          <Link
            href="/patient/booking/search"
            className="flex items-center gap-1 text-[13.5px] font-semibold text-(--text-heading) hover:text-(--text-link-hover)"
          >
            See all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {allDoctors.map((doctor) => {
          if (!doctor.doctorId || !doctor.name) return null;
          const slots = doctor.scheduleSpace ?? [];
          const hasAvailability = slots.length > 0;

          return (
            <div
              key={doctor.doctorId}
              data-slot="doctor-card"
              className="flex flex-col gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)"
            >
              <div className="flex gap-3">
                <Avatar className="size-12 shrink-0">
                  <AvatarFallback>{initialsOf(doctor.name)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="truncate text-[16px] leading-tight font-bold text-(--text-heading)">
                    {doctor.name}
                  </h3>
                  {doctor.specialty ? (
                    <p className="flex items-center gap-1 text-[13.5px] font-medium text-(--text-muted)">
                      <Stethoscope className="size-3.5 shrink-0" />
                      {doctor.specialty}
                    </p>
                  ) : (
                    <p className="text-[13.5px] text-(--text-subtle) italic">
                      Specialty not listed
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-(--text-body)">
                  <CalendarClock className="size-3.5 shrink-0 text-(--text-muted)" />
                  <span>
                    {doctor.nextAvailable
                      ? `Next available: ${doctor.nextAvailable}`
                      : "No published availability"}
                  </span>
                </div>
                {hasAvailability ? (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.slice(0, 4).map((slot) => (
                      <span
                        key={slot}
                        className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-2 py-0.5 text-[12px] font-semibold text-(--status-available-fg)"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/*
                One action, labelled by what the patient will actually find
                behind it: the doctor's page is a slot picker, so a doctor with
                no published slots must not be offered as "Book appointment".
                The old label was "Visit Page", and it linked to `doctor.id` —
                the numeric hash used for React keys — so it never resolved.
              */}
              <Link
                href={`/patient/booking/doctor/${encodeURIComponent(doctor.doctorId)}`}
                className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--action-primary) px-4 text-[15px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              >
                {hasAvailability ? "Book appointment" : "View available slots"}
                <ArrowRight className="size-4" />
              </Link>

              {/*
                A doctor with no published slots is a dead end on this path —
                offer the on-demand route rather than leaving the patient to
                bounce between profile pages hunting for a calendar.
              */}
              {!hasAvailability ? (
                <Link
                  href="/patient/booking/createBooking?mode=on-demand"
                  className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-(--status-available-fg) hover:text-(--text-link-hover)"
                >
                  Consult now on-demand instead
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Initials from a real registered name; never a fixed "RX" fallback. */
function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "—";
}
