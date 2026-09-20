import type { AppRole } from "@/stores/useAuthStore";

/**
 * Role precedence, highest authority first: admin → doctor → patient.
 * Used to resolve a single primary role from a user's Cognito group memberships.
 */
export const ROLE_PRIORITY: AppRole[] = ["admin", "doctor", "patient"];

/**
 * Resolve the highest-precedence application role from a list of Cognito groups.
 *
 * Precedence (highest first): admin → doctor → patient.
 * Groups that are not recognised application roles are ignored.
 *
 * @param groups - The `cognito:groups` claim values from the IdToken.
 * @returns The primary {@link AppRole}, or `null` when the list is empty or contains no recognised role.
 */
export function resolvePrimaryRole(groups: string[]): AppRole | null {
  for (const role of ROLE_PRIORITY) {
    if (groups.includes(role)) return role;
  }
  return null;
}
