import { DoctorScheduleView } from "@/features/doctor/components/schedule/DoctorScheduleView";

export default function Page() {
  return (
    // A fixed viewport-derived height, not `h-full`: nothing above this route
    // (`SidebarInset` included) gives its children an explicit height, so
    // `h-full` resolved to the content's own size and the whole document grew
    // with the calendar — which is what let the legend end up below the fold.
    // 92px is the doctor header's own height (py-5 padding plus its two lines
    // of text); everything below that budget is this page's to spend, and it
    // never changes size when Day/Week/Month toggle.
    <section className="flex h-[calc(100dvh-92px)] w-full flex-col items-center overflow-hidden p-2 md:p-4">
      {/* Full width, not capped like the other doctor routes: the week grid
          has seven columns and benefits from the space rather than wrapping. */}
      <div className="min-h-0 w-full flex-1">
        <DoctorScheduleView />
      </div>
    </section>
  );
}
