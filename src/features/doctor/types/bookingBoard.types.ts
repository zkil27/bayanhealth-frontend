export type commsAppAvailable = "messenger" | "email" | "viber" | "whatsapp" | "sms" | "system";

/**
 * Doctor-dashboard "booking step" columns (`bookingSteps`, `BOOKING_STEP_LABELS`,
 * `BOOKING_STEP_ICON_MAP`, `bookingBoard`) were removed with the old
 * three-column board (Task 6 of the doctor-dashboard rebuild). Each still-live
 * capability moved to its own dedicated card:
 * - "booking requests" -> `IncomingRequestsCard`
 * - "ready intakes"     -> `ReadyToStartCard`
 * - "pending intakes"   -> deleted outright; `intakeQueueStatus` never
 *   actually reaches `in_progress` in the backend (see `IncomingRequestsCard`'s
 *   doc comment), so that column was permanently empty in production.
 * `patientBoardInfo` and `onAcceptBooking` below are still the real shared
 * shapes those cards and `usePatientBoard` pass between them.
 */

export type patientBoardInfo = {
  id: number;
  /** The real backend booking id, used for queue-process API calls. */
  bookingId: string;
  name: string;
  initials: string;
  avatar: string;
  isVerified: boolean;
  serviceRequested: string;
  timestamp: number; 
  commsAppPreferred: commsAppAvailable[];
  filesAttached: number;
  type: string;
  /**
   * Bounded chief-complaint excerpt from the patient's intake
   * (`IntakeQueueEntry.reasonExcerpt`). Absent when no intake form exists yet or
   * it carries no chief complaint.
   */
  reasonExcerpt?: string;
  /**
   * Intake completion status, carried alongside {@link reasonExcerpt} so a `draft`
   * excerpt can be labelled provisional rather than read as a finished account.
   */
  intakeFormStatus?: "draft" | "submitted" | "acknowledged";
  /** Communication channel from the Booking schema (`video` | `audio` | `chat`). */
  channel?: string;
  /** Consultation fee in minor currency units, from `Booking.amountCents`. */
  amountCents?: number;
  /** ISO 4217 currency code, from `Booking.currency`. */
  currency?: string;
  /**
   * How the booking was created, from `Booking.bookingMode`. Gates the
   * doctor-asserted no-show control (`ReadyToStartCard`) to `on_demand`
   * bookings only — a scheduled booking's patient did not agree to be
   * charged under that policy (ADR-20260808-03, ADR-20260909-01).
   */
  bookingMode?: string;
  /**
   * When a doctor accepted this booking, from `Booking.acceptedAt`. Anchors
   * the ten-minute mandatory wait before a no-show may be asserted. Absent
   * on a booking the auto-matcher assigned directly.
   */
  acceptedAt?: string;
};

export type onAcceptBooking = (patient: patientBoardInfo) => void | Promise<void>;