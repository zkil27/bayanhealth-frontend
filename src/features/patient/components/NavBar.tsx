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
 * The patient mobile bottom bar.
 *
 * This used to carry its own, shorter four-tab information architecture
 * (Home / Appointments / Messages / Profile) on a filled brand-teal bar —
 * a different IA, on a different surface, from the six-item white desktop
 * rail. Both traits read as "the nav is broken" rather than "the nav is
 * responsive". The bar now renders {@link PATIENT_NAV} directly — the exact
 * same six destinations, in the same order, including the "Soon" rows for
 * Chat and Med Ed — on the same white (`--surface-raised`) surface the rail
 * uses, so the only thing that changes across the breakpoint is layout, not
 * content or color.
 */
export function NavBar() {
  const pathname = usePathname() ?? "";
  const navItems = PATIENT_NAV.filter((item) => !item.comingSoon);

  return (
    <nav
      aria-label="Patient navigation"
      className={cn(
        "fixed inset-x-4 max-w-lg mx-auto bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 lg:hidden",
        "flex h-16 items-center justify-around gap-1 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-raised) px-2 shadow-(--shadow-lg)",
      )}
    >
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
              "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-(--radius-card) px-1 transition-colors",
              active
                ? "text-(--action-primary)"
                : "text-(--text-muted) hover:text-(--text-heading)",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full px-3 py-0.5 transition-colors",
                active
                  ? "bg-(--surface-accent-soft) text-(--action-primary)"
                  : "text-(--text-muted)",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
            </span>
            <span
              className={cn(
                "max-w-full truncate text-[10.5px] leading-none",
                active ? "font-bold text-(--action-primary)" : "font-medium text-(--text-muted)",
              )}
            >
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
