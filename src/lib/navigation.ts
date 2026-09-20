import type { AppRole } from "@/stores/useAuthStore";

/**
 * Stable identifier for each role-gated navigation area.
 * Mirrors the protected areas enforced by the route guard (see `route-guard.ts`).
 */
export type AreaId = "patient" | "doctor" | "admin";

/**
 * A navigation target for a role-gated area.
 *
 * - `id`    — stable area identifier.
 * - `label` — user-facing navigation label.
 * - `href`  — route prefix the link points to (the area's role home).
 * - `roles` — the application roles permitted to enter the area. A session is
 *   permitted the area when it holds at least one of these roles.
 */
export interface NavArea {
  id: AreaId;
  label: string;
  href: string;
  roles: readonly AppRole[];
}

/**
 * Canonical, ordered list of role-gated navigation areas.
 *
 * The role→area permissions mirror the route guard's `AREAS` table:
 * - Patient_Area (`/patient`)  — `patient`
 * - Doctor_Area  (`/doctor`)   — `doctor`
 * - Admin_Area   (`/admin`)    — `admin`
 */
export const NAV_AREAS: readonly NavArea[] = [
  { id: "patient", label: "Patient", href: "/patient", roles: ["patient"] },
  { id: "doctor", label: "Doctor", href: "/doctor", roles: ["doctor"] },
  { id: "admin", label: "Admin", href: "/admin", roles: ["admin"] },
];

/**
 * Pure helper: the set of navigation areas permitted for a given set of roles.
 *
 * For any set of roles, an area is included if and only if the session holds at
 * least one of the area's permitted roles. Areas are returned in the canonical
 * {@link NAV_AREAS} order, and no non-permitted area is ever included.
 *
 * @param roles - The application roles held by the current session.
 * @returns The permitted {@link NavArea} entries (possibly empty), in canonical order.
 */
export function permittedAreas(roles: AppRole[]): NavArea[] {
  return NAV_AREAS.filter((area) => area.roles.some((role) => roles.includes(role)));
}
