"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Red-flag screening questions (ADR-20260806-01).
 *
 * These three answers are the only structured clinical input the deterministic
 * red-flag router can act on. Everything else the patient types is free text,
 * and the router matches rules against named fields — an absent field is simply
 * "no match", so without these questions every consultation routes ROUTINE no
 * matter what the patient wrote.
 *
 * Deliberately three states per question, not a checkbox. A checkbox cannot
 * express "not answered", and defaulting an unanswered safety question to "no"
 * is precisely the failure this exists to prevent. Leaving a question blank is
 * allowed and is carried through as unanswered.
 */
export function SafetyScreenFields({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();

  return (
    <FieldGroup>
      <Field>
        <FieldLegend className="flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          Quick safety check
        </FieldLegend>
        <FieldDescription>
          Your doctor reviews these first. Answer only what you&apos;re sure
          about — it&apos;s fine to leave one blank.
        </FieldDescription>
      </Field>

      <Controller
        name="requestDetails.safetyScreen.chestPain"
        control={control}
        render={({ field }) => (
          <YesNoField
            label="Do you have chest pain or pressure in your chest?"
            value={field.value as boolean | undefined}
            onChange={field.onChange}
            disabled={readOnly}
          />
        )}
      />

      <Controller
        name="requestDetails.safetyScreen.dyspnea"
        control={control}
        render={({ field }) => (
          <YesNoField
            label="Are you having difficulty breathing or shortness of breath?"
            value={field.value as boolean | undefined}
            onChange={field.onChange}
            disabled={readOnly}
          />
        )}
      />

      <Controller
        name="requestDetails.safetyScreen.feverDays"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>How many days have you had a fever?</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                placeholder="Enter 0 if you have no fever"
                className="h-11 bg-background"
                value={
                  field.value === undefined || field.value === null
                    ? ""
                    : String(field.value)
                }
                onChange={(event) => {
                  const raw = event.target.value;
                  // An empty box means "not answered", so it must clear back to
                  // undefined rather than settle on 0 — 0 is the real answer
                  // "no fever" and the two must stay distinguishable.
                  field.onChange(raw === "" ? undefined : Number(raw));
                }}
                disabled={readOnly}
              />
            </FieldContent>
            <FieldDescription>
              Leave blank if you&apos;re not sure. Enter 0 if you have no fever.
            </FieldDescription>
          </Field>
        )}
      />
    </FieldGroup>
  );
}

/**
 * Three-state answer control: Yes, No, or untouched.
 *
 * Selecting the active option again clears it back to unanswered, so a patient
 * who taps by mistake can retract rather than being locked into a clinical
 * assertion they did not mean to make.
 */
function YesNoField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (next: boolean | undefined) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2" role="group" aria-label={label}>
          <AnswerButton
            selected={value === true}
            tone="alert"
            disabled={disabled}
            onClick={() => onChange(value === true ? undefined : true)}
          >
            Yes
          </AnswerButton>
          <AnswerButton
            selected={value === false}
            tone="neutral"
            disabled={disabled}
            onClick={() => onChange(value === false ? undefined : false)}
          >
            No
          </AnswerButton>
          {value === undefined ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Not answered
            </Badge>
          ) : null}
        </div>
      </FieldContent>
    </Field>
  );
}

function AnswerButton({
  selected,
  tone,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  tone: "alert" | "neutral";
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 min-w-20 rounded-md border px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected && tone === "alert"
          ? "border-destructive bg-destructive text-white"
          : selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
