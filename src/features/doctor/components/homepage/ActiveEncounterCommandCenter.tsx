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
  const isOnDuty = profile ? (profile.onDemandAvailable ?? false) : true;
  const isLive = active?.isInProgress ?? false;

  if (!active) {
    return (
      <div
        data-slot="active-encounter-command-center"
        className="flex items-center justify-between rounded-2xl border border-(--border-subtle) bg-(--surface-warm)/40 px-4 py-3 text-xs transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl border border-(--border-subtle) bg-(--surface-card) text-(--text-muted) shadow-2xs">
            <Video className="size-4" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
              Active Encounter
            </span>
            <span className="font-semibold text-(--text-heading)">
              No consultation currently in room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              isOnDuty
                ? "bg-(--status-available-bg) text-(--status-available-fg)"
                : "bg-(--surface-warm) text-(--text-subtle)",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isOnDuty ? "bg-(--status-available-fg)" : "bg-(--gray-fg)",
              )}
              aria-hidden
            />
            {isOnDuty ? "Standby for calls" : "Duty paused"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="active-encounter-command-center"
      className="flex flex-col justify-between gap-3 rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-brand) p-4 text-(--surface-card) shadow-(--shadow-float) sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-(--surface-card)/10 text-(--teal-300) ring-1 ring-white/10">
          <Video className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider text-(--teal-300) uppercase">
              Active Encounter
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold",
                isLive ? "text-(--teal-300)" : "text-(--status-soon-fg)",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isLive ? "bg-(--teal-300)" : "bg-(--status-soon-fg)",
                )}
                aria-hidden
              />
              {isLive ? "Call in progress" : "Ready to start"}
            </span>
          </div>
          <h3 className="text-base font-bold text-white">{active.name}</h3>
          <p className="text-xs text-(--surface-card)/75">
            {serviceLabel(active.serviceType) ??
              (isLive ? "Consultation in progress" : "Accepted — waiting to start")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {!isLive ? <NoShowControl item={active} /> : null}
        <Link
          href={
            active.bookingId === "demo-active-encounter"
              ? "/consultation/room/demo"
              : `/consultation/room/${encodeURIComponent(active.bookingId)}`
          }
          data-slot="command-center-return-link"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-(--teal-500) px-4 py-2.5 text-xs font-bold text-(--surface-brand) shadow-sm transition-colors hover:bg-(--teal-400) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <Video className="size-4" aria-hidden />
          {isLive ? "Return to room" : "Open room"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
