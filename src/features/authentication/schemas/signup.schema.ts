import { z } from "zod";

import type { SignUpRole } from "@/features/authentication/signup-handoff";

export const roleSchema = z.object({
  role: z.enum(["patient", "doctor"]),
});

export const credentialsSchema = z
  .object({
    email: z
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const baseProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  preferredCommunicationApp: z.array(z.string()).optional(),
  preferredNameCall: z.string().min(1, "Preferred name is required").optional(),
  preferredPronoun: z.string().optional(),
});

export const patientProfileSchema = baseProfileSchema.extend({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().min(1, "Address is required"),
});

export const doctorProfileSchema = baseProfileSchema.extend({
  specialization: z.string().min(1, "Specialization is required"),
  subSpecialization: z.string().optional(),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
});

export const stepSchemas = {
  1: roleSchema,
  2: credentialsSchema,
  3: (role: SignUpRole) =>
    role === "patient" ? patientProfileSchema : doctorProfileSchema,
  4: z.object({ acceptedTerms: z.boolean().refine((value) => value === true) }),
};

export type RoleSchemaForm = z.infer<typeof roleSchema>;
export type CredentialsForm = z.infer<typeof credentialsSchema>;
export type PatientProfileForm = z.infer<typeof patientProfileSchema>;
export type DoctorProfileForm = z.infer<typeof doctorProfileSchema>;
