import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  cardHoverClass,
} from "@/features/patient/components/redesign/primitives";

/**
 * The shared frame for a Home dashboard panel.
 *
 * Every tile in the clinical grid has the same four states — heading with an
 * optional "See all", loading, content, and a one-line empty state with a route
 * out — and having each tile re-implement them is how the panels drifted apart
 * the last time.
 *
 * `framed` wraps the panel in the standard dashboard {@link Card} surface
 * (`--surface-card`, `--border-subtle`, `--radius-card`, `--shadow-card`). The
 * three tier-3 record panels — documents, recent visits, health profile — all
 * pass it, so they share one container treatment and, with `h-full` on the card,
 * bottom-align across the row instead of reading as a dashed box beside a set of
 * floating pills beside a solid card.
 *
 * `subCard` demotes the panel's own heading to a small label and drops its
 * per-panel "See all". The tier-3 panels use it because they now sit under one
 * macro "Your health records" header with a single "View all history" anchor —
 * three headings at the same weight as "What do you need?" and "Health guidance"
 * had chopped the middle of the page into five equal-looking sections.
 */
export function HomePanel({
  slot,
  title,
  seeAllHref,
  seeAllLabel = "See all",
  action,
  isLoading,
  isEmpty,
  emptyLine,
  emptyIcon,
  emptyHref,
  emptyLinkLabel,
  framed,
  subCard,
  headingClassName,
  className,
  children,
}: {
  /** `data-slot` value, for tests and styling hooks. */
  slot: string;
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Demote the heading to a label and drop the per-panel "See all". */
  subCard?: boolean;
  /** Extra classes on the heading — e.g. a readable tone on a tinted panel. */
  headingClassName?: string;
  /** Rendered under the content, e.g. an "update" control. */
  action?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyLine?: string;
  /** Small outline glyph shown inline, leading {@link emptyLine}. */
  emptyIcon?: ReactNode;
  emptyHref?: string;
  emptyLinkLabel?: string;
  /** Wrap the panel in the standard dashboard card surface. */
  framed?: boolean;
  /**
   * Extra classes on the panel root. Home's tier-3 grid passes `h-full` so the
   * three record panels stretch to a common height and their cards bottom-align
   * regardless of how much each one holds.
   */
  className?: string;
  children: ReactNode;
}) {
  const body = (
    <section
      data-slot={slot}
      aria-labelledby={`${slot}-heading`}
      className={cn("flex flex-col gap-3", framed && "flex-1", className)}
    >
      <div className="flex items-center justify-between gap-3">
        {subCard ? (
          <h3
            id={`${slot}-heading`}
            className={cn(
              "text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase",
              headingClassName,
            )}
          >
            {title}
          </h3>
        ) : (
          <h2
            id={`${slot}-heading`}
            className={cn(
              "text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)",
              headingClassName,
            )}
          >
            {title}
          </h2>
        )}
        {seeAllHref && !subCard ? (
          <Link
            href={seeAllHref}
            className="shrink-0 text-[14px] font-semibold text-(--text-heading) hover:text-(--text-link-hover)"
          >
            {seeAllLabel}
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5" role="status" aria-live="polite">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="h-16 animate-pulse rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-warm)"
            />
          ))}
        </div>
      ) : isEmpty ? (
        /*
          One compact row, not a centred box.
          The empty state used to grow to fill the panel and centre a 28px glyph
          over its copy — roughly 120px of dashed outline per panel. On a new
          account every panel is empty at once, so the page read as broken rather
          than as new. It is now a single line: small glyph, the sentence, and the
          way out, in about 44px.
        */
        <div
          data-slot={`${slot}-empty`}
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-(--radius-widget) border border-dashed border-(--border-default) px-3 py-2.5"
        >
          {emptyIcon ? (
            <span
              aria-hidden
              className="shrink-0 text-(--text-subtle) [&_svg]:size-4"
            >
              {emptyIcon}
            </span>
          ) : null}
          {/* `basis-40` + `flex-1`: in a wide column the line and its action
              share one row, but in the narrow rail the action wraps to its own
              line instead of crushing the sentence into four. */}
          <p className="min-w-0 flex-1 basis-40 text-[13px] leading-[1.4] text-(--text-muted)">
            {emptyLine}
          </p>
          {emptyHref && emptyLinkLabel ? (
            <Link
              href={emptyHref}
              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-(--text-heading) hover:text-(--text-link-hover)"
            >
              {emptyLinkLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      ) : (
        children
      )}

      {action}
    </section>
  );

  if (framed) {
    return (
      <Card
        variant="floating"
        className={cn("flex h-full flex-col p-5", cardHoverClass, className)}
      >
        {body}
      </Card>
    );
  }

  return body;
}
