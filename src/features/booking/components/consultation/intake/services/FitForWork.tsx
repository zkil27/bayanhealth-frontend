"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  Activity,
  Briefcase,
  GraduationCap,
  Phone,
  RefreshCw,
  Target,
  User,
} from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { BookingServiceSelect } from "../../../BookingServiceSelect";

export function FitForWork({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();
  const purposeOptions = [
    {
      value: "pre-employment",
      label: "Pre-Employment",
      icon: Briefcase,
    },
    {
      value: "annual-physical",
      label: "Annual Physical",
      icon: Activity,
    },
    {
      value: "return-to-work",
      label: "Return to Work",
      icon: RefreshCw,
    },
    {
      value: "ojt-requirement",
      label: "OJT Requirement",
      icon: GraduationCap,
    },
  ];
  return (
    <BaseServiceForm
      icon={Briefcase}
      title="Fit to Work Certification"
      description="Official medical clearance for employment requirements"
      styles={{
        border: "border-blue-200",
        bg: "bg-blue-50",
        text: "text-blue-600",
      }}
    >
      <Controller
        name="requestDetails.purpose"
        control={control}
        render={({ field }) => {
          return (
            <Field className="w-full">
              <FieldLabel className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                Purpose of Certification
              </FieldLabel>
              <BookingServiceSelect
                value={field.value}
                onChange={field.onChange}
                triggerWidth="w-full"
                variant="simple"
                label="Certificate Purpose"
                options={purposeOptions}
              />
            </Field>
          );
        }}
      />

      <Controller
        name="requestDetails.companyName"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Briefcase className="size-4 text-muted-foreground" />
              <span>Company Name</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <Input
              placeholder="Enter company name"
              className="h-11 bg-background"
              value={field.value || ""}
              onChange={field.onChange}
              disabled={readOnly}
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="requestDetails.position"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>
              <User className="size-4 text-muted-foreground" />
              Position / Role
            </FieldLabel>
            <Input
              placeholder="Enter your position"
              className="h-11 bg-background"
              value={field.value || ""}
              onChange={field.onChange}
              disabled={readOnly}
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="requestDetails.employerContact"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <span>Employer Contact</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <Input
              placeholder="Company phone or email"
              className="h-11 bg-background"
              value={field.value || ""}
              onChange={field.onChange}
              disabled={readOnly}
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
    </BaseServiceForm>
  );
}
