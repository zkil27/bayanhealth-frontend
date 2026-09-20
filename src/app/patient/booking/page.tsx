import { BookingPathChooser } from "@/features/booking/components/patient/BookingPathChooser";

/**
 * `/patient/booking` — the Book tab's landing.
 *
 * This route used to *be* the scheduled path: `BookingDirectoryHeader` ("Book
 * for later") over the doctor directory, with a secondary card offering Consult
 * Now. Tapping the Book tab therefore committed the patient to one of the two
 * consultation paths before they had been shown that there were two — and the
 * home hero already offered both, so the choice was presented twice and owned
 * nowhere.
 *
 * The tab now owns the choice ({@link BookingPathChooser}) and the directory
 * moved one level deeper to `/patient/booking/search`, which already existed as the
 * deep-link target for guided rebooking (`lib/rebookingUrl.ts`) and rendered the
 * same {@link DoctorSearchPanel}.
 *
 * No Suspense boundary is needed here any more: the chooser reads no query
 * string. `/patient/booking/search` keeps the one its filter state requires
 * (ADR-20260806-02).
 */
export default function Page() {
  return <BookingPathChooser />;
}
