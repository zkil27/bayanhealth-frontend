"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { DOCTOR_NAV, isNavItemActive } from "@/components/layout/nav-items";
import { useActiveEncounter } from "../hooks/useActiveEncounter";
import { useDoctorQueueSummary } from "../hooks/useDoctorQueueSummary";

/**
 * The doctor's mobile navigation, shown only below `lg` where the desktop rail
 * (`SidebarContent`) is hidden. Before this existed a doctor on a phone had no
 * navigation at all — whichever doctor screen they landed on, they were stuck
 * on it.
 *
 * Same rule as the patient `NavBar`: it renders {@link DOCTOR_NAV} directly, so
 * the destinations and their order never differ between breakpoints — only the
 * layout changes. "Soon" rows are dropped; an inert tab has no place in a
 * five-slot thumb bar.
 *
 * The Dashboard tab carries the same "Live queue" count the command bar shows
 * (`useDoctorQueueSummary().totalActive`, already polled for the dashboard), as
 * a solid count chip rather than a pulsing dot.
 *
 * Stacked above the bar, {@link LiveEncounterReturn} is the way back into a
 * consultation the doctor was pulled away from. It is deliberately omitted on
 * `/doctor` itself, where `ActiveEncounterCommandCenter` already anchors the
 * same encounter at the top of the page.
 *
 * The consult room and post-consult workspace live outside the
 * `doctor/(homepage)` layout, so this bar never covers those focused screens.
 */
export function DoctorMobileNav() {
  const pathname = usePathname() ?? "";
  const navItems = DOCTOR_NAV.filter((item) => !item.comingSoon);
  const { totalActive } = useDoctorQueueSummary();

  return (
    // `z-40`, one step under the dashboard's `z-50` sheets and dialogs, so an
    // open triage or accept sheet covers the bar rather than the bar hiding the
    // sheet's own action footer.
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col lg:hidden">
      {pathname !== "/doctor" ? <LiveEncounterReturn /> : null}
      <nav
        aria-label="Doctor navigation"
        className="flex h-[calc(4rem+env(safe-area-inset-bottom,0px))] items-center justify-around gap-1 border-t border-(--border-subtle) bg-(--surface-raised) px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-(--shadow-lg)"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          const count = item.href === "/doctor" ? totalActive : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
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
                  "relative flex items-center justify-center rounded-full px-3 py-0.5 transition-colors",
                  active ? "bg-(--surface-accent-soft)" : "",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--action-primary) px-1 text-[10px] leading-none font-bold text-(--text-on-brand) tabular-nums ring-2 ring-(--surface-raised)"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </span>
              <span className="truncate text-[11px] leading-none font-semibold">
                {item.title}
                {count > 0 ? (
                  <span className="sr-only">
                    {`, ${count} ${count === 1 ? "patient" : "patients"} in queue`}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * "In consult · Return" — a slim bar above the mobile nav while a patient is
 * in the room or an accepted on-demand patient is waiting to be started.
 *
 * Reads {@link useActiveEncounter}, the same derived value
 * `ActiveEncounterCommandCenter` renders, so the two can never name different
 * patients. Links to the room exactly as the command center does (including
 * the demo-room special case). `data-slot` is what the doctor layout keys its
 * extra bottom padding on.
 */
function LiveEncounterReturn() {
  const { item } = useActiveEncounter();
  if (!item) return null;

  const href =
    item.bookingId === "demo-active-encounter"
      ? "/consultation/room/demo"
      : `/consultation/room/${encodeURIComponent(item.bookingId)}`;

  return (
    <Link
      href={href}
      data-slot="live-encounter-return"
      className="flex h-14 items-center gap-3 border-t border-(--border-subtle) bg-(--surface-brand) px-4 text-(--text-on-brand) focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-(--focus-ring)"
    >
      <Video className="size-5 shrink-0 text-(--teal-300)" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] leading-tight font-semibold text-(--teal-300)">
          {item.isInProgress ? "In consult" : "Accepted · ready to start"}
        </span>
        <span className="truncate text-sm leading-tight font-bold">{item.name}</span>
      </span>
      <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-(--teal-500) px-3.5 text-sm font-bold text-(--surface-brand)">
        {item.isInProgress ? "Return" : "Open room"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
