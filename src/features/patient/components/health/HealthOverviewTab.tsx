"use client";

import { useQuery } from "@tanstack/react-query";

import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { useAuthStore, useUserId } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import {
  Card,
  Chip,
  MetricStat,
  SectionHeading,
  SeeAllLink,
} from "@/features/patient/components/redesign/primitives";
import { fetchBookingPage } from "@/features/booking/lib/api/bookingList";
import {
  fetchMyMedications,
  type PatientMedicationLine,
} from "@/features/patient/lib/api/patientMedications";
import {
  fetchMyFollowUps,
  type FollowUpRecommendation,
} from "@/features/patient/lib/api/patientFollowUps";
import { CarePlanPanel } from "@/features/patient/components/homepage/CarePlanPanel";
import { DailyTipCard } from "@/features/patient/components/homepage/DailyTipCard";
import { completedForDashboard } from "@/lib/patient/patientHomeState";
import { formatConsultationDateTime } from "@/lib/consultation-time";

/** Bookings fetched per page — Overview only ever needs the first one. */
const PAGE_SIZE = 20;

/**
 * The Health page's identity: not a duplicate of Home's "what's next", but the
 * patient's own record read at a glance — who they are (blood type, height,
 * weight, allergies), what they're taking, and when they're due back. Every
 * value here maps to a real, already-contracted endpoint (ADR-20260806-02);
 * an unset field renders "Not set" or is simply omitted, never guessed.
 */
