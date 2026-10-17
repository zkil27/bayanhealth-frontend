import { DoctorScheduleView } from "@/features/doctor/components/schedule/DoctorScheduleView";

export default function Page() {
  return (
    // Full height within the doctor shell layout canvas now that the top
    // greeting header has been removed.
    <section className="flex min-h-[calc(100dvh-6rem)] w-full flex-col items-center p-0.5 sm:p-2 md:p-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {/* Full width, not capped like the other doctor routes: the week grid
          has seven columns and benefits from the space rather than wrapping. */}
      <div className="min-h-0 w-full flex-1">
        <DoctorScheduleView />
      </div>
    </section>
  );
}
