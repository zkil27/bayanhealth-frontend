export const SIGN_UP_ROLES = ["patient", "doctor"] as const;

export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

export interface SignUpHandoff {
  email: string;
  role: SignUpRole;
}

export function isSignUpRole(value: unknown): value is SignUpRole {
  return typeof value === "string" && SIGN_UP_ROLES.includes(value as SignUpRole);
}

export function parseSignUpRole(value: string | null | undefined): SignUpRole | null {
  return isSignUpRole(value) ? value : null;
}

export function createConfirmationPath({ email, role }: SignUpHandoff): string {
  const search = new URLSearchParams({ email, role });
  return `/confirm?${search.toString()}`;
}
