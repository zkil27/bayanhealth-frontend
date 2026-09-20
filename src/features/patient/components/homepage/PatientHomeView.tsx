"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CircleCheck,
  Clock,
  HeartPulse,
  Stethoscope,
  Video,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { displayBookingStatus } from "@/lib/bookings";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, Chip, IconBadge } from "@/features/patient/components/redesign/primitives";

import {
  fetchPatientHome,
  type PatientHomeContent,
} from "../../lib/api/patientHome";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import {
  DOCTOR_RESOLVING_LABEL,
  assignedDoctorLabel,
} from "@/features/booking/lib/doctorLabels";

/**
 * Backend-composed patient home content (Slice 9, task 15.1).
 *
 * Content is composed from the existing `GET /v1/bookings` endpoint and rendered
 * through {@link AsyncView} so the four states this requirement needs are
 * standardised: loading (Requirement 14.3), data within 3s (14.1), a defined
 * empty state with visible text (14.4), and an error state with a visible
 * message + retry on failure or the 10s timeout (14.5).
 *
 * The visual layer follows the "hardog" patient redesign (Figma S1): each
 * consultation is a brand-token card with a status {@link Chip}. The data-slot
 * hooks and status labels the home tests assert on are unchanged.
 */
export function PatientHomeView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(() => fetchPatientHome(idToken ?? ""), [idToken]);

  return (
    <AsyncView<PatientHomeContent>
      fetcher={fetcher}
      deps={[idToken]}
      isEmpty={(content) => content.consultations.length === 0}
      empty={<PatientHomeEmpty />}
    >
      {(content) => (
        <div data-slot="patient-home-content" className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
              Your consultations
            </h3>
            <Link
              href="/patient/health"
              className="text-[15px] font-semibold text-(--text-heading) hover:text-(--text-link-hover)"
              aria-label="View all your consultations"
            >
              See all
            </Link>
          </div>
          <ul className="flex flex-col gap-2.5">
            {content.consultations.map((consultation) => (
              <ConsultationRow
                key={consultation.bookingId}
                consultation={consultation}
              />
            ))}
          </ul>
        </div>
      )}
    </AsyncView>
  );
}

/** `displayBookingStatus` tone → {@link Chip} tone. */
const CHIP_TONE = {
  success: "safe",
  info: "info",
  warning: "pending",
  neutral: "neutral",
} as const;

function ConsultationRow({ consultation }: { consultation: BookingListItem }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const status = displayBookingStatus(
    consultation.status,
    !!consultation.declinedBy,
  );

  // The booking record carries only `doctorId`, so the row resolves the
  // patient-safe doctor summary the same way the booking detail does. The home
  // shows at most three consultations, the reads are cached for ten minutes,
  // and a 404 (no such doctor, or not consultation-approved — the backend does
  // not distinguish them) resolves to `null` rather than throwing. No name is
  // invented to fill the gap; `assignedDoctorLabel` owns that copy.
  const doctorId = consultation.doctorId ?? "";
  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });
  const doctorLabel =
    doctorId && doctorQuery.isPending
      ? DOCTOR_RESOLVING_LABEL
      : assignedDoctorLabel(doctorQuery.data?.fullName, doctorId);
  const chipTone =
    CHIP_TONE[status.tone as keyof typeof CHIP_TONE] ?? "neutral";
  const StatusIcon =
    status.tone === "success"
      ? CircleCheck
      : status.tone === "warning"
        ? Clock
        : null;

  return (
    <li data-slot="patient-home-consultation">
      <Link
        href={`/patient/booking/getBooking/${consultation.bookingId}`}
        className="block rounded-(--radius-md) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <Card className="flex items-center gap-3 rounded-(--radius-md) p-3.5 hover:border-(--border-strong)">
          <IconBadge tone="teal">
            <Video />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-(--text-heading)">
              {formatServiceType(consultation.serviceType)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-(--text-muted)">
              <CalendarClock className="size-3.5 shrink-0" />
              {formatConsultationDateTime(consultation.scheduledAt)}
            </p>
            {/* The raw `bookingId` used to be printed here
                (`#bk_msabflpsxx2ifxzfbwy`). It is a database key: it means
                nothing to a patient, and it took the line where the one thing
                they actually want to know — who they are seeing — belongs. */}
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-(--text-subtle)">
              <Stethoscope className="size-3.5 shrink-0" />
              <span className="truncate">{doctorLabel}</span>
            </p>
          </div>
          <Chip
            data-slot="patient-home-consultation-status"
            tone={chipTone}
            icon={StatusIcon ? <StatusIcon /> : undefined}
          >
            {status.label}
          </Chip>
        </Card>
      </Link>
    </li>
  );
}

/**
 * Defined empty state with visible text (Requirement 14.4): shown when the
 * backend returns zero consultations rather than a blank home area.
 */
function PatientHomeEmpty() {
  return (
    <Empty data-slot="patient-home-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HeartPulse />
        </EmptyMedia>
        <EmptyTitle>Nothing on your home yet</EmptyTitle>
        <EmptyDescription>
          You don&apos;t have any consultations yet. Once you book a
          consultation it will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Present the contract `serviceType` enum as a readable label. */
function formatServiceType(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return serviceType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
