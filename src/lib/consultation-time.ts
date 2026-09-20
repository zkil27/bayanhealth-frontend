/**
 * One way to display a consultation time.
 *
 * Before this there were four, and they disagreed. `PatientBookingDetail` used a
 * bare `toLocaleString()`, `PatientBookingList` and `PatientHomeView` each had
 * their own private `formatScheduledAt`, and `DoctorHistory` called
 * `toLocaleTimeString([], …)`. Every one rendered in the **viewer's** timezone and
 * none said which timezone it was.
 *
 * That is not a cosmetic problem. A slot is authored as doctor-local wall clock —
 * `date` + `startTime` with no zone attached — and the platform resolves those as
 * Asia/Manila (`PLATFORM_UTC_OFFSET_MINUTES` in `backend/src/lib/schedule.ts`,
 * ADR-20260807-01). So a doctor publishes "09:00", the booking stores the matching
 * instant, and then a patient on a device set to another timezone was shown a
 * different clock time for the same appointment — while the doctor's own schedule
 * screen still said 09:00. Same booking, two answers, and nothing on screen to
 * explain the gap.
 *
 * Everything here therefore renders in the platform timezone and says so. The
 * displayed time matches the slot the doctor published, on every device, and the
 * label removes the "is this my time or theirs?" question that a bare local time
 * silently poses.
 *
 * `Asia/Manila` is used as an IANA zone rather than the backend's fixed +08:00
 * offset. They agree exactly today — the Philippines has observed no DST since
 * 1978 — but the zone is the honest thing to hand a formatter, and it stays correct
 * if that ever changes.
 */

/** IANA zone every consultation time is displayed in. */
export const PLATFORM_TIME_ZONE = "Asia/Manila";

/**
 * Short label shown beside a time.
 *
 * Spelled out rather than derived from `Intl`, which renders this zone as "GMT+8"
 * — accurate but less recognisable to the people actually using the product.
 */
export const PLATFORM_TIME_ZONE_LABEL = "PHT";

/** Shown when there is no time yet, rather than an empty gap or "Invalid Date". */
export const NO_TIME_LABEL = "Time pending";

function toValidDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function format(iso: string | undefined | null, options: Intl.DateTimeFormatOptions): string {
  const date = toValidDate(iso);
  if (!date) return NO_TIME_LABEL;
  return new Intl.DateTimeFormat("en-PH", {
    ...options,
    timeZone: PLATFORM_TIME_ZONE,
  }).format(date);
}

/**
 * Date and time with the zone label — the default for anywhere a patient or doctor
 * is deciding when to attend.
 *
 * e.g. `10 Aug 2026, 9:00 AM PHT`
 */
export function formatConsultationDateTime(iso: string | undefined | null): string {
  const rendered = format(iso, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return rendered === NO_TIME_LABEL
    ? rendered
    : `${rendered} ${PLATFORM_TIME_ZONE_LABEL}`;
}

/** Weekday and date, no time. e.g. `Mon, 10 Aug 2026` */
export function formatConsultationDate(iso: string | undefined | null): string {
  return format(iso, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Time only, with the zone label. e.g. `9:00 AM PHT`
 *
 * Used where the date is already established by surrounding context, such as a
 * day-grouped list.
 */
export function formatConsultationTime(iso: string | undefined | null): string {
  const rendered = format(iso, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return rendered === NO_TIME_LABEL
    ? rendered
    : `${rendered} ${PLATFORM_TIME_ZONE_LABEL}`;
}

/**
 * The platform-local calendar date of an instant, as `yyyy-MM-dd`.
 *
 * For grouping and comparison, not display. Uses the same zone as everything
 * above, so a late-evening Manila appointment groups under its Manila date rather
 * than the viewer's — which is what made "today's consultations" wrong for a
 * non-PH viewer.
 */
export function platformDateKey(iso: string | undefined | null): string | null {
  const date = toValidDate(iso);
  if (!date) return null;
  // `en-CA` yields `YYYY-MM-DD`, which sorts and compares correctly as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
