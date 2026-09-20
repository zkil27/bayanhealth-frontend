import { Suspense } from "react";

import { BookingNavBar } from "@/features/booking/components/BookingNavBar";
import { OtherPathNote } from "@/features/booking/components/patient/BookingPathChooser";
import { DoctorSearchPanel } from "@/features/booking/components/patient/DoctorSearchPanel";
import { EmergencyNote } from "@/features/booking/components/BrandUI";
import { ON_DEMAND_WAIT_ESTIMATE } from "@/features/booking/constants/bookingConstants";

/**
 * `/patient/booking/search` — the scheduled path: the doctor directory.
 *
 * This is now the whole of "Book for later". It was previously duplicated: this
 * route rendered the panel under "Search your Doctor" while `/patient/booking` rendered
 * the same panel under a directory header, so the two screens differed only by
 * title. `/patient/booking` is the path chooser now and this is the one directory.
 *
 * It keeps its own back control to the chooser and keeps the on-demand escape
 * hatch — the patient who came looking for a doctor and would rather not wait
 * for a slot should not have to go back a level to find it.
 *
 * `DoctorSearchPanel` owns the filter state shared by the search field, the
 * specialty drawer and the results list, and reads the `?name=` /
 * `?excludeDoctorId=` query string, so it needs a Suspense boundary
 * (ADR-20260806-02).
 */
export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-y-4 pb-8">
      <BookingNavBar
        header="Book for later"
        subtitle="Search a doctor by name or specialty, then pick a slot from their calendar."
        backHref="/patient/booking"
      />

      <OtherPathNote
        href="/patient/booking/createBooking?mode=on-demand"
        label="Need care now? Consult Now instead"
        detail={`No doctor to choose — ${ON_DEMAND_WAIT_ESTIMATE.toLowerCase()}.`}
      />

      <Suspense fallback={null}>
        <DoctorSearchPanel />
      </Suspense>

      <div className="px-4 md:px-2">
        <EmergencyNote />
      </div>
    </section>
  );
}
