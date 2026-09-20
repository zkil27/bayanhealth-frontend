import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  useFormData,
  useSignUpRole,
  useSignUpStep,
  useSignUpStore,
} from "../stores/useSignUpStore";
import {
  type CredentialsForm,
  type DoctorProfileForm,
  type PatientProfileForm,
  stepSchemas,
} from "../schemas/signup.schema";
import {
  isSignUpRole,
  type SignUpHandoff,
  type SignUpRole,
} from "@/features/authentication/signup-handoff";

export type WizardFormData = Partial<
  CredentialsForm &
    PatientProfileForm &
    DoctorProfileForm & {
      role: SignUpRole;
      acceptedTerms: boolean;
    }
>;

export function useSignUpWizard() {
  const store = useSignUpStore();
  const step = useSignUpStep();
  const role = useSignUpRole();
  const formData = useFormData();
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (step >= 3 && !isSignUpRole(role)) {
      store.resetSignUp();
    }
  }, [role, step, store]);

  const getSchema = () => {
    switch (step) {
      case 1:
        return stepSchemas[1];
      case 2:
        return stepSchemas[2];
      case 3:
        return isSignUpRole(role) ? stepSchemas[3](role) : stepSchemas[1];
      case 4:
        return stepSchemas[4];
      default:
        return z.object({});
    }
  };

  const getDefaultValues = (): Partial<WizardFormData> => {
    const currentData = formDataRef.current;

    switch (step) {
      case 1:
        return role ? { role } : {};
      case 2:
        return {
          email: currentData.credentials.email,
          password: currentData.credentials.password,
          confirmPassword: currentData.credentials.confirmPassword,
        };
      case 3: {
        const profile = currentData.profile;
        const preferredCommunicationApp = profile.preferredCommunicationApp;
        return {
          ...profile,
          preferredCommunicationApp: Array.isArray(preferredCommunicationApp)
            ? preferredCommunicationApp
            : preferredCommunicationApp
              ? [preferredCommunicationApp]
              : [],
        };
      }
      case 4:
        return { acceptedTerms: Boolean(currentData.profile.acceptedTerms) };
      default:
        return {};
    }
  };

  const methods = useForm<WizardFormData>({
    resolver: zodResolver(getSchema() as any),
    defaultValues: getDefaultValues(),
    mode: "onChange",
    shouldUnregister: true,
  });

  useEffect(() => {
    methods.reset(getDefaultValues());
  }, [step, role]);

  useEffect(() => {
    const subscription = methods.watch((value) => {
      if (Object.keys(value).length > 0) {
        store.syncFormData(value);
      }
    });
    return () => subscription.unsubscribe();
  }, [methods, store]);

  const validateStep = async (currentStep: number): Promise<boolean> => {
    if (currentStep === 1) {
      const selectedRole = methods.getValues("role");
      if (!isSignUpRole(selectedRole)) {
        methods.setError("role", {
          type: "manual",
          message: "Select either Patient or Doctor.",
        });
        return false;
      }
      return methods.trigger("role");
    }

    if ((currentStep === 3 || currentStep === 4) && !isSignUpRole(role)) {
      store.resetSignUp();
      methods.reset({});
      return false;
    }

    const isValid = await methods.trigger();
    if (!isValid) return false;

    if (currentStep === 2) {
      const values = methods.getValues() as CredentialsForm;
      if (values.password !== values.confirmPassword) {
        methods.setError("confirmPassword", {
          type: "manual",
          message: "Passwords do not match",
        });
        return false;
      }
    }

    return true;
  };

  const handleRoleSelect = (selectedRole: SignUpRole | null) => {
    if (!isSignUpRole(selectedRole)) {
      store.resetSignUp();
      methods.reset({});
      return;
    }

    store.setRole(selectedRole);
    methods.setValue("role", selectedRole, { shouldValidate: true });
  };

  const handleNext = async (): Promise<SignUpHandoff | undefined> => {
    if (!(await validateStep(step))) return undefined;

    store.syncFormData(methods.getValues());
    if (step !== 4) {
      store.goToNextStep();
      return undefined;
    }

    try {
      const handoff = await store.submitSignUp();
      methods.reset({});
      return handoff;
    } catch (error) {
      methods.setValue("password", "");
      methods.setValue("confirmPassword", "");
      throw error;
    }
  };

  const handleBack = () => {
    store.syncFormData(methods.getValues());
    store.goToPreviousStep();
  };

  const resetWizard = () => {
    store.resetSignUp();
    methods.reset({});
  };

  return {
    step,
    role,
    isSubmitting: store.isSubmitting,
    formData: store.formData,
    methods,
    handleNext,
    handleBack,
    handleRoleSelect,
    reset: resetWizard,
    isLastStep: step === 4,
    isFirstStep: step === 1,
    isValid: methods.formState.isValid,
    isDirty: methods.formState.isDirty,
  };
}
