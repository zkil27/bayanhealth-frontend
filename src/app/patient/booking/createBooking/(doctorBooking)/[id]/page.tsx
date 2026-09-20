import { BookingWrapper } from "@/features/booking/components/BookingWrapper";
import { DoctorBookingLoader } from "@/features/booking/components/doctor/DoctorBookingLoader";

/**
 * Book a consultation with a specific doctor.
 *
 * The doctor used to be a literal on this page — `{ id, name: "Dr. Juan",
 * status: "available" }` under a `// Replace with actual data fetch` comment — so
 * every doctor id rendered "Book Appointment With Dr. Juan" and a fabricated
 * availability that drove the Book/Queue control. It now resolves the real
 * `DoctorPublicSummary` and the doctor's real slots client-side.
 *
 * `slotId` is the slot the patient already chose on the doctor detail page,
 * which links here as `?slotId=...`. This page used to read only `params`, so
 * the choice was dropped on navigation and the patient had to pick the same time
 * again in the form. It is forwarded to the loader, which resolves it against
 * the doctor's real slots before preselecting anything.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ slotId?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  // A repeated query parameter arrives as an array; take the first value rather
  // than stringifying the array into an id that can never match a slot.
  const rawSlotId = Array.isArray(query?.slotId) ? query.slotId[0] : query?.slotId;

  return (
    <BookingWrapper>
      <DoctorBookingLoader doctorId={id} slotId={rawSlotId} />
    </BookingWrapper>
  );
}
