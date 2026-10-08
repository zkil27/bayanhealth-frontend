"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PATIENT_NAV, isNavItemActive } from "@/components/layout/nav-items";

/**
 * Mobile brand mark — the same wordmark the desktop rail pins at its top,
 * shown only below `lg` where the rail itself is hidden. Closes the other
 * half of the cross-breakpoint inconsistency: the bar below already mirrors
 * the rail's six destinations, and this gives phones the same brand presence
 * the rail gives desktop.
 */
export function PatientTopBar() {
  return null;
}

/**
 * The patient mobile bottom bar: a lifted pill, built for mobile Safari.
 *
 * It renders {@link PATIENT_NAV} directly — the same destinations, in the same
 * order, on the same white surface as the desktop rail — so only layout changes
 * across the breakpoint.
 *
 * Why a lifted pill rather than a bar docked to the bottom edge:
 * - Once Safari's toolbar minimises on scroll, taps in roughly the bottom
 *   20–44px reveal Safari's toolbar instead of reaching the page (WebKit bug
 *   194235). Tabs flush to the edge sat in that zone, so a first tap could
 *   silently do nothing. Lifting the pill 12px above the safe area keeps every
 *   tab clear of it.
 * - iOS 26 Safari tints its floating toolbar from fixed bottom elements that
 *   cover most of the bottom edge; a full-width white bar turned it into a
 *   second solid slab. A pill with side gutters does not dominate the edge, and
 *   the fixed element itself carries no background (the opaque surface is an
 *   absolutely positioned child), which keeps Safari's sampling off it.
 * - Opaque, not glass: translucency costs contrast for older eyes, and the
 *   repo bans decorative glassmorphism.
 *
 * Height is 4rem; with the 0.75rem lift the bar clears 4.75rem + safe area.
 * `PatientShell`'s bottom padding and the intake sheet's height account for it.
 */
export function NavBar() {
  const pathname = usePathname() ?? "";
  const navItems = PATIENT_NAV.filter((item) => !item.comingSoon);

  return (
    <nav
      aria-label="Patient navigation"
      data-slot="patient-nav-pill"
      className={cn(
        "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-50 mx-auto h-16 max-w-md lg:hidden",
      )}
    >
      {/* The visible surface lives on a child so Safari 26 doesn't tint its toolbar from the fixed element. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border border-(--border-subtle) bg-(--surface-raised) shadow-(--shadow-md)"
      />
      <div className="relative flex h-full items-center gap-1 p-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                active
                  ? "bg-(--surface-accent-soft) text-(--action-primary)"
                  : "text-(--text-muted) hover:bg-(--surface-canvas) hover:text-(--text-heading)",
              )}
            >
              <Icon className="size-6 shrink-0" aria-hidden="true" />
              <span
                className={cn(
                  "max-w-full truncate text-[13px] leading-tight",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
