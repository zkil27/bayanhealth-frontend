"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarPlus,
  CircleCheck,
  Clock3,
  CreditCard,
  FileText,
  Loader,
  Stethoscope,
  TriangleAlert,
  Video,
} from "lucide-react";

import { formatConsultationDateTime } from "@/lib/consultation-time";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import {
  buildConsultationIcs,
  icsFilename,
} from "@/lib/patient/calendarInvite";
import type { ScheduledReadiness } from "@/lib/patient/patientHomeState";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { fetchPatientIntake } from "@/features/booking/lib/api/patientIntake";
import {
  Avatar,
  BrandLinkButton,
  IconBadge,
} from "@/features/patient/components/redesign/primitives";

import { DeviceCheckButton } from "./DeviceCheckButton";

/**
 * The next-visit card: one upcoming appointment, and what is still outstanding
 * on it.
 *
 * Rendered by {@link NextVisitCard} in Home's tier-1 right column. It was
 * briefly the `SCHEDULED` *hero*, which was wrong twice over: it suppressed the
 * booking CTAs for anyone with an appointment days away, and once the
 * next-visit column existed the same card rendered in both places at once.
 *
 * The readiness checklist is the honest version of the spec's "intake readiness"
 * row. Each line reflects a real read:
 *
 * - **Payment** — from the booking status. `pending_payment` means the hold has
 *   not been placed and the booking is *not* confirmed, which is the one item
 *   here that can silently cost the patient their appointment.
 * - **Intake** — from `GET /v1/bookings/{id}/intake`, the same read the booking
 *   detail gates its wizard on.
 * - **Doctor** — from the booking's own `doctorId`.
 *
 * The spec also asked for an "upload prior lab tests/photos" item. That is not
 * offered: the only upload path is `/v1/consultations/{consultationId}/media/
 * upload-url`, and a booking has no `consultationId` until a session starts — so
 * before the consultation there is nowhere for the file to go.
 */
