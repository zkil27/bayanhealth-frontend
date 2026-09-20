// components/consultation/intake/service-types/SickLeave.tsx
"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Calendar, Building2, AlertCircle, Utensils } from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { VitalsFields } from "../VitalsFields";

export function SickLeave({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();

  return (
    <BaseServiceForm
      icon={AlertCircle}
      title="Sick Leave Certification"
      description="Medical certificate for illness-related absence"
      styles={{
        border: "border-red-200",
        bg: "bg-red-50",
        text: "text-red-600",
      }}
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span>Start Date</span>
            <span className="text-xs text-red-500">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="requestDetails.startDate"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>End Date</FieldLabel>
          <FieldContent>
            <Controller
              name="requestDetails.endDate"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <span>Company / School Name</span>
            <span className="text-xs text-red-500">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="requestDetails.companyOrSchoolName"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Enter company or school name"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Department / Grade Level</FieldLabel>
          <FieldContent>
            <Controller
              name="requestDetails.departmentOrGrade"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Department or grade level"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldContent className="flex flex-row items-center gap-3">
            <Controller
              name="requestDetails.unableToWork"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
            <FieldLabel className="mb-0">
              I confirm that my condition prevents me from working/studying
              <span className="text-xs text-red-500">*</span>
            </FieldLabel>
          </FieldContent>
        </Field>

        <Field>
          <FieldContent className="flex flex-row items-center gap-3">
            <Controller
              name="requestDetails.isFoodHandler"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={readOnly}
                />
              )}
            />
            <FieldLabel className="mb-0 flex items-center gap-2">
              <Utensils className="size-4 text-muted-foreground" />I work as a food
              handler
            </FieldLabel>
          </FieldContent>
        </Field>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Symptom Details</h3>

          <Field>
            <FieldLabel>Chief Complaint</FieldLabel>
            <FieldContent>
              <Controller
                name="requestDetails.symptomDetails.chiefComplaint"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="e.g., Fever, cough"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Onset</FieldLabel>
            <FieldContent>
              <Controller
                name="requestDetails.symptomDetails.onset"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="When did symptoms start?"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Symptom Description</FieldLabel>
            <FieldContent>
              <Controller
                name="requestDetails.symptomDetails.characteristics"
                control={control}
                render={({ field }) => (
                  <Textarea
                    placeholder="Describe your symptoms..."
                    className="min-h-[100px] bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                )}
              />
            </FieldContent>
          </Field>

          <div className="mt-4">
            <VitalsFields
              namePrefix="requestDetails.symptomDetails.vitals"
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </BaseServiceForm>
  );
}
