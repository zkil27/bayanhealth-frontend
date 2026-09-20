"use client";

import { ArrowUpRightIcon, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider } from "react-hook-form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { BookingNavBar } from "../BookingNavBar";
import { FormSection } from "../FormSection";
import { BookingServiceSelect } from "../BookingServiceSelect";
import { BookingSummary } from "../BookingSummary";
import { DoctorAvailability } from "./DoctorAvailabilty";
import { DateTimePicker } from "../DateTimePicker";
import { useDoctorBookingForm } from "../../hooks/useDoctorBookingForm";
import type { DoctorBookingFormValues } from "../../schemas/bookingSchema";
import { useCreateBooking } from "../../hooks/useCreateBooking";
import AppButton from "@/components/primitives/AppButton";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { DOCTOR_STATUS_MAP } from "../../constants/bookingConstants";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface DoctorBookingPageProps {
  doctorId?: string;
  doctorName: string;
  initialDoctorStatus: "available" | "busy" | "unavailable";
  /**
   * The doctor's real open slot times, projected from
   * `GET /v1/doctors/{doctorId}/schedules`. When empty the picker offers no
   * times rather than falling back to an invented window.
   */
  availableTimes?: string[];
  defaultServiceType?: string | null;
  /**
   * Start time of the slot the patient already picked on the doctor detail page,
   * already resolved against the doctor's real slots by `DoctorBookingLoader`.
   * Absent when no `slotId` was supplied or it matched no available slot, in
   * which case the date/time field opens unselected as before.
   */
  initialScheduledAt?: Date;
  /**
   * The slot id backing {@link initialScheduledAt}, already confirmed by
   * `DoctorBookingLoader` to be one of this doctor's available slots. Sent with
   * the booking so the backend reserves that slot atomically — see `onSubmit`
   * for why it is dropped when the patient edits the time.
   */
  slotId?: string;
}

export function DoctorBookingPage({
  doctorId,
  doctorName,
  initialDoctorStatus,
  availableTimes,
  defaultServiceType,
  initialScheduledAt,
  slotId,
}: DoctorBookingPageProps) {
  const router = useRouter();
  const form = useDoctorBookingForm(
    initialDoctorStatus,
    defaultServiceType,
    initialScheduledAt,
  );
  const { submit, status, error } = useCreateBooking();

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
    watch,
  } = form;

  const bookingType = watch("bookingType");
  const isCreating = isSubmitting || status === "submitting";

  const onSubmit = async (data: DoctorBookingFormValues) => {
    // Real `POST /v1/bookings`; the chosen doctor becomes `preferredDoctorId`
    // (assignment stays server-side and admin-only per ADR-20260726-01).
    //
    // `slotId` is only sent when the time being submitted is still the slot's own
    // start time. The picker lets the patient change the time after arriving from
    // `?slotId=`, and sending the id alongside a different time would reserve a
    // slot the patient is no longer asking for — the backend derives the stored
    // time from the slot, so the booking would land on the original slot's time
    // and silently ignore the edit.
    const submittedAt = data.scheduledDate?.getTime();
    const slotStillChosen =
      slotId !== undefined &&
      submittedAt !== undefined &&
      submittedAt === initialScheduledAt?.getTime();
    try {
      const createdBooking = await submit({
        serviceValue: data.serviceType,
        // Named rather than defaulted: this path books a specific doctor at a
        // specific published time, so it must never enter the on-demand pool.
        bookingMode: "scheduled",
        scheduledAt: data.scheduledDate?.toISOString(),
        preferredDoctorId: doctorId,
        ...(slotStillChosen ? { slotId } : {}),
      });
      router.push(`/patient/booking/getBooking/${createdBooking.bookingId}`);
    } catch {
      // useCreateBooking already exposes the typed code/message; it is rendered
      // below the submit button. Retrying reuses the same Idempotency-Key.
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto flex w-full max-w-2xl flex-col gap-y-1 pb-10 lg:pb-4"
      >
      {/*
       * This screen is only ever reached from the doctor's own page
       * (`/patient/booking/doctor/{doctorId}` → "Book appointment"), so the back
       * control returns there — to the slot list the patient was just on —
       * rather than defaulting to the booking directory and skipping a step.
       */}
      <BookingNavBar
        header={"Booking Consultation"}
        backHref={doctorId ? `/patient/booking/doctor/${doctorId}` : "/patient/booking"}
      />

        <div className="flex w-full flex-col items-center justify-center gap-4 p-4">
          <FieldGroup>
            <FormSection
              icon={<Ticket className="h-4 w-4" />}
              title={`Book Appointment With ${doctorName}`}
            />
            {initialDoctorStatus !== "available" && (
              <div className="flex w-full justify-end">
                <Badge
                  render={
                    <Link href="/patient/booking/search">
                      Find another doctor?
                      <ArrowUpRightIcon data-icon="inline-end" />
                    </Link>
                  }
                />
              </div>
            )}
            <FieldSet className="space-y-4">
              <Controller
                name="bookingType"
                control={control}
                render={({ field, fieldState }) => {
                  return (
                    <Field>
                      <FieldLegend>{`Doctor's Availability`}</FieldLegend>
                      <FieldDescription>
                        {DOCTOR_STATUS_MAP[initialDoctorStatus]}
                      </FieldDescription>

                      <DoctorAvailability
                        doctorStatus={initialDoctorStatus}
                        bookingType={field.value}
                        onBookingTypeChange={field.onChange}
                      />
                      {fieldState.invalid && (
                        <AnimatedFieldError error={fieldState.error} />
                      )}
                    </Field>
                  );
                }}
              />

              <Controller
                name="serviceType"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Consultation Service</FieldLabel>
                    <FieldContent>
                      <BookingServiceSelect
                        value={field.value}
                        onChange={field.onChange}
                        triggerWidth="w-full"
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                  </Field>
                )}
              />

              {bookingType === "scheduled" && (
                <Controller
                  name="scheduledDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="animate-in duration-300 fade-in slide-in-from-top-4">
                      {/*
                       * A doctor *is* in scope here, so the empty state can name
                       * one. `availableTimes` is defaulted to an empty array
                       * rather than left undefined because the picker's prop type
                       * requires the times whenever it asks for one.
                       */}
                      <DateTimePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        availableTimes={availableTimes ?? []}
                        noTimesMessage="This doctor has no published times for this date. Pick another date or doctor, or request a consultation without a preferred time."
                      />
                      {fieldState.error && (
                        <p className="mt-1 text-xs text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              )}
            </FieldSet>

            <FormSection
              icon={<Ticket className="h-4 w-4" />}
              title="Booking Summary"
            />

            <BookingSummary />
          </FieldGroup>

          <div className="mt-2 w-full">
            <AppButton
              type="submit"
              disabled={!isValid || isCreating}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Ticket className="h-4 w-4" />
              {isCreating ? "Creating Booking..." : "Book Appointment"}
            </AppButton>
            {error && (
              <p
                role="alert"
                className="mt-2 text-center text-xs text-destructive"
              >
                {error.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
