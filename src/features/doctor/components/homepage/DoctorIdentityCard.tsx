"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { initialsOf } from "@/lib/utils";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";

/**
 * The doctor's identity card — top of the dashboard's left rail.
 *
 * Laid out to the patient home's `ProfileCard` so both sides of the product
 * open on the same shape: a circular avatar that juts past the card's top
 * edge, a centred "Kumusta," greeting over the name, specialty and today's
 * date. Purely identity — the on-demand duty switch lives in its own
 * {@link DoctorDutyCard} below it, and the shift numbers in the sheet's
 * {@link DoctorShiftLedger}, so this card is not also carrying a second copy
 * of either.
 *
 * Name and specialty come from the one real profile read (`useMyDoctorProfile`
 * over `GET /v1/doctors/me/kyc`). Nothing is derived from the email.
 */
export function DoctorIdentityCard() {
  const { profile, isLoading } = useMyDoctorProfile();

  const name = profile?.fullName?.trim() || "Your profile";
  const specialty = profile?.specialty?.trim();

  // Read after mount, never during render: `new Date()` in render lets a
  // server/client timezone difference produce a hydration mismatch.
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const date = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayLabel([weekday, date].join(" · "));
  }, []);

  return (
    <section
      data-slot="doctor-identity-card"
      aria-labelledby="doctor-identity-heading"
      className="relative mt-6 flex flex-col items-center gap-1 rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) p-4 pt-12 text-center shadow-(--shadow-float)"
    >
      <Link
        href="/doctor/profile"
        aria-label="Open your profile"
        className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-(--surface-brand) text-base font-bold text-(--text-on-brand) shadow-md ring-4 ring-(--surface-page)">
          {initialsOf(name, "Dr")}
        </span>
      </Link>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] font-bold tracking-wider text-(--status-available-fg) uppercase">
          Kumusta,
        </span>
        <h2
          id="doctor-identity-heading"
          className="text-lg leading-tight font-bold text-(--text-heading)"
        >
          {name}
        </h2>
        {isLoading ? (
          <span className="mt-1 block h-3 w-24 animate-pulse rounded-full bg-(--surface-warm)" />
        ) : specialty ? (
          <span className="text-[13px] text-(--text-muted)">{specialty}</span>
        ) : null}
        <span className="text-[12px] font-medium text-(--text-subtle)">
          {todayLabel ?? " "}
        </span>
      </div>

      <Link
        href="/doctor/profile"
        className="group mt-1 inline-flex w-fit shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-(--status-available-fg) transition-colors hover:text-(--text-link-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:transition-transform group-hover:[&_svg]:translate-x-0.5"
      >
        View profile
        <ArrowRight />
      </Link>
    </section>
  );
}
