"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Desktop-only breadcrumb for patient-area sub-pages. Hidden below 1024px,
 * where the bottom {@link NavBar} owns navigation.
 *
 * The trail is built from an explicit segment registry, not from the raw path.
 * Deriving it with `pathname.split("/")` broke every non-`/patient` route:
 *
 * - the top level was dropped, because the render did `crumbs.slice(1)` on the
 *   assumption that segment 0 is always `patient` — so `/patient/booking/search` showed
 *   "Home / Search" with no "Book" in between;
 * - every intermediate segment was linked, so `/patient/booking/doctor/<id>` and
 *   `/patient/booking/getBooking/<id>` produced links to `/patient/booking/doctor` and
 *   `/patient/booking/getBooking`, neither of which is a real page, and
 *   `/patient/booking/createBooking/<id>` linked its crumb to `/patient/booking/createBooking` —
 *   the on-demand intake form, a different flow;
 * - dynamic id segments were printed raw ("bk_ms…", a Cognito sub) and code
 *   segments verbatim ("GetBooking", "CreateBooking").
 *
 * Now a segment is a link only when the registry gives it an `href`; flow
 * groupings are labelled plain text, and a trailing id segment is dropped so the
 * segment before it reads as the current page.
 */

/** Known path segments → how they read, and where they point (if anywhere). */
const SEGMENTS: Record<string, { label: string; href?: string }> = {
  patient: { label: "Home", href: "/patient" },
  health: { label: "Health", href: "/patient/health" },
  chat: { label: "Chat", href: "/patient/chat" },
  profile: { label: "Profile", href: "/patient/profile" },
  details: { label: "Personal details", href: "/patient/profile/details" },
  "doctor-preferences": {
    label: "Doctor preferences",
    href: "/patient/profile/doctor-preferences",
  },
  booking: { label: "Book", href: "/patient/booking" },
  search: { label: "Find a doctor", href: "/patient/booking/search" },
  // Path groupings with no index page of their own — labelled, never linked.
  doctor: { label: "Doctor" },
  createBooking: { label: "Consultation" },
  getBooking: { label: "Booking" },
};

export function PatientBreadcrumb({
  variant = "default",
}: {
  variant?: "default" | "header";
} = {}) {
  const pathname = usePathname();

  // No breadcrumb on the patient home itself, nor on a booking detail, whose
  // context bar already carries back navigation and the page title.
  if (pathname === "/patient") return null;
  if (pathname.startsWith("/patient/booking/getBooking/")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // Drop a trailing dynamic id (booking id, doctor id, intake token): it has no
  // useful label, and the segment before it is the real "current page".
  const lastSegment = segments[segments.length - 1]!;
  const trimmed =
    lastSegment in SEGMENTS ? segments : segments.slice(0, -1);

  // "Home" already stands in for `/patient`, so never repeat it as a crumb.
  const visible = trimmed.filter((segment) => segment !== "patient");
  if (visible.length === 0) return null;

  const isHeader = variant === "header";

  const crumbs = visible.map((segment, index) => {
    const known = SEGMENTS[segment];
    const isLast = index === visible.length - 1;
    return {
      key: `${segment}-${index}`,
      label: known?.label ?? "Details",
      // Intermediate segments link when the registry knows a real page for
      // them; the current page never links.
      href: isLast ? undefined : known?.href,
      isLast,
    };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "hidden w-full lg:block",
        isHeader
          ? "text-[12px] text-white/80"
          : "px-4 pt-3 pb-2 text-[13px] text-(--text-muted)",
      )}
    >
      <ol className="flex items-center gap-1">
        <li>
          <Link
            href="/patient"
            className={cn(
              "transition-colors",
              isHeader ? "hover:text-white" : "hover:text-(--text-link-hover)",
            )}
          >
            Home
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.key} className="flex items-center gap-1">
            <ChevronRight
              className={cn(
                "h-3 w-3",
                isHeader ? "text-white/60" : "text-(--text-subtle)",
              )}
            />
            {crumb.href ? (
              <Link
                href={crumb.href}
                className={cn(
                  "transition-colors",
                  isHeader
                    ? "hover:text-white"
                    : "hover:text-(--text-link-hover)",
                )}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                aria-current={crumb.isLast ? "page" : undefined}
                className={
                  crumb.isLast
                    ? isHeader
                      ? "font-medium text-white"
                      : "font-semibold text-(--text-heading)"
                    : undefined
                }
              >
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
