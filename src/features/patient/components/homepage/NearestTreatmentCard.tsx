"use client";

import type { BookingListItem } from "@/features/booking/lib/api/bookingList";

import { WeekCalendar } from "./WeekCalendar";

/**
 * "Nearest treatment" — the week strip and what is dated on it.
 *
 * A thin data pass-through to {@link WeekCalendar}, which is fully
 * self-contained: it carries its own "My Calendar" header, the week paging, and
 * the three kinds of mark it draws from dated fields the record actually holds
 * (a booking's `scheduledAt`, a physician's follow-up `targetDate`, and a
 * prescription's `releasedAt`). No outer heading is rendered here — the
 * calendar's own header already names it.
 */
export function NearestTreatmentCard({
  bookings,
  isLoading,
}: {
  bookings: BookingListItem[];
  isLoading?: boolean;
}) {
  return (
    <section data-slot="patient-home-schedule" className="flex h-full flex-col">
      <WeekCalendar bookings={bookings} isLoading={isLoading} />
    </section>
  );
}
