"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { Mail, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/primitives/PasswordInputToggle";

interface SignUpCredentialsProps {
  isSubmitting: boolean;
}

export function SignUpCredentials({ isSubmitting }: SignUpCredentialsProps) {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-2.5 py-0.5">
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <FieldLabel
              htmlFor={field.name}
              className="text-xs font-semibold text-foreground"
            >
              Email Address
            </FieldLabel>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
              <Input
                {...field}
                id={field.name}
                type="email"
                inputMode="email"
                disabled={isSubmitting}
                aria-invalid={fieldState.invalid}
                value={field.value ?? ""}
                placeholder="name@example.com"
                className="h-11 pl-10 text-[16px] sm:text-sm"
              />
            </div>
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
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <FieldLabel
              htmlFor={field.name}
              className="text-xs font-semibold text-foreground"
            >
              Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              className="h-11 text-[16px] sm:text-sm placeholder:text-muted-foreground/60"
              value={field.value ?? ""}
              placeholder="••••••••"
            />
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <ShieldCheck className="size-3.5 shrink-0 text-primary" />
              <span>Min 10 characters with uppercase, lowercase &amp; numbers</span>
            </div>
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1">
            <FieldLabel
              htmlFor={field.name}
              className="text-xs font-semibold text-foreground"
            >
              Confirm Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              value={field.value ?? ""}
              className="h-11 text-[16px] sm:text-sm placeholder:text-muted-foreground/60"
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
