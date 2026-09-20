import { DynamicIntakeFormValues } from "../schemas/intakeSchema";

export type Service = {
  label: string;
  value:
    | "fit-for-work"
    | "fit-for-climb"
    | "fit-for-school"
    | "fit-for-travel"
    | "sick-leave"
    | "teleconsult";
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

export type Language = {
  value: string;
  label: string;
};

export type DoctorStatus = "available" | "busy" | "unavailable";
export type BookingType = "regular" | "scheduled" | "on-demand" | "intake-link";

export type DoctorPreferencesType = {
  genderPreferences: string[];
  languagePreferences: string[];
};

export type PatientBookingFormData = {
  serviceValue: string | null;
} & DoctorPreferencesType;

export type DoctorBookingFormData = {
  doctorStatus: DoctorStatus;
  bookingType: BookingType;
  serviceValue: string | null;
  scheduledDate?: Date;
};

export type BookingStep =
  | "finding"
  | "intake"
  | "payment"
  | "confirmation"
  | "appointment";

export interface Booking {
  id: string;
  step: BookingStep;
  /**
   * Backend booking status, carried through so a terminal step can tell
   * `completed` from `cancelled`.
   *
   * `step` cannot: both statuses map to the same terminal step, so the wizard had
   * no way to distinguish "your consultation is complete" from "this booking was
   * cancelled" and would have had to guess.
   */
  status?: string;
  /**
   * The doctor user ID who declined this booking (contract: `Booking.declinedBy`).
   * Present only when `status === "cancelled"` and the cancellation was a
   * doctor decline rather than a patient/admin cancellation — see
   * {@link CompletedStep}, the one consumer that branches on it.
   */
  declinedBy?: string;
  /**
   * The doctor's optional decline note (contract: `Booking.declineReason`).
   *
   * **In-app only.** Never sourced from or forwarded to an email/SMS body —
   * this field exists on the wizard's `Booking` solely so `CompletedStep` can
   * render it as plain text on this authenticated page.
   */
  declineReason?: string;
  /**
   * When a doctor accepted this booking (contract: `Booking.acceptedAt`).
   * Absent until accepted. Anchors the on-demand post-acceptance policy
   * windows (ADR-20260808-03): the two-minute full-refund grace period on
   * cancellation, and the ten-minute mandatory wait before a no-show.
   */
  acceptedAt?: string;
  /**
   * Present only when this `on_demand` booking was settled by a partial
   * capture — a late cancellation past the grace window, or a
   * doctor-asserted no-show (ADR-20260909-01, contract:
   * `Booking.settlementReason`). Absent on an ordinary, fully-refunded
   * cancellation.
   */
  settlementReason?: "late_cancellation" | "no_show" | string;
  patientId: string;
  doctorId: string;
  slotId?: string;
  scheduledDate: string;
  intakeData?: DynamicIntakeFormValues | null;
  paymentIntentId?: string;
  paymentStatus?: "pending" | "succeeded" | "failed";
  /** Server-owned consultation price in minor units; absent until priced. */
  amountCents?: number;
  /** ISO 4217 code that pairs with {@link amountCents}. */
  currency?: string;
  appointmentStart?: Date;
  createdAt: Date;
  updatedAt: Date;
  serviceRequested: Service["value"];
  genderPreference: string[];
  languagePreference: string[];
  bookingType: BookingType;
  /**
   * Assigned doctor's display name, resolved from
   * `GET /v1/doctors/{doctorId}` (`DoctorPublicSummary.fullName`). Empty while
   * no doctor is assigned or the summary has not resolved yet.
   *
   * `doctorRating`, `doctorHospital`, and `doctorDistance` used to live here and
   * were rendered from hard-coded defaults (4 stars, "Medical Center", "30 km
   * away"). The platform holds none of those, so they were removed rather than
   * defaulted — the UI must not present invented clinician attributes.
   */
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
}

/**
 * Doctor-matching progress derived from real booking state by `useFinding`.
 *
 * `progress` is presentation only — it maps the discrete backend stages
 * (awaiting payment / matching / assigned) onto the progress bar. It is never a
 * simulated ramp, and no doctor profile is fabricated here: the matched doctor
 * is read from the booking itself once `doctorId` is set.
 */
export interface FindingUpdate {
  progress: number;
  message: string;
  /** True once the backend has assigned a doctor; polling stops at this point. */
  resolved: boolean;
}
