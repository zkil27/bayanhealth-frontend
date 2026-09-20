"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/primitives/PasswordInputToggle";

interface SignUpCredentialsProps {
  isSubmitting: boolean;
}

export function SignUpCredentials({ isSubmitting }: SignUpCredentialsProps) {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-3">
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor={field.name}
              className="block text-sm font-medium"
            >
              Email Address
            </FieldLabel>
            <FieldDescription className="text-xs italic">
              We&apos;ll send a verification code after account creation. Account
              creation submits only your email, password, and selected role.
            </FieldDescription>
            <Input
              {...field}
              id={field.name}
              type="email"
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              value={field.value ?? ""}
              placeholder="yourEmail@email.com"
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />


      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor={field.name}
              className="block text-sm font-medium"
            >
              Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              className="placeholder:text-muted-foreground/60"
              value={field.value ?? ""}
              placeholder="••••••••"
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
      <div className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-secondary">
        <ShieldCheck />
        <span>
          Password must be at least 10 characters with uppercase, lowercase, and
          numbers
        </span>
      </div>
      <Controller
        name="confirmPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor={field.name}
              className="block text-sm font-medium"
            >
              Confirm Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              value={field.value ?? ""}
              className="placeholder:text-muted-foreground/60"
              placeholder="••••••••"
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
    </div>
  );
}
