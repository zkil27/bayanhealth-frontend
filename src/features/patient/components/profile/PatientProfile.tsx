"use client";

import { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { User, Users } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { PatientPicker } from "@/components/blocks/PatientPicker";

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "sibling", label: "Sibling" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
] as const;

const PATIENT_OPTIONS = [
  { value: "self" as const, icon: User, label: "Myself" },
  { value: "other" as const, icon: Users, label: "Someone else" },
] as const;

interface PatientProfileProps {
  readOnly?: boolean;
}

export default function PatientProfile({
  readOnly = false,
}: PatientProfileProps) {
  const { control, watch, setValue } = useFormContext();
  const patientType = watch("patientType");
  const relationship = watch("relationship");

  // Auto-fill patient name based on relationship (example logic)
  useEffect(() => {
    if (patientType === "self") {
      setValue("personalDetails.name", "");
      setValue("personalDetails.preferredName", "");
      setValue("personalDetails.preferredPronoun", "");
    }
  }, [patientType, setValue]);

  return (
    <FieldSet className="space-y-6">
      <FieldLegend className="text-lg font-semibold">
        Who is this for?
      </FieldLegend>
      <FieldDescription className="mb-4 text-xs text-muted-foreground">
        {readOnly ? "This profile is for:" : "Select the patient"}
      </FieldDescription>

      {/* Patient Selection Radio Group */}
      <FieldGroup>
        <Controller
          name="patientType"
          control={control}
          defaultValue="self"
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-2 gap-3"
              disabled={readOnly}
            >
              {PATIENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = field.value === option.value;

                return (
                  <Label
                    key={option.value}
                    htmlFor={`patient-${option.value}`}
                    className={`
                      group relative flex h-24 cursor-pointer flex-col items-center 
                      justify-center gap-2 rounded-xl border-2 border-border 
                      bg-card p-4 transition-all hover:border-border hover:shadow-sm
                      ${isSelected && "translate-y-1 border-primary bg-primary shadow-lg"}
                      ${readOnly && "cursor-default opacity-60"}
                    `}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`patient-${option.value}`}
                      className="absolute opacity-0"
                      disabled={readOnly}
                    />
                    <Icon
                      className={`
                        size-6 text-muted-foreground transition-colors
                        ${isSelected && "text-primary-foreground"}
                      `}
                    />
                    <span
                      className={`
                        text-sm font-medium text-secondary transition-colors
                        ${isSelected && "text-primary-foreground"}
                      `}
                    >
                      {option.label}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          )}
        />
      </FieldGroup>

      {/* Relationship Dropdown (only when "Someone else" is selected) */}
      {patientType === "other" && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Field>
            <FieldLabel>Relationship to patient</FieldLabel>
            <Controller
              name="relationship"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      )}

      {/* Patient Details Form */}
      <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <PatientPicker
          control={control}
          errors={{}}
          relationship={relationship}
          readOnly={readOnly}
          showPreferredName={true}
          showPronoun={true}
          labels={{
            name: patientType === "self" ? "Your Full Name" : "Patient's Full Name",
            preferredName: patientType === "self" ? "Your Preferred Name" : "Patient's Preferred Name",
            pronoun: patientType === "self" ? "Your Pronoun" : "Patient's Pronoun",
          }}
        />
      </div>

      {/* Read-only indicator */}
      {readOnly && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
          <span className="flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            Viewing in read-only mode
          </span>
        </div>
      )}
    </FieldSet>
  );
}