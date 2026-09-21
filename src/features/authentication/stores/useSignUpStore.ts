import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { CognitoError, signUp } from "@/lib/cognito";
import {
  isSignUpRole,
  type SignUpHandoff,
  type SignUpRole,
} from "@/features/authentication/signup-handoff";

interface SignUpState {
  role: SignUpRole | null;
  step: number;
  formData: {
    credentials: {
      email: string;
      password: string;
      confirmPassword: string;
    };
    profile: Record<string, unknown>;
  };
  isSubmitting: boolean;
  isComplete: boolean;
}

interface SignUpActions {
  setRole: (role: SignUpRole | null) => void;
  setStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  updateCredentials: (data: Partial<SignUpState["formData"]["credentials"]>) => void;
  updateProfile: (data: Record<string, unknown>) => void;
  syncFormData: (data: object) => void;
  submitSignUp: () => Promise<SignUpHandoff>;
  resetSignUp: () => void;
  resetStep: () => void;
}

type SignUpStore = SignUpState & SignUpActions;

const createDefaultState = (): SignUpState => ({
  role: null,
  step: 1,
  formData: {
    credentials: { email: "", password: "", confirmPassword: "" },
    profile: {},
  },
  isSubmitting: false,
  isComplete: false,
});

const clearPasswords = (state: SignUpState) => ({
  ...state.formData,
  credentials: {
    ...state.formData.credentials,
    password: "",
    confirmPassword: "",
  },
});

export const useSignUpStore = create<SignUpStore>()(
  persist(
    (set, get) => ({
      ...createDefaultState(),

      setRole: (role) => {
        if (!isSignUpRole(role)) {
          set((state) => ({ ...state, role: null }));
          return;
        }
        set((state) => ({ ...state, role }));
      },

      setStep: (step) => set({ step }),
      resetStep: () => set({ step: 1 }),

      goToNextStep: () => {
        const { step } = get();
        if (step < 4) set({ step: step + 1 });
      },

      goToPreviousStep: () => {
        const { step } = get();
        if (step > 1) set({ step: step - 1 });
      },

      updateCredentials: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            credentials: { ...state.formData.credentials, ...data },
          },
        })),

      updateProfile: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            profile: { ...state.formData.profile, ...data },
          },
        })),

      syncFormData: (data) => {
        const state = get();
        const values = data as Record<string, unknown>;
        if (state.step === 2) {
          set({
            formData: {
              ...state.formData,
              credentials: {
                email: typeof values.email === "string" ? values.email : "",
                password: typeof values.password === "string" ? values.password : "",
                confirmPassword:
                  typeof values.confirmPassword === "string"
                    ? values.confirmPassword
                    : "",
              },
            },
          });
        } else if (state.step === 3) {
          set({
            formData: {
              ...state.formData,
              profile: { ...state.formData.profile, ...values },
            },
          });
        }
      },

      submitSignUp: async () => {
        const state = get();
        const { email, password } = state.formData.credentials;
        const { role } = state;

        if (!isSignUpRole(role)) {
          set((current) => ({
            isSubmitting: false,
            formData: clearPasswords(current),
          }));
          throw new Error("Select either Patient or Doctor before creating an account.");
        }

        set({ isSubmitting: true });
        try {
          await signUp(email, password, role);
          const handoff = { email, role };
          set(createDefaultState());
          return handoff;
        } catch (err) {
          set((current) => ({
            isSubmitting: false,
            formData: clearPasswords(current),
          }));
          if (err instanceof CognitoError) {
            throw new Error(
              err.code === "UsernameExistsException"
                ? "An account with this email already exists. Please sign in."
                : err.message,
            );
          }
          throw new Error("Registration failed. Please try again.");
        }
      },

      resetSignUp: () => set(createDefaultState()),
    }),
    {
      name: "signup-storage",
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
      migrate: () => ({ role: null, step: 1 }),
      partialize: (state) => ({
        role: state.role,
        step: isSignUpRole(state.role) ? 2 : 1,
      }),
    },
  ),
);

export const useSignUpRole = () => useSignUpStore((s) => s.role);
export const useSignUpStep = () => useSignUpStore((s) => s.step);
export const useFormData = () => useSignUpStore((s) => s.formData);
