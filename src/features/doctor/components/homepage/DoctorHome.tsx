
import { ActiveEncounterCommandCenter } from "./ActiveEncounterCommandCenter";
import { DoctorCommandBar } from "./DoctorCommandBar";
import { DoctorPatientQueue } from "./DoctorPatientQueue";
import { DoctorRecentConsultations } from "./DoctorRecentConsultations";
import { ScheduleCollisionBanner } from "./ScheduleCollisionBanner";
import { UpcomingTodayCard } from "./UpcomingTodayCard";

/**
 * Doctor home (`/doctor`) — Clinical Flight Deck & Two-Column Workspace.
 *
 * Layout Hierarchy:
 * 1. Top: Unified `DoctorCommandBar` consolidating Doctor Identity, Master Duty
 *    Switch, and the Shift Metrics Ribbon in one glanceable header.
 * 2. Main Stage (`lg:col-span-8`): Focused on urgent clinical tasks —
 *    Active Encounter Command Center, Schedule Collision Banner, Unified Patient
 *    Triage Queue, and Recent Consultations.
 * 3. Schedule Rail (`lg:col-span-4`): Anchors Today's Agenda timeline, daily
 *    slots, and calendar navigation.
 */
export function DoctorHome() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-lg flex-col gap-4 px-4 pt-1 pb-4 sm:px-6 md:max-w-none md:px-8 lg:mx-0 lg:px-8">
      {/* ------------------------------- top operational command bar -- */}
      <DoctorCommandBar />

      {/* ------------------------- dual-column clinical cockpit grid -- */}
      <div className="grid grid-cols-1 items-start gap-5 lg:flex-1 lg:min-h-0 lg:grid-cols-12 lg:items-stretch">
        {/* --------------------------------- main stage: clinical work -- */}
        <section
          data-slot="doctor-main-stage"
          aria-label="Clinical Workstation"
          className="flex min-w-0 flex-col gap-4 rounded-(--radius-canvas) border border-(--border-subtle)/70 bg-(--surface-card) p-4 shadow-(--shadow-float) sm:p-5 lg:col-span-8 lg:h-full lg:min-h-0 lg:overflow-y-auto"
        >
          <ActiveEncounterCommandCenter />
          <ScheduleCollisionBanner />
          <DoctorPatientQueue />
          <DoctorRecentConsultations />
        </section>

        {/* ------------------------------ right rail: schedule context -- */}
        <aside
          data-slot="doctor-schedule-rail"
          aria-label="Today's Schedule & Agenda"
          className="flex min-w-0 flex-col lg:col-span-4 lg:h-full lg:min-h-0"
        >
          <UpcomingTodayCard />
        </aside>
      </div>
    </div>
  );
}
