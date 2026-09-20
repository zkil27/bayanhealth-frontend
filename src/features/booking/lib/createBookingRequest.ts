/**
 * Pure mapping from the patient on-demand booking form to the contract-frozen
 * `CreateBookingRequest` body for `POST /v1/bookings`.
 *
 * The backend contract (contracts/openapi.yaml#CreateBookingRequest) requires
 * `serviceType`, `scheduledAt`, and `channel`; `notes` and `preferredDoctorId`
 * are optional. No field outside that schema is ever sent (Requirement 15 —
 * the backend is contract-frozen).
 */

/** Service types accepted by the backend (openapi enum). */
export type ServiceType = "general" | "specialist" | "follow_up" | "emergency";

/** Consultation channels accepted by the backend (openapi enum). */
export type BookingChannel = "video" | "audio" | "chat";

/** The exact request body shape for `POST /v1/bookings`. */
/** contract: CreateBookingRequest.bookingMode */
export type BookingMode = "scheduled" | "on_demand";

export interface CreateBookingRequest {
  serviceType: ServiceType;
  scheduledAt: string;
  channel: BookingChannel;
  /**
   * How the booking is fulfilled.
   *
   * Always sent explicitly, never left to the backend default. The backend
   * defaults an absent value to `scheduled`, and because no client ever sent this
   * field, **every** booking the product created was `scheduled` — which made the
   * on-demand request pool permanently empty and the patient waiting screen
   * unreachable, even with `ON_DEMAND_POOL_ENABLED` on. Sending it explicitly on
   * both paths means the mode is a stated intention rather than a default nobody
   * chose.
   */
  bookingMode: BookingMode;
  notes?: string;
  preferredDoctorId?: string;
  /**
   * Schedule slot to reserve. The backend moves it to `booked` in the same
   * transaction that writes the booking, and derives the authoritative
   * `scheduledAt` from it. Only sent alongside `preferredDoctorId`, which the
   * contract requires, and only when the patient is still booking the slot they
   * picked — see `DoctorBooking`.
   */
  slotId?: string;
}

/** Form inputs the on-demand booking flow can supply. */
export interface BookingFormInput {
  serviceValue?: string | null;
  channel?: BookingChannel;
  /**
   * Fulfilment mode. Defaults to `scheduled` when a caller does not say, which
   * matches the backend default and keeps the slot-picking path unchanged.
   */
  bookingMode?: BookingMode;
  notes?: string;
  preferredDoctorId?: string;
  /** Scheduled time; defaults to "shortly from now" for on-demand bookings. */
  scheduledAt?: string;
  /**
   * The slot the patient picked on the doctor detail page, carried through
   * `?slotId=`. Dropped when `preferredDoctorId` is absent, because the contract
   * cannot locate a slot without its doctor and the backend would reject it.
   */
  slotId?: string;
}

const VALID_SERVICE_TYPES: ReadonlySet<string> = new Set<ServiceType>([
  "general",
  "specialist",
  "follow_up",
  "emergency",
]);

/** Map an arbitrary form service value to a valid `ServiceType`, defaulting to `general`. */
export function toServiceType(value: string | null | undefined): ServiceType {
  if (value && VALID_SERVICE_TYPES.has(value)) {
    return value as ServiceType;
  }
  return "general";
}

/**
 * Build the `CreateBookingRequest` body from the booking form.
 *
 * For on-demand bookings without an explicit time, `scheduledAt` is set a short
 * interval in the future to satisfy the contract's "must be in the future" rule.
 *
 * @param input - The form inputs.
 * @param now   - Current epoch millis (injectable for deterministic tests).
 */
export function buildCreateBookingRequest(
  input: BookingFormInput,
  now: number = Date.now(),
): CreateBookingRequest {
  const scheduledAt =
    input.scheduledAt ?? new Date(now + 60_000).toISOString();

  const body: CreateBookingRequest = {
    serviceType: toServiceType(input.serviceValue),
    scheduledAt,
    channel: input.channel ?? "video",
    bookingMode: input.bookingMode ?? "scheduled",
  };

  const notes = input.notes?.trim();
  if (notes) {
    body.notes = notes;
  }
  if (input.preferredDoctorId) {
    body.preferredDoctorId = input.preferredDoctorId;
  }
  // `slotId` without `preferredDoctorId` is a request the backend must reject —
  // a slot lives in its doctor's partition and cannot be found without one. Drop
  // it here rather than sending a 422 the patient can do nothing about.
  if (input.slotId && input.preferredDoctorId) {
    body.slotId = input.slotId;
  }

  return body;
}
