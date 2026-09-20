import { Suspense } from "react";
import { BookingWrapper } from "@/features/booking/components/BookingWrapper";
import { OnDemandBooking } from "@/features/booking/components/patient/OnDemandBooking";

interface PageProps {
  searchParams?: Promise<{ serviceRequested?: string; mode?: string }>;
}

/**
 * Path A — "Consult Now": the on-demand intake form.
 *
 * This route never picks a doctor. It broadcasts to the consult-approved pool
 * once paid, which is what feeds the doctor dashboard's "On-Demand Requests"
 * card; the scheduled path (a specific doctor, a specific slot, reaching that
 * doctor's incoming-requests / upcoming-today cards) is `/patient/booking` →
 * `/patient/booking/doctor/[doctorId]` → `/patient/booking/createBooking/[id]`.
 *
 * `?mode=on-demand` is what the "Consult Now" CTAs link to. It states the path
 * in the URL rather than leaving it implicit, but it does not select behaviour:
 * this route is on-demand whatever the query string says, and
 * `OnDemandBooking` sends `bookingMode: "on_demand"` explicitly. Only
 * `?serviceRequested=` changes what renders, by prefilling the service field.
 */
export default async function PatientBookingRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const serviceRequested = params?.serviceRequested;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingWrapper>
        <OnDemandBooking defaultServiceType={serviceRequested} />
      </BookingWrapper>
    </Suspense>
  );
}
