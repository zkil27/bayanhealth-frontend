import Link from "next/link";
import { CalendarClock, Zap } from "lucide-react";

import { EmergencyNote } from "../BrandUI";
import { ON_DEMAND_WAIT_ESTIMATE } from "../../constants/bookingConstants";

/**
 * Header for `/patient/booking`, which is now one thing only: the scheduled path.
 *
 * What it replaces, and why:
 *
 * - `PatientHeaderBooking` — a gradient hero with a back arrow (the patient
 *   nav is persistent now, so there is nowhere to go "back" from) and a red
 *   `URGENT` pill that jumped to the urgent-care card below.
 * - `BookingServicesCarousel` — a horizontal scroll of oversized service icons
 *   that deep-linked into the on-demand intake. Picking a service is the first
 *   field of that form; doing it twice, in a different visual language, on the
 *   screen whose job is finding a doctor, is what made the two paths feel like
 *   one confused one.
 * - `BookingActionGrid` — "Regular Booking" / "Schedule Booking" tiles (the
 *   second permanently disabled) plus the "Urgent Care · 24/7 Available ·
 *   Need Immediate Assistance? For medical emergencies requiring immediate
 *   attention" card, whose press-and-hold "URGENT BOOK" dialog was wired to an
 *   empty handler. It promised emergency care the platform does not provide
 *   and cannot route, directly against the disclaimer carried on every other
 *   screen of the flow.
 *
 * The on-demand path keeps one deliberate, secondary entry point here for the
 * patient who came looking for a doctor and would rather not wait for a slot.
 */
export function BookingDirectoryHeader() {
  return (
    <header className="flex flex-col gap-4 px-4 pt-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[24px] leading-tight font-bold tracking-[-0.01em] text-(--text-heading)">
          Book for later
        </h1>
        <p className="text-[15px] leading-[1.5] text-(--text-muted)">
          Search a doctor by name or specialty, check their calendar, and pick
          an appointment slot.
        </p>
      </div>

      <Link
        href="/patient/booking/createBooking?mode=on-demand"
        className="flex items-center gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-(--shadow-card) transition-colors hover:border-(--action-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(--status-available-fg)">
          <Zap className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-(--text-heading)">
            Need care now? Consult Now instead
          </span>
          <span className="block text-[13.5px] text-(--text-muted)">
            No doctor to choose — {ON_DEMAND_WAIT_ESTIMATE.toLowerCase()}.
          </span>
        </span>
        <CalendarClock className="hidden size-4 shrink-0 text-(--text-subtle) sm:block" />
      </Link>

      <EmergencyNote />
    </header>
  );
}
