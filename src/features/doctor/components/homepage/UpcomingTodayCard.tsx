"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { bookingServices } from "@/types/booking.types";

import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { useTodaySlots } from "../../hooks/useTodaySlots";
import { buildDayEntries, type CalendarEntry } from "../schedule/calendarEntries";
import { CATEGORY_LABEL, DEFAULT_STYLES, HUES } from "../schedule/calendarColors";
import { formatMinutesToTime } from "../schedule/slotPlan";
import { RAIL_CARD_CLASS } from "./queueCard";

/** Card cap, matching the dashboard-wide "no card scrolls" rule. */
const VISIBLE_CAP = 5;

/**
 * "Upcoming today" — the doctor's agenda for the rest of the day, styled as a
 * calendar card: a brand banner naming the month, a Sun–Sat week strip with
 * today highlighted, and a single-line-per-entry list below it.
 *
 * Deliberately reuses `/doctor/schedule`'s own timeline builder
 * (`buildDayEntries` from `calendarEntries.ts`) and its default category
 * styling (`calendarColors.ts`), rather than re-deriving a second version of
 * "what does this doctor's day look like". That module's own doc explains why
 * two reads are unavoidable — slots carry availability and the fact a slot is
 * taken, bookings carry the consultation itself — and this card is exactly the
 * same merge, just windowed to one day and rendered as a compact list instead
 * of a grid.
 *
 * **The week strip is decorative, not a picker.** It renders real calendar
 * dates (the week containing today, from the same `date` anchor the agenda
 * itself is windowed to) with today's pill highlighted, but the other six
 * days are plain, unstyled-as-clickable text — this card has no data source
 * for *another* day's agenda, and a strip that looked interactive but changed
 * nothing on tap would be a worse affordance than none.
 *
 * **Entry rows name real service types, never invented patients.** A
 * reference design showing "Consultation with Mr. White" implies the platform
 * knows the patient's name before the doctor has any relationship to the
 * booking — `DoctorBooking` (`GET /v1/bookings`) carries no such field. Each
 * row instead pairs the category (`Scheduled`, `On-demand`, …) with the real
 * booked service when one is known, e.g. "Scheduled · General Illness".
 *
 * Colours use the calendar's *default* palette rather than a doctor's saved
 * one: the saved palette lives in `localStorage` and is read through
 * `useSyncExternalStore` inside `CalendarLegend`'s own hook, which this
 * dashboard card does not import — pulling in a per-device colour preference
 * for one small list would be a heavier dependency than the value returned.
 *
 * **No "Block time" action here.** It used to open `BlockTimeDialog` inline;
 * that capability is not gone from the product, only from this card — it
 * still lives at `/doctor/schedule` (the sidebar's "Calendar" link), which
 * owns the doctor's actual availability editing (`ShiftInspectorPopover`,
 * `ActiveDaySlotList`) rather than a second, narrower copy of it bolted onto a
 * read-mostly dashboard summary.
 */
