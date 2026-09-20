"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Pill,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { displayBookingStatus } from "@/lib/bookings";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchMyFollowUps } from "@/features/patient/lib/api/patientFollowUps";
import { fetchMyMedications } from "@/features/patient/lib/api/patientMedications";
import { useQuery } from "@tanstack/react-query";

/**
 * A one-week strip of everything dated on the patient's record, with a
 * week-at-a-time filter.
 *
 * Three kinds of mark, each from a real dated field and each colour-matched to
 * the widget that owns it further down the page:
 *
 * - **Consultation** (teal) — a booking's `scheduledAt`. `cancelled` is excluded:
 *   it is not something the patient can act on, and a dot for one would say a day
 *   is busy when it is not.
 * - **Follow-up due** (gold) — a physician's `targetDate` from
 *   `GET /v1/patients/me/follow-ups`. The only forward-looking mark that is not
 *   an appointment, and the one most worth surfacing.
 * - **Prescription issued** (blue) — a released medication line's `releasedAt`.
 *
 * **Not** a dosing schedule. There is deliberately no "take your medicine today"
 * mark: a released prescription carries the physician's free-text `duration`
 * ("7 days", "until finished") and no start date, so the days a course actually
 * covers cannot be derived — only guessed. A guessed medication reminder on a
 * clinical screen is worse than none, so the blue mark says when a prescription
 * was *issued*, which is a fact the record holds.
 *
 * The clock is read after mount rather than during render — `new Date()` in a
 * render is impure and would let server and client disagree about "today".
 */

type MarkKind = "consult" | "follow-up" | "prescription";

interface DayMark {
  kind: MarkKind;
  /** Sort key within the day; bookings carry a real time, the rest sort last. */
  at?: string;
  title: string;
  meta?: string;
  href?: string;
}

const MARK_STYLE: Record<
  MarkKind,
  { dot: string; icon: typeof Stethoscope; label: string; fg: string }
> = {
  consult: {
    dot: "bg-(--action-primary)",
    icon: Stethoscope,
    label: "Consultation",
    fg: "text-(--status-available-fg)",
  },
  "follow-up": {
    dot: "bg-(--highlight)",
    icon: TriangleAlert,
    label: "Follow-up due",
    fg: "text-(--status-soon-fg)",
  },
  prescription: {
    dot: "bg-(--widget-meds-border)",
    icon: Pill,
    label: "Prescription",
    fg: "text-(--widget-meds-fg)",
  },
};

const MARK_ORDER: MarkKind[] = ["consult", "follow-up", "prescription"];

