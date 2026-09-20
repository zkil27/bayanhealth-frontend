import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DoctorBookingSchema,
  DoctorBookingFormValues,
} from "../schemas/bookingSchema";

/**
 * Form state for booking a named doctor.
 *
 * @param initialDoctorStatus - Drives the default booking type when the patient
 *   has not already picked a slot.
 * @param defaultServiceType  - Service carried over from the entry point, if any.
 * @param initialScheduledAt  - Start time of the slot the patient picked on the
 *   doctor detail page, already validated against the doctor's real slots by
 *   `DoctorBookingLoader`. When present the form opens as a `scheduled` booking
 *   with that time selected, so the patient does not pick the same time twice.
 *   When absent the form opens unselected — an unknown or stale `slotId` must
 *   not be turned into a guessed time.
 */
export function useDoctorBookingForm(
  initialDoctorStatus: "available" | "busy" | "unavailable" = "busy",
  defaultServiceType?: string | null,
  initialScheduledAt?: Date,
) {
  const getDefaultBookingType = () => {
    // A resolved slot is a scheduled booking by definition: the patient chose a
    // specific time, and only the `scheduled` branch of the schema carries one.
    if (initialScheduledAt) return "scheduled";
    if (initialDoctorStatus === "available") return "scheduled";
    if (initialDoctorStatus === "busy") return "regular";
    return "regular";
  };

  const serviceType = defaultServiceType || "";
  // The schema is a discriminated union, so the defaults have to be built on one
  // branch or the other — `scheduledDate` only exists on `scheduled`.
  const defaultValues: DefaultValues<DoctorBookingFormValues> =
    getDefaultBookingType() === "scheduled"
      ? { bookingType: "scheduled", serviceType, scheduledDate: initialScheduledAt }
      : { bookingType: "regular", serviceType, scheduledDate: undefined };

  const form = useForm<DoctorBookingFormValues>({
    resolver: zodResolver(DoctorBookingSchema),
    defaultValues,
    mode: "onChange",
  });

  return {
    ...form,
  };
}
