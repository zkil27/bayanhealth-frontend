import { api } from "@/lib/api";
import type { BookingDetail } from "@/features/booking/lib/api/bookingDetail";

/**
 * The assigned doctor tells the patient to go to an emergency room now
 * (ADR-20261005-02). `POST /v1/bookings/{bookingId}/emergency-referral`.
 */
export async function sendEmergencyReferral(
  idToken: string,
  bookingId: string,
  note?: string,
): Promise<BookingDetail> {
  const res = await api.post<BookingDetail>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/emergency-referral`,
    idToken,
    note?.trim() ? { note: note.trim() } : {},
  );
  return res.data;
}