export function WeekCalendar({
  bookings,
  isLoading,
}: {
  bookings: BookingListItem[];
  isLoading?: boolean;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [today, setToday] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(startOfDay(new Date()));
  }, []);

  // Both share their query key with the widgets below, so the strip costs no
  // extra request on a page that already renders them.
  const { data: followUps } = useQuery({
    queryKey: ["patient-follow-ups", idToken],
    queryFn: () => fetchMyFollowUps(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 2,
    retry: false,
    throwOnError: false,
  });
  const { data: medications } = useQuery({
    queryKey: ["patient-medications", idToken],
    queryFn: () => fetchMyMedications(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 2,
    retry: false,
    throwOnError: false,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, DayMark[]>();
    const push = (key: string, mark: DayMark) => {
      const bucket = map.get(key);
      if (bucket) bucket.push(mark);
      else map.set(key, [mark]);
    };

    for (const booking of bookings) {
      if (booking.status === "cancelled" || !booking.scheduledAt) continue;
      const date = new Date(booking.scheduledAt);
      if (Number.isNaN(date.getTime())) continue;
      push(dayKey(date), {
        kind: "consult",
        at: booking.scheduledAt,
        title: serviceLabel(booking.serviceType),
        meta: displayBookingStatus(booking.status, !!booking.declinedBy).label,
        href: `/patient/booking/getBooking/${encodeURIComponent(booking.bookingId)}`,
      });
    }

    for (const followUp of followUps ?? []) {
      const date = new Date(`${followUp.targetDate}T00:00:00`);
      if (Number.isNaN(date.getTime())) continue;
      push(dayKey(date), {
        kind: "follow-up",
        title: "Follow-up recommended",
        meta: followUp.reason || undefined,
      });
    }

    for (const med of medications ?? []) {
      const date = new Date(med.releasedAt);
      if (Number.isNaN(date.getTime())) continue;
      push(dayKey(date), {
        kind: "prescription",
        at: med.releasedAt,
        title: [med.genericName, med.dose].filter(Boolean).join(" "),
        meta: [med.frequency, med.duration].filter(Boolean).join(" · ") || undefined,
      });
    }

    for (const bucket of map.values()) {
      bucket.sort((a, b) => {
        const byKind =
          MARK_ORDER.indexOf(a.kind) - MARK_ORDER.indexOf(b.kind);
        if (byKind !== 0) return byKind;
        return (a.at ?? "").localeCompare(b.at ?? "");
      });
    }
    return map;
  }, [bookings, followUps, medications]);

  if (isLoading || !today) {
    return (
      <div
        data-slot="week-calendar-loading"
        role="status"
        aria-label="Loading your week"
        className="h-56 animate-pulse rounded-2xl border border-(--border-subtle) bg-(--surface-warm)"
      />
    );
  }

  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dayKey(today);
  const activeKey =
    selectedKey && days.some((d) => dayKey(d) === selectedKey)
      ? selectedKey
      : days.some((d) => dayKey(d) === todayKey)
        ? todayKey
        : dayKey(days[0]!);
  const selected = byDay.get(activeKey) ?? [];

  // Only the kinds actually present this week earn a legend row — a key to
  // three colours none of which are on screen is noise.
  const presentKinds = MARK_ORDER.filter((kind) =>
    days.some((d) => (byDay.get(dayKey(d)) ?? []).some((m) => m.kind === kind)),
  );

  const activeDate = fromKey(activeKey);

  return (
    <section
      data-slot="week-calendar"
      aria-labelledby="week-calendar-heading"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-float)"
    >
      {/* Header band — brand navy, matching the landing scheme. */}
      <div className="flex items-center justify-between gap-2 bg-(--surface-brand) px-4 py-3 text-(--text-on-brand)">
        <h3
          id="week-calendar-heading"
          className="flex flex-col text-[13px] font-bold tracking-(--tracking-overline) uppercase"
        >
          My Calendar
          <span className="text-[12px] font-semibold tracking-normal normal-case text-(--text-on-brand)/75">
            {weekLabel(days[0]!, days[6]!)}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 ? (
            <button
              type="button"
              onClick={() => {
                setWeekOffset(0);
                setSelectedKey(null);
              }}
              className="rounded-(--radius-pill) px-2.5 py-1 text-[12px] font-bold text-(--text-on-brand) transition-colors hover:bg-(--text-on-brand)/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-on-brand)"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex size-7 items-center justify-center rounded-(--radius-md) text-(--text-on-brand) transition-colors hover:bg-(--text-on-brand)/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-on-brand)"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex size-7 items-center justify-center rounded-(--radius-md) text-(--text-on-brand) transition-colors hover:bg-(--text-on-brand)/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-on-brand)"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = dayKey(day);
            const marks = byDay.get(key) ?? [];
            const kinds = MARK_ORDER.filter((k) =>
              marks.some((m) => m.kind === k),
            );
            const isToday = key === todayKey;
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                aria-label={`${fullDate(day)}${
                  kinds.length
                    ? `, ${kinds.map((k) => MARK_STYLE[k].label).join(", ")}`
                    : ", nothing scheduled"
                }`}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  // The whole cell — weekday label, number and dots — takes the
                  // highlight, not just the digit, so today and the pointer read
                  // as "this day", the way the reference marks a date.
                  "flex flex-col items-center gap-1 rounded-(--radius-md) px-1 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  isActive
                    ? "bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-sm)"
                    : isToday
                      ? "bg-(--surface-accent-soft) text-(--status-available-fg) hover:bg-(--surface-accent-soft)"
                      : "text-(--text-body) hover:bg-(--surface-accent-soft)",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-bold tracking-(--tracking-overline) uppercase",
                    isActive
                      ? "text-(--action-primary-text)/85"
                      : isToday
                        ? "text-(--status-available-fg)"
                        : "text-(--text-subtle)",
                  )}
                >
                  {WEEKDAYS[day.getDay()]}
                </span>
                <span className="flex size-7 items-center justify-center text-[14px] font-bold">
                  {day.getDate()}
                </span>
                {/* One dot per kind present, so a day with a consult and a
                    prescription reads as two things, not one busy day. */}
                <span aria-hidden className="flex h-1.5 items-center gap-0.5">
                  {kinds.map((kind) => (
                    <span
                      key={kind}
                      className={cn(
                        "size-1.5 rounded-full",
                        isActive
                          ? "bg-(--action-primary-text)"
                          : MARK_STYLE[kind].dot,
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {presentKinds.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {presentKinds.map((kind) => (
              <li
                key={kind}
                className="flex items-center gap-1.5 text-[11px] text-(--text-muted)"
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", MARK_STYLE[kind].dot)}
                />
                {MARK_STYLE[kind].label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-1 flex-col gap-2 border-t border-(--border-subtle) pt-3">
          <p className="text-[11px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
            {`${activeDate.toLocaleDateString(undefined, { month: "long" })}, ${activeDate.getDate()}`}
          </p>

          {selected.length === 0 ? (
            <p className="text-[13px] text-(--text-muted)">
              No appointments this day.
            </p>
          ) : (
            <ul data-slot="week-calendar-day" className="flex flex-col">
              {selected.map((mark, i) => {
                const style = MARK_STYLE[mark.kind];
                const isConsult = mark.at && mark.kind === "consult";
                const body = (
                  <span className="flex min-w-0 items-baseline gap-2.5 py-2">
                    <span className="w-16 shrink-0 text-right text-[12px] font-semibold text-(--text-muted) tabular-nums">
                      {mark.at ? timeOfDay(mark.at) : "—"}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        style.dot,
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-(--text-heading)">
                        {mark.title}
                      </span>
                      {!isConsult && mark.meta ? (
                        <span className="block truncate text-[12px] text-(--text-muted)">
                          {mark.meta}
                        </span>
                      ) : null}
                    </span>
                  </span>
                );
                return (
                  <li
                    key={`${mark.kind}:${mark.title}:${i}`}
                    className={cn(
                      i > 0 && "border-t border-dashed border-(--border-subtle)",
                    )}
                  >
                    {mark.href ? (
                      <Link
                        href={mark.href}
                        className="block rounded-(--radius-sm) transition-colors hover:text-(--text-link-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Sunday-first, matching {@link WEEKDAYS} and the local `getDay()` index. */
function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Local calendar day, `YYYY-MM-DD` — never a UTC shift. */
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function weekLabel(from: Date, to: Date): string {
  const sameMonth = from.getMonth() === to.getMonth();
  const left = from.toLocaleDateString(undefined, {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
  });
  const right = to.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return `${left} – ${right}`;
}

function fullDate(date: Date): string {
  return date.toLocaleDateString(undefined, { dateStyle: "full" });
}

function timeOfDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function serviceLabel(serviceType?: string): string {
  if (!serviceType) return "Consultation";
  return serviceType
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
