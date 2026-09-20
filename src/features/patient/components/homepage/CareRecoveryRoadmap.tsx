"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { fetchPatientIntake } from "@/features/booking/lib/api/patientIntake";
import { fetchReleasedPatientEducation } from "@/features/consultation/lib/api/patientEducation";
import { shouldPollReleasedArtifacts } from "@/features/consultation/lib/releasedArtifacts";
import { fetchMyFollowUps } from "@/features/patient/lib/api/patientFollowUps";
import { fetchMyMedications } from "@/features/patient/lib/api/patientMedications";
import { buildJourney } from "@/lib/patient/careJourney";

import { EcgJourneyChart } from "./journey/EcgJourneyChart";
import { JourneyCtaBar } from "./journey/JourneyCtaBar";
import { MobileJourneyStepper } from "./journey/MobileJourneyStepper";

/**
 * Care Recovery Roadmap: an ECG-style journey tracker.
 *
 * This component only reads. It turns the queries into one
 * {@link buildJourney} view model and hands that same object to the desktop
 * chart + CTA bar and to the mobile stepper. The two layouts are both rendered
 * and switched with CSS at `md`, so there is no viewport hook to disagree with
 * the server render, and both trees always see identical data.
 */
export function CareRecoveryRoadmap({
  booking,
  isLoading,
}: {
  booking?: BookingListItem;
  isLoading?: boolean;
}) {
  const idToken = useAuthStore((state) => state.session?.idToken ?? null);
  const bookingId = booking?.bookingId ?? "";
  const consultationId = booking?.consultationId ?? "";
  const doctorId = booking?.doctorId ?? "";
  const pollArtifacts = shouldPollReleasedArtifacts(booking?.status);

  const intakeQuery = useQuery({
    queryKey: ["patient-intake", bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", bookingId),
    enabled: !!idToken && bookingId.length > 0,
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
  });

  const educationQuery = useQuery({
    queryKey: ["released-patient-education", consultationId, idToken],
    queryFn: () => fetchReleasedPatientEducation(idToken ?? "", consultationId),
    enabled: !!idToken && consultationId.length > 0,
    staleTime: 300_000,
    refetchInterval: pollArtifacts ? 15_000 : false,
    retry: false,
    throwOnError: false,
  });

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 600_000,
    retry: false,
    throwOnError: false,
  });

  const followUpQuery = useQuery({
    queryKey: ["patient-follow-ups", idToken],
    queryFn: () => fetchMyFollowUps(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 300_000,
    retry: false,
    throwOnError: false,
  });

  const medicationsQuery = useQuery({
    queryKey: ["patient-medications", idToken],
    queryFn: () => fetchMyMedications(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 120_000,
    refetchInterval: pollArtifacts ? 15_000 : false,
    retry: false,
    throwOnError: false,
  });

  const medications = useMemo(
    () =>
      // Patient-scoped read: keep only this visit's lines.
      consultationId
        ? (medicationsQuery.data ?? []).filter((line) => line.consultationId === consultationId)
        : [],
    [consultationId, medicationsQuery.data],
  );
  const followUp = consultationId
    ? (followUpQuery.data ?? []).find((row) => row.consultationId === consultationId)
    : undefined;

  // Lab-result work has its own upload/review surface; this card draws the
  // consult journey.
  const vm = useMemo(
    () =>
      buildJourney({
        booking,
        intake: intakeQuery.data,
        education: educationQuery.data,
        medication: medications[0],
        medications,
        followUp,
        labOrder: null,
        doctor: doctorQuery.data,
      }),
    [booking, intakeQuery.data, educationQuery.data, medications, followUp, doctorQuery.data],
  );

  const pending = !!booking && (isLoading || (bookingId.length > 0 && intakeQuery.isPending));

  if (pending) {
    return (
      <section
        data-slot="patient-home-care-plan-card"
        aria-labelledby="care-roadmap-heading"
        className="flex flex-col gap-2.5"
      >
        <h3 id="care-roadmap-heading" className="text-sm font-bold text-(--text-heading)">
          Care Recovery Roadmap
        </h3>
        <div
          role="status"
          aria-label="Loading your care roadmap"
          className="h-28 animate-pulse rounded-2xl bg-(--surface-warm)"
        />
      </section>
    );
  }

  const warningSigns = educationQuery.data?.payload.warningSigns.slice(0, 3) ?? [];

  return (
    <section
      data-slot="patient-home-care-plan-card"
      data-phase={vm.phase}
      aria-labelledby="care-roadmap-heading"
      className="flex flex-col gap-3"
    >
      <h3 id="care-roadmap-heading" className="text-[15px] font-bold text-(--text-heading)">
        Care Recovery Roadmap
      </h3>

      <div data-slot="care-roadmap-desktop" className="hidden flex-col gap-3 md:flex">
        <EcgJourneyChart vm={vm} />
        <JourneyCtaBar vm={vm} />
      </div>
      <div data-slot="care-roadmap-mobile" className="md:hidden">
        <MobileJourneyStepper vm={vm} />
      </div>

      {warningSigns.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-(--danger-bg) px-3.5 py-2.5 text-[13px] leading-snug text-(--danger-fg)">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-(--danger-border)" />
          <p>
            <span className="font-bold">Seek urgent care if:</span> {warningSigns.join("; ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
