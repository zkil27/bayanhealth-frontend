import { QueryClientProviders } from "@/components/blocks/Providers";
import { ConsultationRoom } from "@/features/consultation/components/session/ConsultationRoom";

/**
 * Booking-keyed consultation room (ADR-20260806-01).
 *
 * Distinct from `/consultation/[token]`, which activates a single-use one-time
 * link. Because that link can only be consumed once, the second participant has
 * no token and needs a durable address for the same conversation — this is it.
 * Both the patient and the assigned doctor reach the room by booking id.
 *
 * Authorization is entirely server-side: `GET /v1/bookings/{bookingId}/state`
 * returns 404 for a non-participant and 409 until an active session exists, so
 * knowing a booking id grants nothing on its own.
 */
export default async function ConsultationRoomPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return (
    <QueryClientProviders>
      <ConsultationRoom bookingId={bookingId} />
    </QueryClientProviders>
  );
}
