"use client";

import type { BookingListItem } from "@/features/booking/lib/api/bookingList";

import { MedicationsPanel } from "./MedicationsPanel";
import { UpcomingAppointmentCard } from "./UpcomingAppointmentCard";

/**
 * The rail's consolidated care-status card, laid out to the reference's
 * "Notifications" card: a heading + date above one panel that stacks the latest
 * released prescription over a divider over the next scheduled visit.
 *
 * Each half keeps its own `data-slot` and its own empty state, so nothing that
 * depended on them individually changes.
 */
export function CareStatusCard({
  booking,
  isLoading,
}: {
  booking?: BookingListItem;
  isLoading?: boolean;
}) {
  const dateLabel = booking?.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : null;

  return (
    <div data-slot="patient-home-care-status" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="text-[15px] font-bold text-(--status-available-fg)">
          Notifications
        </h3>
        {dateLabel ? (
          <span className="shrink-0 text-[12px] font-medium text-(--text-subtle)">
            {dateLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-float)">
        <MedicationsPanel embedded />
        <div className="my-3 border-t border-(--border-subtle)" />
        <UpcomingAppointmentCard
          booking={booking}
          isLoading={isLoading}
          embedded
        />
      </div>
    </div>
  );
}
