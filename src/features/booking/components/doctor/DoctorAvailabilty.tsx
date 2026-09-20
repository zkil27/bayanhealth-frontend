import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Timer, CalendarIcon } from "lucide-react";
import { DoctorStatus, BookingType } from "../../types/booking.types";
import { cn } from "@/lib/utils";

type DoctorAvailabilityProps = {
  doctorStatus: DoctorStatus;
  bookingType: BookingType;
  onBookingTypeChange: (value: BookingType) => void;
};

export function DoctorAvailability({
  doctorStatus,
  bookingType,
  onBookingTypeChange,
}: DoctorAvailabilityProps) {
  return (
    <>
      <RadioGroup
        value={bookingType}
        onValueChange={onBookingTypeChange}
        className="max-w-sm grid-cols-2 md:max-w-none"
      >
        {doctorStatus !== "unavailable" ? (
          <FieldLabel
            htmlFor="doctor-booking-plan"
            className="group transition-all duration-300 has-data-checked:translate-y-1 has-data-checked:bg-primary has-data-checked:text-primary-foreground has-data-checked:shadow-lg"
          >
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>
                  <Timer />
                  {doctorStatus === "busy" ? "Queue" : "Book"}
                </FieldTitle>
                <FieldDescription className="transition-all duration-300 group-has-data-checked:font-semibold group-has-data-checked:text-primary-foreground">
                  Book a Doctor Consultation Now.
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem
                value="doctor-booking"
                id="doctor-booking-plan"
                className={cn(
                  doctorStatus === "busy"
                    ? "data-checked:border-status-pending data-checked:bg-status-pending"
                    : "data-checked:bg-primary",
                )}
              />
            </Field>
          </FieldLabel>
        ) : (
          <div className="opacity-50">
            <div className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Timer />
                  <span className="flex w-fit items-center gap-2 text-sm font-medium">
                    Regular
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Book a Doctor Consultation Now.
                </p>
              </div>
            </div>
          </div>
        )}
        <FieldLabel
          htmlFor="scheduled-plan"
          className="group transition-all duration-300 has-data-checked:translate-y-1 has-data-checked:bg-primary has-data-checked:text-primary-foreground has-data-checked:shadow-lg"
        >
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>
                <CalendarIcon />
                Scheduled
              </FieldTitle>
              <FieldDescription className="p-2 transition-all duration-300 group-has-data-checked:font-semibold group-has-data-checked:text-primary-foreground">
                Schedule a Consultation at a given Time.
              </FieldDescription>
            </FieldContent>
            <RadioGroupItem value="scheduled" id="scheduled-plan" />
          </Field>
        </FieldLabel>
      </RadioGroup>
    </>
  );
}
