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
    <div className="mx-auto flex w-full max-w-5xl flex-col pb-10 lg:pb-2">
      {/* The context bar (back, title, status, reference) lives inside the detail, which has the booking data. */}
      <div className="px-2 sm:px-0">
        <PatientBookingDetail bookingId={bookingId} />
      </div>
    </div>
  );
}