export function HealthOverviewTab() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const userId = useUserId();

  // Own cache key, distinct from the Records tab's `useInfiniteQuery` below:
  // React Query stores an infinite query's data as `{ pages, pageParams }`, so
  // a plain `useQuery` sharing that key would seed the cache with a bare
  // `BookingPage` instead — the first tab mounted "wins" the key, and whichever
  // hook reads it second crashes reading `.pages.length` off the wrong shape.
  const bookingsQuery = useQuery({
    queryKey: ["patient-health-bookings-overview", idToken],
    queryFn: () => fetchBookingPage(idToken ?? "", undefined, PAGE_SIZE),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });
  const latestCompleted = completedForDashboard(bookingsQuery.data?.bookings ?? [])[0];

  const { profile, isLoading: profileLoading } = useProfile(userId);

  // Shared with `MedicationsPanel` on Home — same key, same plain `useQuery`,
  // so no collision and no duplicate request when both screens are warm.
  const medicationsQuery = useQuery({
    queryKey: ["patient-medications", idToken],
    queryFn: () => fetchMyMedications(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const followUpsQuery = useQuery({
    queryKey: ["patient-follow-ups", idToken],
    queryFn: () => fetchMyFollowUps(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  return (
    <div
      data-slot="patient-health-overview"
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <div className="flex flex-col gap-4">
        <HealthIdentityCard profile={profile} isLoading={profileLoading} />
        <NextFollowUpCard followUps={followUpsQuery.data} />
        <CarePlanPanel booking={latestCompleted} />
      </div>
      <div className="flex flex-col gap-4">
        <MedicinesSummaryCard medications={medicationsQuery.data} isLoading={medicationsQuery.isPending} />
        <DailyTipCard />
      </div>
    </div>
  );
}

/** Strip any unit the patient typed, so the strip renders one consistently. */
function numeric(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const match = v.match(/[\d.]+/);
  return match ? match[0] : v;
}

/** Whole years between `dateOfBirth` and today, or undefined if unset/unparseable. */
function ageFromDateOfBirth(dateOfBirth: string | undefined): number | undefined {
  const v = dateOfBirth?.trim();
  if (!v) return undefined;
  const dob = new Date(v);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthsShort = now.getMonth() - dob.getMonth();
  if (monthsShort < 0 || (monthsShort === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

function HealthIdentityCard({
  profile,
  isLoading,
}: {
  profile?: { dateOfBirth: string; bloodType: string; height: string; weight: string; allergens: string[]; otherAllergens: string };
  isLoading: boolean;
}) {
  const age = ageFromDateOfBirth(profile?.dateOfBirth);
  const height = numeric(profile?.height);
  const weight = numeric(profile?.weight);
  const bloodType = profile?.bloodType?.trim() || undefined;

  // Per `useProfile`'s own rule: an empty list is "not answered yet", and
  // `["None"]` is the patient's own assertion of no known allergies — the two
  // must never read the same way.
  const rawAllergens = profile?.allergens ?? [];
  const hasNoKnownAllergies = rawAllergens.length === 1 && rawAllergens[0] === NONE_OPTION;
  const namedAllergens = hasNoKnownAllergies
    ? []
    : [
        ...rawAllergens.filter((a) => a !== NONE_OPTION),
        ...(profile?.otherAllergens?.trim() ? [profile.otherAllergens.trim()] : []),
      ];

  return (
    <Card data-slot="patient-health-identity" className="p-4 sm:p-5">
      <SectionHeading tone="accent">Health identity</SectionHeading>
      {isLoading ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-(--radius-sm) bg-(--gray-bg)" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricStat label="Age" value={age} unit={age !== undefined ? "yrs" : undefined} />
            <MetricStat label="Blood type" value={bloodType} />
            <MetricStat label="Height" value={height} unit={height !== undefined ? "cm" : undefined} />
            <MetricStat label="Weight" value={weight} unit={weight !== undefined ? "kg" : undefined} />
          </div>
          {hasNoKnownAllergies ? (
            <p className="mt-3 text-[13px] font-medium text-(--status-available-fg)">
              No known allergies
            </p>
          ) : namedAllergens.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {namedAllergens.map((allergen) => (
                <Chip key={allergen} tone="neutral">
                  {allergen}
                </Chip>
              ))}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

function NextFollowUpCard({ followUps }: { followUps?: FollowUpRecommendation[] }) {
  // The list is already soonest-first and already excludes long-overdue
  // prompts (`fetchMyFollowUps`'s own contract) — nothing to sort or filter.
  const next = followUps?.[0];
  // Nothing to say when there's no follow-up due; a dashboard card stating
  // "no follow-up" invites worry over a state that is simply the default.
  if (!next) return null;

  return (
    <Card data-slot="patient-health-next-followup" className="p-4 sm:p-5">
      <SectionHeading tone="accent">Next follow-up</SectionHeading>
      <div className="mt-3 flex items-start gap-3 rounded-(--radius-widget) border border-(--status-soon-bg) bg-(--status-soon-bg)/40 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-(--text-heading)">
            {formatTargetDate(next.targetDate)}
          </p>
          {next.reason ? (
            <p className="mt-0.5 text-[13px] leading-[1.4] text-(--text-muted)">{next.reason}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function formatTargetDate(targetDate: string): string {
  const date = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return targetDate;
  return `Come back by ${date.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

function MedicinesSummaryCard({
  medications,
  isLoading,
}: {
  medications?: PatientMedicationLine[];
  isLoading: boolean;
}) {
  // Newest release first — the same "what was prescribed, and when" reading
  // the Medicines tab uses; there is no "active" flag in the source
  // (`patientMedications.ts`'s own contract), so this never claims currency.
  const top = [...(medications ?? [])]
    .sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime())
    .slice(0, 3);

  return (
    <Card data-slot="patient-health-medicines-summary" className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading tone="accent" as="h3">
          Prescribed
        </SectionHeading>
        <SeeAllLink href="/patient/health?tab=medicines" label="All medicines" />
      </div>

      {isLoading ? (
        <div className="mt-3 flex flex-col gap-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-(--radius-widget) bg-(--gray-bg)" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="mt-3 text-[13px] text-(--text-muted)">
          Nothing on record yet — this fills in once a doctor prescribes something.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {top.map((line, index) => (
            <li
              key={`${line.consultationId}-${line.genericName}-${index}`}
              className="rounded-(--radius-widget) border border-(--border-subtle) bg-(--surface-card) px-3 py-2.5"
            >
              <p className="truncate text-[13.5px] font-bold text-(--text-heading)">
                {line.genericName}
                {line.dose ? ` — ${line.dose}` : ""}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-(--text-muted)">
                {[line.frequency, formatConsultationDateTime(line.releasedAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
