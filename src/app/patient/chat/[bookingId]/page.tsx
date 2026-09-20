import { PatientChatRoom } from "@/features/patient/components/chat/PatientChatRoom";

/**
 * `/patient/chat/{bookingId}` — one conversation (Figma V9).
 *
 * Keyed by booking id, like the consultation room: authorization is entirely
 * server-side (`/v1/bookings/{bookingId}/messages` answers 404 for a
 * non-participant), so knowing a booking id grants nothing on its own.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <PatientChatRoom bookingId={bookingId} />;
}
