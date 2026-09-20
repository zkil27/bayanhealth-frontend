"use client";

import { usePatientBoard } from "./usePatientBoard";
import { useTodayAgenda } from "./useTodayAgenda";
import { composeReadyToStartItems, type ReadyToStartItem } from "../lib/readyToStart";

/**
 * The one encounter `ActiveEncounterCommandCenter` should anchor on, if any.
 *
 * Reuses the same `composeReadyToStartItems` union `DoctorPatientQueue`'s own
 * in-progress row reads (and `usePatientBoard`/`useTodayAgenda`'s existing
 * query cache rather than a second poll), so there is exactly one computation
 * for "is a patient in the room" — no independent `activeConsultation` state
 * that could drift out of sync with it (see `DoctorHome`'s doc comment on why
 * the prior Command Center was removed).
 *
 * Two ranked candidates, not one:
 * 1. **In progress** — a patient already in the room outranks everything.
 * 2. **Ready, not yet started, on-demand only** — a booking a doctor just
 *    accepted no longer appears in `DoctorPatientQueue`'s own row list (it
 *    leaves that queue the moment it is accepted), so the command center is
 *    where it has to surface instead, with a "start it" affordance. Scheduled
 *    bookings are deliberately excluded from this second candidate: a
 *    scheduled booking's ready state belongs on the calendar until its own
 *    slot arrives, not on a card that reads as "do this now" — its
 *    `AppointmentPopover` already opens into the same room when the doctor
 *    gets there.
 */
export function useActiveEncounter(): { item: ReadyToStartItem | null; isLoading: boolean } {
  const { board, isConnecting: boardLoading } = usePatientBoard();
  const { bookings: todayBookings, isLoading: agendaLoading } = useTodayAgenda();

  const items = composeReadyToStartItems(board.ready, todayBookings);
  const active =
    items.find((item) => item.isInProgress) ??
    items.find((item) => !item.isInProgress && item.bookingMode === "on_demand");

  return { item: active ?? null, isLoading: boardLoading || agendaLoading };
}