export function UpcomingTodayCard() {
  const [expanded, setExpanded] = useState(false);

  const { bookings, isLoading: agendaLoading, error: agendaError } = useTodayAgenda();
  const { slots, date, isLoading: slotsLoading, error: slotsError } = useTodaySlots();

  const isLoading = agendaLoading || slotsLoading;
  const error =
    (agendaError instanceof Error ? agendaError.message : null) ??
    (slotsError instanceof Error ? slotsError.message : null);

  // No category filter: a doctor who just blocked 2-4pm from this card's own
  // dialog needs to see that block reflected here, or "seamless with the
  // calendar" is not actually true. `buildDayEntries` already sorts by start
  // time, so open/blocked/appointment entries interleave exactly as the day
  // unfolds.
  const entries = useMemo(() => buildDayEntries(date, slots, bookings), [date, slots, bookings]);
  const visibleEntries = expanded ? entries : entries.slice(0, VISIBLE_CAP);
  const hiddenCount = entries.length - visibleEntries.length;

  const today = useMemo(() => parseISO(date), [date]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [today]);

  return (
    <div className={cn(RAIL_CARD_CLASS, "h-full")} data-slot="upcoming-today-card">
      <div className="flex flex-col gap-3 p-4 pb-0">
        <div className="rounded-2xl bg-(--surface-brand) px-4 py-3 text-(--text-on-brand) shadow-2xs">
          <span className="text-[10px] font-bold tracking-(--tracking-overline) text-(--text-on-brand)/70 uppercase">
            Today&apos;s agenda
          </span>
          <h3 className="font-display text-lg leading-tight font-bold text-(--text-on-brand)">
            {format(today, "MMMM")}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1" aria-hidden>
          {weekDays.map((day) => {
            const isToday = format(day, "yyyy-MM-dd") === date;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold",
                  isToday
                    ? "bg-(--surface-brand) text-(--text-on-brand)"
                    : "text-(--text-subtle)",
                )}
              >
                <span className="uppercase">{format(day, "EEE")}</span>
                <span className={cn("text-[13px]", isToday ? "font-bold" : "text-(--text-muted)")}>
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        `flex-1` here (this card's root is `h-full` in the rail — see the
        component doc) is what lets the card's own bottom edge, not just
        blank card background, reach the sheet's baseline: the entries region
        absorbs whatever vertical slack a short agenda leaves, and the footer
        below stays pinned to the card's true bottom rather than floating
        wherever the last row happens to end.
      */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="px-1 text-[11px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
          {format(today, "MMMM d")}
        </span>

        {isLoading ? (
          <UpcomingTodaySkeleton />
        ) : error ? (
          <p className="p-4 text-center text-sm text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <Empty data-slot="upcoming-today-empty" className="gap-2 p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarIcon />
              </EmptyMedia>
              <EmptyTitle>Nothing scheduled today</EmptyTitle>
              <EmptyDescription>
                No open availability or consultations are on today&apos;s calendar.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {visibleEntries.map((entry) => (
                <UpcomingEntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
            {hiddenCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(true)}
              >
                {hiddenCount} more
              </Button>
            ) : expanded && entries.length > VISIBLE_CAP ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(false)}
              >
                Show less
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/*
        A real statement, not filler: walk-ins genuinely do not appear here —
        they route through `DoctorPatientQueue`'s on-demand pool, never
        through the slot-based calendar this card and `/doctor/schedule` both
        read. `Calendar →` is the same route the sidebar's own "Calendar" link
        opens, so this is a second door onto real availability editing, not a
        second copy of it.
      */}
      <div className="flex items-center justify-between border-t border-(--border-subtle) px-4 py-3 text-[11px]">
        <span className="text-(--text-subtle)">Walk-ins are handled via the live queue</span>
        <Link
          href="/doctor/schedule"
          className="font-bold text-(--status-available-fg) hover:underline"
        >
          Calendar →
        </Link>
      </div>
    </div>
  );
}

/** The real booked service, formatted, or `null` when this entry has none (availability, or an unassigned slot-booking). */
function serviceLabel(entry: CalendarEntry): string | null {
  const serviceType = entry.booking?.serviceType;
  if (!serviceType) return null;
  return bookingServices.find((s) => s.value === serviceType)?.label ?? null;
}

function UpcomingEntryRow({ entry }: { entry: CalendarEntry }) {
  // The vivid hue itself (not the text-safe `swatchStyle` treatment `styleFor`
  // produces for a full block) — a small solid dot reads better as a plain
  // colour chip, the same way the reference layout's bullet dots do.
  const dotColor = HUES[DEFAULT_STYLES[entry.category].hue].strong;
  const startTime = formatMinutesToTime(entry.startMinutes);
  const service = serviceLabel(entry);

  const label =
    entry.bookingId && !entry.booking
      ? // A slot-booked consultation the doctor is not yet assigned to — see
        // calendarEntries.ts's own doc on `bookingId` without `booking`. Says
        // the time is taken; never invents a patient.
        "Reserved — awaiting assignment"
      : service
        ? `${CATEGORY_LABEL[entry.category]} · ${service}`
        : CATEGORY_LABEL[entry.category];

  return (
    <li
      className="flex items-center gap-3 border-b border-(--border-subtle) py-2.5 last:border-b-0"
      data-slot="upcoming-today-row"
      data-category={entry.category}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: dotColor }} />
      <span className="w-16 shrink-0 text-[13px] font-semibold text-(--text-heading)">
        {startTime}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-(--text-muted)">{label}</span>
    </li>
  );
}

function UpcomingTodaySkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 border-b border-(--border-subtle) py-2.5">
          <Skeleton className="size-2 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </li>
      ))}
    </ul>
  );
}
