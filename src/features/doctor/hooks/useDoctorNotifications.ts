"use client";

import { useCallback, useEffect } from "react";

import { useAuthStore, useIdToken } from "@/stores/useAuthStore";

import { listAgendaInRange } from "../lib/api/agenda";
import { useNotificationStore } from "../stores/useNotificationStore";

/** How often the feed re-checks for activity while a doctor page is open. */
const POLL_INTERVAL_MS = 60_000;

/** How far back a cancellation or completion is still worth surfacing. */
const LOOKBACK_DAYS = 3;
/** How far ahead a newly assigned booking is still worth surfacing. */
const LOOKAHEAD_DAYS = 21;

function pollWindow(nowMs: number): { fromIso: string; toIso: string } {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return {
    fromIso: new Date(nowMs - LOOKBACK_DAYS * DAY_MS).toISOString(),
    toIso: new Date(nowMs + LOOKAHEAD_DAYS * DAY_MS).toISOString(),
  };
}

/**
 * Keep the doctor's activity feed current.
 *
 * Reads the same `GET /v1/bookings` the calendar does — see `activityFeed.ts`
 * for why the feed is derived from that read rather than a dedicated
 * notifications endpoint, which does not exist for doctors. Runs wherever the
 * bell is mounted (the doctor header, on every route), independent of whether
 * the calendar itself is on screen.
 *
 * Returns `poll` so the bell can force an immediate check the moment it is
 * opened, rather than waiting for the next scheduled tick.
 */
export function useDoctorNotifications(): { poll: () => void } {
  const idToken = useIdToken();
  const doctorId = useAuthStore((s) => s.session?.userId ?? "");

  const poll = useCallback(() => {
    if (!idToken || !doctorId) return;
    const { fromIso, toIso } = pollWindow(Date.now());
    listAgendaInRange(idToken, fromIso, toIso)
      .then((bookings) => {
        useNotificationStore.getState().ingest(doctorId, bookings, Date.now());
      })
      .catch(() => {
        // A missed poll just tries again on the next tick. The bell has no
        // surface for "couldn't check for updates" that would be worth more
        // than the silent retry.
      });
  }, [idToken, doctorId]);

  useEffect(() => {
    if (!idToken || !doctorId) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [idToken, doctorId, poll]);

  return { poll };
}
