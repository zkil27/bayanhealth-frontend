"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";
import { displayBookingStatus } from "@/lib/bookings";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";

import { dashboardLinkClass } from "./dashboardLink";

/**
 * "Examinations" — the patient's recent consultations, three across.
 *
 * The reference design fills these cards with diagnoses ("Hypertensive crisis ·
 * Ongoing treatment"). **No patient-facing read in this product carries a
 * diagnosis**: `final_icd` is excluded from `PATIENT_READABLE_OUTPUT_TYPES` and
 * there is no problem-list entity, so a condition printed here would have to be
 * invented. Each card therefore carries what the booking genuinely holds — the
 * service that was booked, when it was scheduled, and its real status.
 *
 * Driven by the bookings `PatientHome` has already read, so the row costs no
 * extra request. `cancelled` is excluded outright: a cancelled booking is not an
 * examination, and showing one would pad the row with care that never happened.
 *
 * The fixed teal left accent is decorative — it keys "this is a consultation
 * record", never a severity, which nothing here knows.
 */

const VISIBLE = 3;

export function CareActivityPanel({
  bookings,
  isLoading,
}: {
  bookings: BookingListItem[];
  isLoading?: boolean;
}) {
  const examinations = useMemo(() => {
    return bookings
      .filter((booking) => booking.status !== "cancelled")
      .slice()
      .sort(
        (a, b) =>
          dateMs(b.scheduledAt ?? b.createdAt) -
          dateMs(a.scheduledAt ?? a.createdAt),
      )
      .slice(0, VISIBLE);
  }, [bookings]);

  return (
    <section
      data-slot="patient-home-care-activity"
      aria-labelledby="examinations-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="examinations-heading"
          className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)"
        >
          Examinations
        </h2>
        <Link href="/patient/health" className={dashboardLinkClass()}>
          See all
          <ArrowRight />
        </Link>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-(--gray-bg)"
            />
          ))}
        </div>
      ) : examinations.length === 0 ? (
        <div
          data-slot="patient-home-care-activity-empty"
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl border border-dashed border-(--border-default) px-4 py-3.5"
        >
          <Stethoscope
            strokeWidth={1.5}
            aria-hidden
            className="size-4 shrink-0 text-(--text-subtle)"
          />
          <p className="min-w-0 flex-1 basis-56 text-[13px] leading-[1.4] text-(--text-muted)">
            No consultations on your record yet.
          </p>
          <Link href="/patient/booking" className={dashboardLinkClass()}>
            Book your first consultation
            <ArrowRight />
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {examinations.map((booking) => (
            <li key={booking.bookingId} className="min-w-0">
              <ExaminationCard booking={booking} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExaminationCard({ booking }: { booking: BookingListItem }) {
  const status = displayBookingStatus(booking.status, !!booking.declinedBy);

  return (
    <Link
      href={`/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`}
      className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <article className="flex h-full min-w-0 flex-col gap-1 rounded-2xl border border-(--border-subtle) border-l-4 border-l-(--action-primary) bg-(--surface-card) p-4 text-left shadow-sm transition-all hover:border-(--border-strong)">
        <time
          dateTime={booking.scheduledAt ?? booking.createdAt ?? undefined}
          className="text-xs text-(--text-subtle)"
        >
          {formatDate(booking.scheduledAt ?? booking.createdAt)}
        </time>
        <p className="text-sm font-bold text-(--text-heading) group-hover:underline">
          {serviceLabel(booking.serviceType)}
        </p>
        <span
          className={cn(
            "mt-2 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            STATUS_TONE[status.tone] ?? STATUS_TONE.neutral,
          )}
        >
          {status.label}
        </span>
      </article>
    </Link>
  );
}

/** `displayBookingStatus` tone → badge colours, on the brand safety semantics. */
const STATUS_TONE: Record<string, string> = {
  success: "bg-(--safe-bg) text-(--safe-fg)",
  info: "bg-(--status-pilot-bg) text-(--status-pilot-fg)",
  warning: "bg-(--status-soon-bg) text-(--status-soon-fg)",
  neutral: "bg-(--gray-bg) text-(--gray-fg)",
};

function dateMs(value?: string): number {
  if (!value) return -Infinity;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}

function formatDate(iso?: string): string {
  if (!iso) return "Undated";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Present the contract `serviceType` enum as a readable label. */
function serviceLabel(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return serviceType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
