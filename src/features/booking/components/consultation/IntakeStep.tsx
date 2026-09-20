"use client";

import { AuthenticatedIntakeForm } from "./intake/AuthenticatedIntakeForm";
import { Booking } from "../../types/booking.types";
import { useQueryClient } from "@tanstack/react-query";

interface IntakeStepProps {
  booking: Booking;
  isReview: boolean;
}

export function IntakeStep({ booking, isReview }: IntakeStepProps) {
  const queryClient = useQueryClient();

  // Both queries decide the wizard step, so both must be re-read after submit:
  // the booking for its status, the intake for its `submitted` state.
  const handleIntakeComplete = () => {
    void queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
    void queryClient.invalidateQueries({
      queryKey: ["booking-intake", booking.id],
    });
  };

  return (
    <AuthenticatedIntakeForm
      booking={booking}
      onComplete={handleIntakeComplete}
      readOnly={isReview}
    />
  );
}
