import { DoctorScheduleView } from "@/features/doctor/components/schedule/DoctorScheduleView";

export default function Page() {
  return (
    // Full height within the doctor shell layout canvas now that the top
    // greeting header has been removed.
    <section className="flex h-[calc(100dvh-2rem)] w-full flex-col items-center overflow-hidden p-2 md:p-4 lg:h-full">
      {/* Full width, not capped like the other doctor routes: the week grid
          has seven columns and benefits from the space rather than wrapping. */}
      <div className="min-h-0 w-full flex-1">
        <DoctorScheduleView />
      </div>
    </section>
  );
}
