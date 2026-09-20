"use client";

import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";
import { useActiveEncounter } from "../../hooks/useActiveEncounter";
import { NoShowControl, serviceLabel } from "./DoctorPatientQueue";

/**
 * The Clinical Command Center — a permanently mounted rail card that anchors
 * "what does this doctor need to do next with an accepted patient" as one
 * homing beacon, glanceable when idle and actionable the moment there is
 * something to act on, without hunting through the queue below.
 *
 * This is a *view* of {@link useActiveEncounter}, not a second tracker of it.
 * The prior Command Center (`ClinicalCommandCenter.tsx`, removed in the
 * "rebuild the operational home dashboard" pass — see `DoctorHome`'s doc
 * comment) carried its own idea of "active" that could disagree with the
 * queue's. This one reads the exact same derived value, so the two can never
 * show a different patient or disagree about whether anyone is in the room.
 *
 * Two encounter states, not one, since `DoctorPatientQueue` accepting a
 * booking (`useDoctorQueueSummary`'s own accept flow) now removes that row
 * from the queue immediately rather than leaving it there relabelled:
 * - **Ready, not started** (on-demand only — see `useActiveEncounter`'s own
 *   doc comment on why a scheduled booking never reaches this card): "Open
 *   room" starts the same way `AppointmentPopover` already starts a scheduled
 *   one — from inside the room itself, not a second Start control duplicated
 *   here. The no-show control moves here with it, verbatim, since the row
 *   that used to carry it no longer renders.
 * - **In progress**: "Return to room", unchanged from before.
 *
 * Deliberately does not render: a radar ping animation, a "live connection"
 * chip, or a chime tester — none of those are real (every queue on this
 * dashboard is polled REST, not pushed; see `DoctorPatientQueue`'s
 * `StandbyPanel` doc comment for the same call). It also does not show
 * age/sex or an allergy flag — the backend has neither field on a booking or
 * intake entry, so a card here cannot honestly claim them.
 *
 * `min-h-[148px]` keeps the card's own footprint stable across idle/active so
 * the agenda card beneath it does not jump as a consultation is accepted,
 * started, and ends.
 */
export function ActiveEncounterCommandCenter() {
  const { item: active } = useActiveEncounter();
  const { profile } = useMyDoctorProfile();
  const isOnDuty = profile?.onDemandAvailable ?? false;
  const isLive = active?.isInProgress ?? false;

  return (
    <div
      data-slot="active-encounter-command-center"
      className="flex min-h-[148px] shrink-0 flex-col justify-between rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-brand) p-4 text-(--surface-card) shadow-(--shadow-float)"
    >
      <div className="flex items-center justify-between border-b border-(--surface-card)/15 pb-2 text-[11px]">
        <span className="font-bold tracking-wider text-(--surface-card)/70 uppercase">
          Command Center
        </span>
        {active ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              isLive ? "text-(--teal-300)" : "text-(--status-soon-fg)",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", isLive ? "bg-(--teal-300)" : "bg-(--status-soon-fg)")}
              aria-hidden
            />
            {isLive ? "Active call" : "Ready to start"}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              isOnDuty ? "text-(--teal-300)" : "text-(--surface-card)/50",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", isOnDuty ? "bg-(--teal-300)" : "bg-(--surface-card)/40")}
              aria-hidden
            />
            {isOnDuty ? "Ready" : "Offline"}
          </span>
        )}
      </div>

      <div className="my-2 flex-1">
        {active ? (
          <div className="space-y-0.5">
            <h3 className="truncate text-sm font-bold">{active.name}</h3>
            <p className="truncate text-xs text-(--surface-card)/70">
              {serviceLabel(active.serviceType) ??
                (isLive ? "Consultation in progress" : "Accepted — waiting to start")}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">No active consultation</p>
            <p className="text-[11px] leading-tight text-(--surface-card)/60">
              Accepted on-demand encounters will anchor here.
            </p>
          </div>
        )}
      </div>

      {active ? (
        <div className="flex flex-col gap-2">
          <Link
            href={`/consultation/room/${encodeURIComponent(active.bookingId)}`}
            data-slot="command-center-return-link"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-(--teal-500) px-3 py-2 text-xs font-bold text-(--surface-brand) transition-colors hover:bg-(--teal-400)"
          >
            <Video className="size-3.5" aria-hidden />
            {isLive ? "Return to room" : "Open room"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          {!isLive ? (
            <div className="self-end">
              <NoShowControl item={active} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
