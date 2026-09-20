// components/PatientPicker.tsx
"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface PatientPickerProps {
  control: any;
  errors?: any;
  readOnly?: boolean;
  relationship?: string;
  className?: string;
  showPreferredName?: boolean;
  showPronoun?: boolean;
  labels?: {
    name?: string;
    preferredName?: string;
    pronoun?: string;
  };
}

export function PatientPicker({
  control,
  errors = {},
  readOnly = false,
  relationship,
  className,
  showPreferredName = true,
  showPronoun = true,
  labels = {},
}: PatientPickerProps) {
  const {
    name: nameLabel = "Full Name",
    preferredName: preferredNameLabel = "Preferred Name (optional)",
    pronoun: pronounLabel = "Preferred Pronoun (optional)",
  } = labels;

  const pronounOptions = [
    { value: "he/him", label: "He/Him" },
    { value: "she/her", label: "She/Her" },
    { value: "they/them", label: "They/Them" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Full Name */}
      <div>
        <Controller
          name="personalDetails.name"
          control={control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>
                {nameLabel}
                {relationship !== "other" && (
                  <span className="text-red-500">*</span>
                )}
              </FieldLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter full name"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                  className={cn(
                    "pl-9",
                    fieldState.invalid && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </div>
            </Field>
          )}
        />
        {errors?.personalDetails?.name && (
          <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
            {errors.personalDetails.name.message}
          </p>
        )}
      </div>

      {/* Preferred Name */}
      {showPreferredName && (
        <div>
          <Controller
            name="personalDetails.preferredName"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{preferredNameLabel}</FieldLabel>
                <Input
                  placeholder="Enter preferred name"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
              </Field>
            )}
          />
        </div>
      )}

      {/* Preferred Pronoun */}
      {showPronoun && (
        <div>
          <Controller
            name="personalDetails.preferredPronoun"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{pronounLabel}</FieldLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select pronoun" />
                  </SelectTrigger>
                  <SelectContent>
                    {pronounOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>
      )}
    </div>
  );
}