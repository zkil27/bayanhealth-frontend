"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarPlus,
  CheckCircle2,
  FileText,
  XCircle,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRelativeTimeStringFromTimestamp } from "@/lib/utils";

import { useDoctorNotifications } from "../../hooks/useDoctorNotifications";
import type { ActivityEvent, ActivityEventKind } from "../../lib/activityFeed";
import { selectUnreadCount, useNotificationStore } from "../../stores/useNotificationStore";

const KIND_ICON: Record<ActivityEventKind, typeof Bell> = {
  assigned: CalendarPlus,
  cancelled: XCircle,
  completed: CheckCircle2,
  intake_ready: FileText,
};

/** Tint per kind, reusing the platform's status tokens rather than inventing new hues. */
const KIND_TONE: Record<ActivityEventKind, string> = {
  assigned: "text-(--status-confirmed-foreground)",
  cancelled: "text-(--status-cancelled-foreground)",
  completed: "text-(--status-completed-foreground)",
  intake_ready: "text-(--status-pending-foreground)",
};

/**
 * The doctor's activity feed, anchored to the header bell.
 *
 * There is no notifications endpoint for doctors (see `activityFeed.ts`), so
 * everything listed here is a genuine change {@link useDoctorNotifications}
 * observed in the doctor's own bookings between two reads — a new assignment,
 * a cancellation, a completion, or a patient's intake becoming ready. Nothing
 * is invented to fill the panel; an empty feed says so rather than showing
 * placeholder activity.
 */
export function DoctorNotification() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { poll } = useDoctorNotifications();

  const events = useNotificationStore((s) => s.events);
  const readIds = useNotificationStore((s) => s.readIds);
  const unreadCount = useNotificationStore(selectUnreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // A fresh check the moment the doctor actually looks, rather than making
    // them wait out whatever is left of the background interval.
    if (next) poll();
  };

  const openEvent = (event: ActivityEvent) => {
    markRead(event.id);
    setOpen(false);
    router.push(`/doctor/schedule?date=${event.date}&view=day`);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {/*
        No hover styling of its own: this sits inside the doctor header's shared
        icon-button shell, which owns the hover.
      */}
      <PopoverTrigger
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex size-full cursor-pointer items-center justify-center"
      >
        <Bell />
        {unreadCount > 0 ? (
          <span
            data-slot="notification-badge"
            className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-(--highlight) text-[10px] font-bold text-(--navy-900) ring-2 ring-(--surface-card)"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        data-slot="notification-panel"
        align="end"
        className="flex w-80 flex-col gap-0 p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-(--border-subtle) px-3.5 py-2.5">
          <span className="text-sm font-bold text-(--text-heading)">Notifications</span>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="text-xs font-medium text-(--text-link) underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-(--text-subtle) disabled:no-underline"
          >
            Mark all as read
          </button>
        </div>

        <div className="flex max-h-96 flex-col overflow-y-auto">
          {events.length === 0 ? (
            <p
              data-slot="notification-empty"
              className="px-3.5 py-8 text-center text-sm text-(--text-muted)"
            >
              No recent activity.
            </p>
          ) : (
            events.map((event) => {
              const Icon = KIND_ICON[event.kind];
              const unread = !readIds.has(event.id);
              return (
                <button
                  key={event.id}
                  type="button"
                  data-slot="notification-item"
                  data-unread={unread}
                  onClick={() => openEvent(event)}
                  className="flex items-start gap-2.5 border-b border-(--border-subtle) px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-(--action-secondary-hover-surface)"
                >
                  <Icon
                    className={`mt-0.5 size-4 shrink-0 ${KIND_TONE[event.kind]}`}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs leading-snug text-(--text-heading)">
                      {event.message}
                    </span>
                    <span className="text-[0.6875rem] text-(--text-subtle)">
                      {getRelativeTimeStringFromTimestamp(event.detectedAtMs) ?? ""}
                    </span>
                  </span>
                  {unread ? (
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--action-primary)"
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
