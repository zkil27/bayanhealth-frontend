"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  Baby,
  School,
  Hash,
  GraduationCap,
  Landmark,
  Award,
  DoorOpen,
  Trophy,
  Home,
  Bus,
  Heart,
} from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { BookingServiceSelect } from "../../../BookingServiceSelect";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";

export function FitForSchool({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();
  const academicLevelOptions = [
    { value: "preschool", label: "Preschool", icon: Baby },
    { value: "elementary", label: "Elementary", icon: School },
    { value: "high-school", label: "High School", icon: GraduationCap },
    { value: "university", label: "University", icon: Landmark },
    { value: "post-grad", label: "Post Graduate", icon: Award },
  ];

  const purposeOptions = [
    { value: "admission", label: "Admission", icon: DoorOpen },
    { value: "sports-varsity", label: "Sports / Varsity", icon: Trophy },
    { value: "dormitory-clearance", label: "Dormitory Clearance", icon: Home },
    { value: "field-trip", label: "Field Trip", icon: Bus },
    { value: "return-from-illness", label: "Return from Illness", icon: Heart },
  ];
  return (
    <BaseServiceForm
      icon={GraduationCap}
      title="Fit for School Clearance"
      description="Medical clearance for academic institutions"
      styles={{
        border: "border-green-200",
        bg: "bg-green-50",
        text: "text-green-600",
      }}
    >
      <Controller
        name="requestDetails.purpose"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Purpose</FieldLabel>
            <FieldContent>
              <BookingServiceSelect
                value={field.value}
                onChange={field.onChange}
                triggerWidth="w-full"
                variant="simple"
                label="Certificate Purpose"
                options={purposeOptions}
              />
            </FieldContent>{" "}
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
      <Controller
        name="requestDetails.schoolName"
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              <span>School Name</span>
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                placeholder="Enter school name"
                className="h-11 bg-background"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={readOnly}
              />
              {fieldState.invalid && (
                <AnimatedFieldError error={fieldState.error} />
              )}
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        name="requestDetails.studentIdNumber"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" />
              <span>Student ID Number (Optional)</span>
            </FieldLabel>
            <FieldContent>
              <Input
                placeholder="Enter student ID"
                className="h-11 bg-background"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={readOnly}
              />
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        name="requestDetails.academicLevel"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Academic Level</FieldLabel>
            <FieldContent>
              <BookingServiceSelect
                value={field.value}
                onChange={field.onChange}
                triggerWidth="w-full"
                variant="simple"
                label="Student Academic Level"
                options={academicLevelOptions}
              />
            </FieldContent>
          </Field>
        )}
      />
    </BaseServiceForm>
  );
}
