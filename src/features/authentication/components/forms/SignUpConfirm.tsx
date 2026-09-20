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
    <div className="space-y-6">
      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field, fieldState }) => (
          <Field>
            <SignUpTermsAndConditions {...field} role={role} disabled={isSubmitting} />
            {fieldState.invalid && <AnimatedFieldError error={fieldState.error} />}
          </Field>
        )}
      />

      <section className="space-y-3 rounded-lg border bg-muted p-4 text-sm">
        <h3 className="font-semibold">Account creation</h3>
        <p className="text-muted-foreground">
          Selecting Complete creates your account by submitting only your email,
          password, and selected role.
        </p>
        <div className="space-y-1">
          <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{userData.credentials.email || "Not provided"}</span></p>
          <p><span className="text-muted-foreground">Role:</span> <span className="font-medium capitalize">{role}</span></p>
        </div>
        <p className="text-muted-foreground">
          Profile details entered in this signup flow remain local and are not
          submitted or saved as part of account creation.
        </p>
        {role === "doctor" && (
          <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-muted-foreground">
            Doctor verification materials are not collected or uploaded now.
            After email confirmation and sign-in, submit them through the Doctor
            Verification/KYC flow.
          </p>
        )}
      </section>
    </div>
  );
}
