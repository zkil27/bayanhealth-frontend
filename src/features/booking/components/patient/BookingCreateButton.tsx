"use client";

import { useEffect } from "react";
import { CheckCircle2, Ticket } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useCreateBooking } from "../../hooks/useCreateBooking";
import type { BookingFormInput } from "../../lib/createBookingRequest";

interface BookingCreateButtonProps {
  /** Current form values used to build the `CreateBookingRequest`. */
  formInput: BookingFormInput;
}

/** Render a booking status value as a readable label (e.g. `pending_payment`). */
function humanizeStatus(status: string): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Submit control for the patient on-demand booking flow.
 *
 * Replaces the previous mock navigation: on click it calls `POST /v1/bookings`
 * through {@link useCreateBooking}. On success it shows the booking id and
 * `pending_payment` status; on error it shows the error envelope's message,
 * retains the form input, and allows a retry that reuses the Idempotency-Key
 * (Requirements 8.1, 8.2, 8.7).
 */
export function BookingCreateButton({ formInput }: BookingCreateButtonProps) {
  const { submit, status, booking, error } = useCreateBooking();

  useEffect(() => {
    if (status === "error" && error) {
      toast.error("Couldn't create your booking", { description: error.message });
    }
  }, [status, error]);

  if (status === "success" && booking) {
    return (
      <Alert data-slot="booking-create-success">
        <CheckCircle2 className="text-primary" />
        <AlertTitle>Booking created</AlertTitle>
        <AlertDescription>
          <span className="font-mono">{booking.bookingId}</span>
          <span> · {humanizeStatus(booking.status)}</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-2">
      {status === "error" && error ? (
        <span
          role="alert"
          data-slot="booking-create-error"
          className="sr-only"
        >
          {error.message}
        </span>
      ) : null}

      <button
        type="button"
        disabled={status === "submitting"}
        onClick={() => {
          void submit(formInput);
        }}
        className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Spinner className="size-4" />
            Booking…
          </>
        ) : (
          <>
            <Ticket />
            {status === "error" ? "Try again" : "Book"}
          </>
        )}
      </button>
    </div>
  );
}
