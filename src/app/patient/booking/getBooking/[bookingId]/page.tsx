import { PatientBookingDetail } from "@/features/booking/components/patient/PatientBookingDetail";

/**
 * Patient booking detail route (Slice 5, task 10.5).
 *
 * Wired to `GET /v1/bookings/{bookingId}` via {@link PatientBookingDetail};
 * the `bookingId` path param maps to the contract's `bookingId` path parameter.
 */
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-2 sm:px-0 lg:mx-0 lg:pl-[18rem] lg:pr-8 lg:max-w-none">
      <PatientBookingDetail bookingId={bookingId} />
    </div>
  );
}
