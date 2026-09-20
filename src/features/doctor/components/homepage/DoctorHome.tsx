
import { ActiveEncounterCommandCenter } from "./ActiveEncounterCommandCenter";
import { DoctorDutyCard } from "./DoctorDutyCard";
import { DoctorIdentityCard } from "./DoctorIdentityCard";
import { DoctorPatientQueue } from "./DoctorPatientQueue";
import { DoctorRecentConsultations } from "./DoctorRecentConsultations";
import { DoctorShiftLedger } from "./DoctorShiftLedger";
import { ScheduleCollisionBanner } from "./ScheduleCollisionBanner";
import { UpcomingTodayCard } from "./UpcomingTodayCard";

/**
 * Doctor home (`/doctor`) — the "Clinical Flight Deck": the same
 * rail-beside-sheet layout as the patient home, sized to fit one desktop
 * viewport with no page scroll (the doctor layout pins its row to `100vh` at
 * `lg`, and this grid `flex-1`s into it, exactly as `PatientShell` does).
 *
 * | Zone  | Desktop (`lg`)                                                                       |
 * |-------|---------------------------------------------------------------------------------------|
 * | Rail  | identity · Clinical Duty Command (single source of truth for on-demand availability) · today's agenda (`col-span-4`) |
 * | Sheet | ONE white surface: shift overview + bell · collision guard · unified patient queue · recent consultations (`col-span-8`) |
 *
 * The rail used to also carry a "Clinical Command Center" hero — a dark card
 * whose only non-idle state duplicated the top row of `DoctorPatientQueue`'s
 * own Ready-to-Start section (same booking, same "Enter/Rejoin" action), and
 * whose idle state duplicated the duty card's own on-duty message. It was
 * removed rather than kept as a second, competing source of truth for "is a
 * patient waiting."
 *
 * `ActiveEncounterCommandCenter` re-adds a version of that card, but as a
 * *view* of the queue's own in-progress state (`useActiveEncounter`, shared
 * with `DoctorPatientQueue`'s in-progress row) rather than a second tracker —
 * it cannot disagree with the queue about who is in the room because it reads
 * the same derived value. It earns its place back as a homing beacon: once a
 * doctor has scrolled past the queue into recent consultations or navigated
 * away and back, this is the one thing in the rail that still says "you have
 * a patient waiting in room X" without hunting back through the sheet.
 *
 * `justify-between` on the rail (at `lg`) is what keeps the two top cards from
 * clumping at the header while the agenda card is still short: the agenda
 * block is `lg:flex-1 lg:min-h-0`, so it absorbs the remaining height and its
 * own card (`h-full`) stretches to fill it — the card's real bottom edge lands
 * on the sidebar's own bottom edge, not just the page background beneath it.
 * `UpcomingTodayCard` carries its own "Today's agenda" heading in its banner
 * now, so this wrapper adds no second, redundant one above it.
 *
 * The sheet's own bottom half used to embed `CompletedConsultations` — a
 * collapsible card built for browsing (week paging, an expand toggle) that
 * left a tall void collapsed and could blow out the page's height expanded.
 * `DoctorRecentConsultations` reads the same real 7-day window through the
 * same query, but always renders a fixed top-3 slice with a "View all →" link
 * to the real archive (`/doctor/history`) — no accordion state, no layout
 * shift.
 *
 * Mobile order (the column wrappers are `display: contents` below `lg`, so
 * `order-*` stacks the cards directly): identity → duty → sheet → agenda —
 * the sheet's urgent queue stays above the fold.
 */
export function DoctorHome() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-lg flex-col gap-3.5 px-4 pt-1 pb-2 sm:px-6 md:max-w-none md:gap-3.5 md:px-8 lg:mx-0 lg:px-8">
      <div className="grid grid-cols-1 items-start gap-4 lg:flex-1 lg:grid-cols-12 lg:items-stretch">
        {/* -------------------------------------------------------- rail -- */}
        <div className="contents lg:col-span-4 lg:flex lg:h-full lg:flex-col lg:justify-between lg:gap-3">
          <div className="order-1 flex flex-col gap-3 lg:order-none">
            <DoctorIdentityCard />
            <DoctorDutyCard />
            <ActiveEncounterCommandCenter />
          </div>
          <div className="order-3 lg:order-none lg:min-h-0 lg:flex-1">
            <UpcomingTodayCard />
          </div>
        </div>

        {/* ---------------------------------------------- elevated sheet -- */}
        <div className="order-2 flex min-w-0 flex-col gap-4 rounded-(--radius-canvas) border border-(--border-subtle)/70 bg-(--surface-card) p-5 shadow-(--shadow-float) lg:order-none lg:col-span-8">
          <DoctorShiftLedger />
          <ScheduleCollisionBanner />
          <DoctorPatientQueue />
          <DoctorRecentConsultations />
        </div>
      </div>
    </div>
  );
}
