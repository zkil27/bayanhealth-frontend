import { Suspense } from "react";

import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import { OtherPathNote } from "@/features/booking/components/patient/BookingPathChooser";
import { DoctorSearchPanel } from "@/features/booking/components/patient/DoctorSearchPanel";
import { EmergencyNote } from "@/features/booking/components/BrandUI";
import { ON_DEMAND_WAIT_ESTIMATE } from "@/features/booking/constants/bookingConstants";

/**
 * `/patient/booking/search` — the scheduled path: the doctor directory.
 */
export default function Page() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-start pb-8">
      <PatientPageHeader
        title="Book for later"
        backHref="/patient/booking"
      />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-y-4 px-4 pt-4 pb-8 md:px-8 lg:mx-0 lg:pl-[18rem] lg:pr-8 lg:max-w-none">
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
    </div>
  );
}
