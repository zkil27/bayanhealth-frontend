import { cn } from "@/lib/utils";

/**
 * The one inline text-link treatment for the patient dashboard.
 *
 * Every "See all", "Update", "Open Med Hub", "Book a consultation" link on the
 * home screen was drifting its own way — some `text-teal-700`, some
 * `text-(--status-available-fg)`, some with an underline on hover and some
 * without, some with a focus ring and some without. They all route through this
 * now, so a link is a link wherever it sits: brand teal, underline on hover,
 * the shared focus ring, and a trailing arrow that nudges right.
 *
 * For real call-to-action *buttons* (filled / outlined pills), use
 * `brandButtonClass` from `features/patient/components/redesign/primitives`
 * instead — this is only for the lightweight text links.
 */
export function dashboardLinkClass(extra?: string): string {
  return cn(
    "group inline-flex w-fit shrink-0 items-center gap-1.5 text-[13px] font-semibold text-(--status-available-fg) transition-colors hover:text-(--text-link-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg:last-child]:transition-transform group-hover:[&_svg:last-child]:translate-x-0.5",
    extra,
  );
}
