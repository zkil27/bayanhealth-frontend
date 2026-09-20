import { create } from "zustand";

import { diffBookingActivity, type ActivityEvent, type BookingSnapshot } from "../lib/activityFeed";
import type { DoctorBooking } from "../lib/api/agenda";

/** Newest first, and bounded — this is a recent-activity feed, not an archive. */
const MAX_EVENTS = 30;

interface NotificationStore {
  events: ActivityEvent[];
  readIds: ReadonlySet<string>;
  /** `null` until the first poll for the current doctor has run at all. */
  snapshot: BookingSnapshot | null;
  /** Whose feed this is — lets a poll notice a different doctor signed in. */
  doctorId: string | null;
  /**
   * Feed a fresh read of the doctor's bookings in. Diffs against whatever this
   * store last saw for `doctorId` and prepends any new events; switching to a
   * different (or no) doctor starts the feed over rather than carrying one
   * doctor's activity into another's session.
   */
  ingest: (doctorId: string, bookings: readonly DoctorBooking[], nowMs: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  events: [],
  readIds: new Set(),
  snapshot: null,
  doctorId: null,

  ingest: (doctorId, bookings, nowMs) => {
    const current = get();
    const isNewDoctor = current.doctorId !== doctorId;
    const { events: newEvents, snapshot } = diffBookingActivity(
      bookings,
      isNewDoctor ? null : current.snapshot,
      nowMs,
    );

    set({
      doctorId,
      snapshot,
      events: isNewDoctor
        ? []
        : newEvents.length === 0
          ? current.events
          : [...newEvents, ...current.events].slice(0, MAX_EVENTS),
      readIds: isNewDoctor ? new Set() : current.readIds,
    });
  },

  markRead: (id) =>
    set((state) => {
      if (state.readIds.has(id)) return state;
      return { readIds: new Set(state.readIds).add(id) };
    }),

  markAllRead: () =>
    set((state) => ({ readIds: new Set([...state.readIds, ...state.events.map((e) => e.id)]) })),
}));

/** How many events in the feed have not been read yet. */
export function selectUnreadCount(state: NotificationStore): number {
  return state.events.reduce((count, e) => (state.readIds.has(e.id) ? count : count + 1), 0);
}