export function ScheduledHero({
  booking,
  readiness,
}: {
  booking: BookingListItem;
  readiness: ScheduledReadiness;
}) {
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

  const intakeQuery = useQuery({
    queryKey: ["booking-intake", booking.bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", booking.bookingId),
    enabled: !!idToken,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const doctor = doctorQuery.data;
  const scheduledAt = booking.scheduledAt
    ? new Date(booking.scheduledAt)
    : null;
  const validStart =
    scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null;

  const intakeSubmitted =
    intakeQuery.data?.status === "submitted" ||
    intakeQuery.data?.status === "acknowledged";

  return (
    <section
      data-slot="next-visit"
      className="flex flex-col gap-4 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) md:p-5"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
            Upcoming care
          </p>
          {validStart ? <Countdown start={validStart} pill /> : null}
        </div>
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
              {doctor?.fullName ??
                (doctorId ? "Your assigned doctor" : "Doctor being assigned")}
            </p>
            <p className="mt-0.5 truncate text-[14px] text-(--text-muted)">
              {doctor?.specialty ?? "Teleconsultation"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-(--radius-md) bg-(--surface-sunken) p-3.5">
        <p className="flex items-center gap-2 text-[15px] font-bold text-(--text-heading)">
          <Clock3 className="size-4 shrink-0 text-(--status-available-fg)" />
          {formatConsultationDateTime(booking.scheduledAt)}
        </p>
      </div>

      <CareMilestoneTrail
        intakeSubmitted={intakeSubmitted}
        consultReady={
          intakeSubmitted && readiness.doctorAssigned && !readiness.needsPayment
        }
      />

      <Readiness
        readiness={readiness}
        intakeLoading={intakeQuery.isPending}
        intakeSubmitted={intakeSubmitted}
        bookingId={booking.bookingId}
      />

      {readiness.needsPayment ? null : (
        <p
          data-slot="waiting-room-status"
          className="flex items-center gap-2 rounded-(--radius-md) border border-dashed border-(--border-default) px-3 py-2 text-[13px] text-(--text-muted)"
        >
          <Video className="size-3.5 shrink-0 text-(--text-subtle)" />
          The waiting room opens when your doctor starts the call — you&apos;ll
          get a “Join” button here.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {readiness.needsPayment ? (
          <BrandLinkButton
            href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
            size="sm"
            iconLeft={<CreditCard />}
            className="w-full sm:w-auto"
          >
            Complete payment
          </BrandLinkButton>
        ) : (
          <AddToCalendarButton booking={booking} doctorName={doctor?.fullName} />
        )}
        <DeviceCheckButton className="sm:flex-1" />
      </div>

      <Link
        href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
        className="self-start text-[13.5px] font-semibold text-(--text-muted) underline underline-offset-2 hover:text-(--text-heading)"
      >
        Reschedule or cancel
      </Link>
    </section>
  );
}

/** "Starts in 45 minutes" for a given start time. Pure, so it is testable. */
export function countdownLabel(start: Date, now: number): string {
  const diffMs = start.getTime() - now;
  if (diffMs <= 0) return "Starting now";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60)
    return `Starts in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Starts in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `In ${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * Live relative time to the appointment.
 *
 * The clock is read in an effect and held in state rather than during render:
 * `Date.now()` inside a render or a `useMemo` is impure, and a countdown that
 * never recomputes is the more visible bug — "Starts in 45 minutes" would still
 * say 45 an hour later. Ticks once a minute, which is the resolution the copy
 * actually shows.
 */
function Countdown({ start, pill }: { start: Date; pill?: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // The mount write is the point: it is what moves the clock from "unknown on
    // the server" to a real value on the client, and it is why this renders
    // nothing on the first pass instead of a time that shifts under hydration.
    // Same exemption as the theme mount guard in `PatientProfileSettings`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Nothing on the first render: the server has no clock worth showing, and a
  // value that changes on hydration is a mismatch.
  if (now === null) return null;

  if (pill) {
    return (
      <span
        data-slot="countdown"
        className="shrink-0 rounded-(--radius-pill) bg-(--surface-accent-soft) px-2 py-0.5 text-[12px] font-bold text-(--status-available-fg)"
      >
        {countdownLabel(start, now)}
      </span>
    );
  }

  return (
    <p data-slot="countdown" className="text-[13.5px] text-(--text-muted)">
      {countdownLabel(start, now)}
    </p>
  );
}

/**
 * The three stages of one consultation, as a horizontal trail: intake in,
 * consult ready, care documents released. Every node is derived from a real
 * signal — the submitted intake read, the readiness the caller already computed,
 * and the fact that release only ever happens after the call — so nothing here
 * is a mocked step. The third node is always "upcoming" on this card: a released
 * prescription or certificate is a post-consult artifact, and `POST_CONSULT`
 * (not `SCHEDULED`) is the state that renders it.
 */
function CareMilestoneTrail({
  intakeSubmitted,
  consultReady,
}: {
  intakeSubmitted: boolean;
  consultReady: boolean;
}) {
  const nodes: Array<{
    label: string;
    icon: typeof CircleCheck;
    state: "done" | "active" | "upcoming";
  }> = [
    {
      label: "Intake received",
      icon: CircleCheck,
      state: intakeSubmitted ? "done" : "active",
    },
    {
      label: "Consult ready",
      icon: Video,
      state: consultReady ? "active" : "upcoming",
    },
    {
      label: "Documents released",
      icon: FileText,
      state: "upcoming",
    },
  ];

  return (
    <ol
      data-slot="care-milestone-trail"
      className="flex items-start gap-1"
      aria-label="Consultation progress"
    >
      {nodes.map((node, i) => {
        const Icon = node.icon;
        return (
          <li key={node.label} className="flex flex-1 items-start gap-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-(--radius-pill) [&_svg]:size-3.5",
                  node.state === "done" &&
                    "bg-(--surface-accent-soft) text-(--status-available-fg)",
                  node.state === "active" &&
                    "border-2 border-(--action-primary) text-(--action-primary)",
                  node.state === "upcoming" &&
                    "border border-(--border-default) text-(--text-subtle)",
                )}
              >
                <Icon aria-hidden />
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  node.state === "upcoming"
                    ? "text-(--text-subtle)"
                    : "font-semibold text-(--text-body)",
                )}
              >
                {node.label}
              </span>
            </div>
            {i < nodes.length - 1 ? (
              <span
                aria-hidden
                className="mt-3 h-px flex-1 bg-(--border-default)"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Readiness({
  readiness,
  intakeLoading,
  intakeSubmitted,
  bookingId,
}: {
  readiness: ScheduledReadiness;
  intakeLoading: boolean;
  intakeSubmitted: boolean;
  bookingId: string;
}) {
  const detail = `/patient/booking/getBooking/${encodeURIComponent(bookingId)}`;

  return (
    <ul data-slot="scheduled-readiness" className="flex flex-col gap-1.5">
      {readiness.needsPayment ? (
        <ReadinessRow
          tone="warn"
          label="Payment not yet held — this booking is not confirmed until it is"
          href={detail}
        />
      ) : readiness.paymentUnderReview ? (
        <ReadinessRow tone="pending" label="Payment is being checked" />
      ) : (
        <ReadinessRow tone="ok" label="Payment held" />
      )}

      {intakeLoading ? (
        <ReadinessRow tone="pending" label="Checking your health form…" />
      ) : intakeSubmitted ? (
        <ReadinessRow tone="ok" label="Health form submitted" />
      ) : (
        <ReadinessRow
          tone="warn"
          label="Health form not finished — your doctor reads this before the call"
          href={detail}
        />
      )}

      <ReadinessRow
        tone={readiness.doctorAssigned ? "ok" : "pending"}
        label={
          readiness.doctorAssigned
            ? "Doctor assigned"
            : "Waiting for a doctor to accept"
        }
      />
    </ul>
  );
}

function ReadinessRow({
  tone,
  label,
  href,
}: {
  tone: "ok" | "warn" | "pending";
  label: string;
  href?: string;
}) {
  const Icon =
    tone === "ok" ? CircleCheck : tone === "warn" ? TriangleAlert : Loader;
  const body = (
    <span
      className={cn(
        "flex items-start gap-2 text-[14px] leading-[1.45]",
        tone === "ok"
          ? "text-(--status-available-fg)"
          : tone === "warn"
            ? "text-(--danger-fg)"
            : "text-(--text-muted)",
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span className={href ? "underline underline-offset-2" : undefined}>
        {label}
      </span>
    </span>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

/**
 * Download an `.ics` for the appointment.
 *
 * A blob download rather than a link to a provider: the platform has no calendar
 * integration, and an `.ics` imports into every calendar app without sending the
 * patient's appointment to a third party. Disabled when the booking carries no
 * usable time — an on-demand request has none, and an invite for an unknown
 * moment is worse than no invite.
 */
function AddToCalendarButton({
  booking,
  doctorName,
}: {
  booking: BookingListItem;
  doctorName?: string;
}) {
  const start = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const usable = start && !Number.isNaN(start.getTime());

  const onClick = () => {
    if (!usable) return;
    const ics = buildConsultationIcs({
      start,
      doctorName,
      bookingId: booking.bookingId,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/booking/getBooking/${encodeURIComponent(booking.bookingId)}`
          : undefined,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = icsFilename(booking.bookingId);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoked on the next tick so the download has claimed the blob first.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (!usable) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="add-to-calendar"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-(--radius-pill) bg-(--action-primary) px-4 text-[14.5px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) sm:w-auto"
    >
      <CalendarPlus className="size-4" />
      Add to calendar
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "—";
}
