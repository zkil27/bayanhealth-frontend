"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Video, Zap } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import type { PatientHomeDerivation } from "@/lib/patient/patientHomeState";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { ON_DEMAND_WAIT_ESTIMATE } from "@/features/booking/constants/bookingConstants";
import { BrandLinkButton } from "@/features/patient/components/redesign/primitives";

import { PostConsultHero } from "./PostConsultHero";

/**
 * The single hero patient Home leads with, chosen by
 * {@link derivePatientHomeState}.
 *
 * Home used to render every block to everyone. This renders exactly one, so the
 * page can only ever be making one primary claim — which is the point of the
 * state machine: a patient whose doctor is waiting in a room should not be
 * looking at an invitation to book a consultation.
 */
export function PatientHomeHero({
  derivation,
}: {
  derivation: PatientHomeDerivation;
}) {
  switch (derivation.state) {
    case "LIVE_ROOM":
      return <LiveRoomHero booking={derivation.activeBooking!} />;
    case "POST_CONSULT":
      return <PostConsultHero booking={derivation.activeBooking!} />;
    /*
     * `SCHEDULED` renders the triage hero, not the appointment.
     *
     * The appointment has its own permanent slot beside this one
     * (`NextVisitCard`), so putting it here too rendered the identical card
     * twice — and, because both carried `data-slot="patient-home-hero"`, two
     * elements claimed to be the page's single primary message.
     *
     * Falling through to triage is also the better answer on its own: an
     * appointment next Tuesday is not a reason to withhold "consult now" from
     * someone who is unwell today, which is exactly what the hero-per-state
     * version did.
     */
    case "SCHEDULED":
    case "IDLE":
      return <IdleHero />;
  }
}

/**
 * `LIVE_ROOM` — the takeover.
 *
 * The strongest state on the page: a doctor is in a room, paid for, waiting.
 * The pulsing dot is the only motion on Home, and it is `motion-safe:` so a
 * patient who has asked their system for reduced motion gets a static
 * indicator rather than none.
 */
function LiveRoomHero({ booking }: { booking: BookingListItem }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const doctorId = booking.doctorId ?? "";

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const doctorName = doctorQuery.data?.fullName;

  return (
    <section
      data-slot="patient-home-hero"
      data-state="LIVE_ROOM"
      className="flex flex-col gap-4 rounded-2xl border-2 border-(--action-primary) bg-(--surface-accent-soft) p-4 shadow-(--shadow-card) md:flex-row md:items-center md:p-5"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--action-primary) text-(--action-primary-text)">
        <Video className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[12px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-2 rounded-full bg-(--action-primary) opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-(--action-primary)" />
          </span>
          Live now
        </p>
        <h2 className="font-display mt-1 text-[21px] leading-tight font-bold tracking-[-0.01em] text-(--text-heading) md:text-[23px]">
          Your consultation has started
        </h2>
        <p className="mt-1 text-[15px] leading-[1.45] text-(--text-body)">
          {doctorName
            ? `${doctorName} is waiting in the room.`
            : "Your doctor is waiting in the room."}
        </p>
      </div>

      <BrandLinkButton
        href={`/consultation/room/${encodeURIComponent(booking.bookingId)}`}
        size="lg"
        iconRight={<ArrowRight />}
        className="w-full shrink-0 md:w-auto"
      >
        Join call now
      </BrandLinkButton>
    </section>
  );
}

/**
 * `IDLE` — triage.
 *
 * The only state in which offering to book is the right thing to say. Both
 * paths are offered, because `/patient/booking` is a chooser between exactly these two
 * and Home should not make the patient go there to learn what the options are.
 */
function IdleHero() {
  return (
    <section
      data-slot="patient-home-hero"
      data-state="IDLE"
      className="rounded-2xl bg-(--surface-brand) p-5 text-(--text-on-brand) md:p-6"
    >
      <h2 className="font-display max-w-[18rem] text-[22px] leading-[1.12] tracking-[-0.01em] md:text-[26px]">
        Need a doctor today?
      </h2>
      <p className="mt-1.5 text-[16px] leading-[1.5] text-(--text-on-brand)/80">
        Consult a PRC-licensed doctor and get your care summary afterwards.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <BrandLinkButton
          href="/patient/booking/createBooking?mode=on-demand"
          size="sm"
          className="bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-btn-inset) hover:bg-(--action-primary-hover)"
          iconLeft={<Zap />}
        >
          Consult Now
        </BrandLinkButton>
        <BrandLinkButton
          href="/patient/booking/search"
          size="sm"
          variant="outline"
          className="border-transparent bg-(--surface-card) text-(--text-heading) shadow-(--shadow-btn-inset) hover:bg-(--surface-raised) hover:text-(--text-heading)"
          iconLeft={<CalendarClock />}
        >
          Book for Later
        </BrandLinkButton>
      </div>
      <p className="mt-3 text-[13px] text-(--text-on-brand)/70">
        Consult Now connects you with the first available doctor —{" "}
        {ON_DEMAND_WAIT_ESTIMATE.toLowerCase()}.
      </p>
    </section>
  );
}
