import {
  CalendarClock,
  GraduationCap,
  HeartPulse,
  Home,
  MessageSquareText,
  UserRound,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Rendered as an inert "Soon" row — the screen behind it is not live yet. */
  comingSoon?: boolean;
}

/**
 * Single source of truth for the patient's primary navigation, shared by the
 * desktop rail ({@link SidebarContent}) and the mobile bar (`NavBar`) so the
 * two breakpoints present the same six destinations in the same order
 * instead of two different information architectures.
 *
 * Chat is temporarily `comingSoon` alongside Med Ed while the feature is
 * pulled back for rework; `/patient/chat` itself also renders a coming-soon
 * placeholder so a direct link behaves the same as the nav.
 */
export const PATIENT_NAV: NavItem[] = [
  { title: "Home", href: "/patient", icon: Home },
  // `/patient/health` is the merged health record (it superseded the
  // bookings-only `/patient/records` list), so it takes the slot rather than
  // sitting beside a near-duplicate Records tab.
  { title: "Health", href: "/patient/health", icon: HeartPulse },
  { title: "Book", href: "/patient/booking", icon: CalendarClock },
  { title: "Chat", href: "/patient/chat", icon: MessageSquareText, comingSoon: true },
  { title: "Med Ed", href: "/med-ed", icon: GraduationCap, comingSoon: true },
  { title: "Profile", href: "/patient/profile", icon: UserRound },
];

export const DOCTOR_NAV: NavItem[] = [
  { title: "Dashboard", href: "/doctor", icon: Home },
  { title: "Calendar", href: "/doctor/schedule", icon: CalendarClock },
  { title: "Consults", href: "/doctor/history", icon: Video },
  { title: "Chat", href: "/doctor/chat", icon: MessageSquareText, comingSoon: true },
  { title: "Med Ed", href: "/med-ed", icon: GraduationCap, comingSoon: true },
  { title: "Profile", href: "/doctor/profile", icon: UserRound },
];

/**
 * The area root (`/patient`, `/doctor`) is a prefix of every screen in its
 * area, so a plain `startsWith` kept "Home" / "Dashboard" lit on every
 * sub-route. Those two are matched exactly; the rest keep prefix matching so
 * `/patient/booking/search` still lights "Book".
 */
const EXACT_MATCH_HREFS = new Set(["/patient", "/doctor", "/"]);

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  if (EXACT_MATCH_HREFS.has(href)) return false;
  return pathname.startsWith(`${href}/`);
}
