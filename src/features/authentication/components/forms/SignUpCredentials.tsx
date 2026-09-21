"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { Mail, ShieldCheck } from "lucide-react";
import { PasswordInput } from "@/components/primitives/PasswordInputToggle";
import { cn } from "@/lib/utils";

interface SignUpCredentialsProps {
  isSubmitting: boolean;
}

export function SignUpCredentials({ isSubmitting }: SignUpCredentialsProps) {
  const { control, watch } = useFormContext();
  const password = watch("password") || "";

  // Check if password passes the standard: Min 10 characters with uppercase, lowercase & numbers
  const isPasswordPassing = Boolean(
    password &&
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-4.5 py-1">
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel
              htmlFor={field.name}
              className="text-sm font-semibold text-foreground"
            >
              Email
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
                className="h-11 sm:h-12 pl-10 text-[16px] sm:text-sm rounded-xl"
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
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel
              htmlFor={field.name}
              className="text-sm font-semibold text-foreground"
            >
              Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              className="h-11 sm:h-12 text-[16px] sm:text-sm placeholder:text-muted-foreground/60 rounded-xl"
              value={field.value ?? ""}
              placeholder="••••••••"
            />
            {!isPasswordPassing && (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[11px] pt-0.5 transition-all duration-200",
                  password.length > 0
                    ? "text-amber-600 dark:text-amber-400 font-medium"
                    : "text-muted-foreground",
                )}
              >
                <ShieldCheck
                  className={cn(
                    "size-3.5 shrink-0",
                    password.length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary",
                  )}
                />
                <span>Min 10 characters with uppercase, lowercase &amp; numbers</span>
              </div>
            )}
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
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel
              htmlFor={field.name}
              className="text-sm font-semibold text-foreground"
            >
              Confirm Password
            </FieldLabel>
            <PasswordInput
              {...field}
              id={field.name}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              value={field.value ?? ""}
              className="h-11 sm:h-12 text-[16px] sm:text-sm placeholder:text-muted-foreground/60 rounded-xl"
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
