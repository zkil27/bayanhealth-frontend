"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Plane, Calendar, Clock, Ship, Bus, Globe } from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { BookingServiceSelect } from "../../../BookingServiceSelect";
import { DatePicker } from "../../../DateTimePicker";
import { format } from "date-fns";
import { FormSection } from "../../../FormSection";
import { TWO_YEARS_FROM_NOW, YESTERDAY } from "@/lib/utils";

export function FitForTravel({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();
  const transportOptions = [
    { value: "flight", label: "Flight / Air", icon: Plane },
    { value: "sea-cruise", label: "Sea / Cruise", icon: Ship },
    { value: "land-bus", label: "Land / Bus", icon: Bus },
    { value: "other", label: "Other", icon: Globe },
  ];
  const verificationOptions = [
    {
      name: "requiresVaccineVerification",
      label: "Requires vaccine verification (Yellow Card, Polio, etc.)",
    },
    {
      name: "medicationSupplyConfirmed",
      label: "Adequate medication supply confirmed for travel duration",
    },
  ];

  return (
    <BaseServiceForm
      icon={Plane}
      title="Fit to Travel Certification"
      description="Medical clearance for international or domestic travel"
      styles={{
        border: "border-cyan-200",
        bg: "bg-cyan-50",
        text: "text-cyan-600",
      }}
    >
      <Controller
        name="requestDetails.destinationCountry"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Plane className="size-4 text-muted-foreground" />
              <span>Destination Country / Place</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                placeholder="Enter country / place"
                className="h-11 bg-background"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={readOnly}
              />
            </FieldContent>{" "}
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="requestDetails.departureDate"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span>Departure Date</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <FieldContent>
              <DatePicker
                date={field.value}
                onDateChange={(date) =>
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                }
                minDate={YESTERDAY}
                maxDate={TWO_YEARS_FROM_NOW}
                icon={Plane}
              />
            </FieldContent>
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="requestDetails.travelDurationDays"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span>Travel Duration (Days)</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min="1"
                placeholder="Number of days"
                className="h-11 bg-background"
                value={field.value || ""}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                disabled={readOnly}
              />
            </FieldContent>{" "}
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="requestDetails.modeOfTransport"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Mode of Transport</FieldLabel>
            <FieldContent>
              <BookingServiceSelect
                value={field.value}
                onChange={field.onChange}
                triggerWidth="w-full"
                variant="simple"
                label="What will you be using for transportation?"
                options={transportOptions}
              />
            </FieldContent>
          </Field>
        )}
      />

      <FieldGroup className="flex animate-in flex-col gap-4 duration-300 fade-in slide-in-from-top-4">
        <FormSection title="Travel Additional Requirements" />

        <p className="text-sm text-muted-foreground">
          Please confirm the following for your travel:
        </p>

        {verificationOptions.map((option) => (
          <Controller
            key={option.name}
            name={`requestDetails.${option.name}`}
            control={control}
            render={({ field }) => (
              <Field>
                <FieldContent className="flex flex-row items-center justify-between">
                  <FieldLabel htmlFor={option.label}>{option.label}</FieldLabel>
                  <Checkbox
                    id={option.label}
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    disabled={readOnly}
                    className="border-secondary"
                  />
                </FieldContent>
              </Field>
            )}
          />
        ))}
      </FieldGroup>
    </BaseServiceForm>
  );
}
