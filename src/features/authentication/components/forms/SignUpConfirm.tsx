"use client";

import { Controller, useFormContext } from "react-hook-form";

import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { SignUpTermsAndConditions } from "@/components/blocks/legal/SignUpTermsAndCondition";
import { Field } from "@/components/ui/field";
import type { SignUpRole } from "@/features/authentication/signup-handoff";
import { useFormData } from "../../stores/useSignUpStore";

interface SignUpConfirmProps {
  role: SignUpRole;
  isSubmitting: boolean;
}

export function SignUpConfirm({ role, isSubmitting }: SignUpConfirmProps) {
  const { control } = useFormContext();
  const userData = useFormData();

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 py-1">
      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5">
            <SignUpTermsAndConditions {...field} role={role} disabled={isSubmitting} />
            {fieldState.invalid && <AnimatedFieldError error={fieldState.error} />}
          </Field>
        )}
      />

      <section className="flex flex-col gap-2.5 rounded-2xl border border-border bg-muted/60 p-3.5 sm:p-4 text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="font-semibold text-foreground">Registration Summary</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary capitalize">
            {role}
          </span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Email</span>
          <span className="font-medium text-foreground">{userData.credentials.email || "Not provided"}</span>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground pt-0.5 border-t border-border/40">
          Account creation submits your email, password, and selected role. Profile details remain saved locally.
        </p>

        {role === "doctor" && (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            Doctor verification materials will be submitted via KYC after sign-in.
          </p>
        )}
      </section>
    </div>
  );
}
