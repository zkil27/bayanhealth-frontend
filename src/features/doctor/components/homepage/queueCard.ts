import { cn } from "@/lib/utils";

/**
 * Shell for the dashboard's queue cards (On-Demand, Ready to Start, Incoming,
 * Scheduled, Upcoming Today).
 *
 * They sit *inside* the dashboard's single elevated sheet — the same way the
 * patient home's services tiles sit inside its sheet — so the shell is a flat
 * bordered panel rather than a floating card with its own drop shadow. Stacking
 * shadowed cards on a shadowed slab is what made the old dashboard read as a
 * pile of widgets instead of one work area.
 */
export const QUEUE_CARD_CLASS =
  "flex w-full flex-col overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card)";

/**
 * Shell for a *primary* rail card — Identity, Duty, and the agenda card share
 * this, all at the brand's `--radius-canvas` (28px, "outer page slabs and
 * hero cards" per the token's own comment). `QUEUE_CARD_CLASS` above is
 * deliberately smaller (`rounded-xl`, 12px): it is for tiles nested *inside*
 * a card, the same distinction the token file itself draws between
 * `--radius-canvas` and `--radius-widget`. Before this existed, the rail's
 * three cards each picked their own radius (`rounded-2xl` on two of them,
 * this `rounded-xl` tile radius on the agenda card) and sat stacked directly
 * on top of one another with three different corner curvatures.
 */
export const RAIL_CARD_CLASS =
  "flex w-full flex-col overflow-hidden rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card)";

/** The tinted title bar of a queue card; pass the tone's bg/fg classes. */
export function queueHeaderClass(tone: string): string {
  return cn("flex w-full items-center gap-2 px-4 py-3 text-[15px] font-bold [&_svg]:size-4", tone);
}

/**
 * Bare section shell for a queue that lives *inside* the dashboard's unified
 * "Patient queue" panel (On-Demand, Ready to Start, Incoming) — no border, no
 * background, no shadow of its own. Three of these stacked with a divider
 * between them is what replaced the old page's three separately tinted boxes:
 * one card, three sections, not three cards.
 */
export const QUEUE_SECTION_CLASS = "flex w-full flex-col gap-3";

/**
 * A section's plain-text label — an icon and a count, coloured by text only
 * (never a full-width tint bar), so the unified queue reads as one list with
 * three labelled parts rather than three differently-branded widgets.
 */
export function queueSectionHeaderClass(toneTextClass: string): string {
  return cn("flex w-full items-center gap-2 text-[13.5px] font-bold [&_svg]:size-4", toneTextClass);
}
