import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The landing page's call-to-action button.
 *
 * Both variants are solid — no transparent outline — so a CTA reads as a button
 * against cream or against a white card. On hover a coloured panel wipes in from
 * the left instead of the fill snapping to a new colour: primary (teal) trades
 * to navy, secondary (navy) trades to teal, so the two read as a pair. The wipe
 * is a `transform`, so it stays cheap and honours `prefers-reduced-motion`.
 *
 * {@link landingButtonClass} and {@link LandingButtonFill} are exported so a
 * plain `<button>` (e.g. a form submit) can wear the same treatment.
 */
export type LandingButtonVariant = "primary" | "secondary";
type Size = "md" | "sm";

const SURFACE: Record<LandingButtonVariant, string> = {
  primary:
    "bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-btn-inset)",
  secondary:
    "bg-(--surface-brand) text-(--text-on-brand) shadow-(--shadow-btn-inset)",
};

/** The panel that wipes in on hover. */
const FILL: Record<LandingButtonVariant, string> = {
  primary: "bg-(--surface-brand)",
  secondary: "bg-(--action-primary)",
};

// Both sizes are 48px tall: the patient touch-target floor. `sm` only
// tightens padding and type, for the header and in-card actions.
const SIZE: Record<Size, string> = {
  md: "min-h-12 px-6 text-base",
  sm: "min-h-12 px-5 text-sm",
};

export function landingButtonClass(
  variant: LandingButtonVariant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-(--radius-pill) font-bold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
    SIZE[size],
    SURFACE[variant],
    className,
  );
}

/** The hover wipe. Render as the first child of a `landingButtonClass` element. */
export function LandingButtonFill({
  variant = "primary",
}: {
  variant?: LandingButtonVariant;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-0 origin-left scale-x-0 rounded-(--radius-pill) transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none",
        FILL[variant],
      )}
    />
  );
}

/**
 * The quiet alternative to a {@link LandingButton}: an underlined text link
 * with a 48px hit area. Used for the paths that exist but are not the page's
 * one conversion goal (booking, the Med Hub), so they never compete with the
 * solid waitlist button beside them.
 */
export function LandingTextLink({
  href,
  className,
  children,
  ...props
}: Omit<LandingButtonProps, "variant" | "size">) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center gap-1.5 rounded-(--radius-sm) text-base font-bold text-(--text-link) underline decoration-(--border-strong) decoration-1 underline-offset-4 transition-colors hover:text-(--status-available-fg) hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export interface LandingButtonProps
  extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  variant?: LandingButtonVariant;
  size?: Size;
}

export function LandingButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LandingButtonProps) {
  return (
    <Link
      href={href}
      className={landingButtonClass(variant, size, className)}
      {...props}
    >
      <LandingButtonFill variant={variant} />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </Link>
  );
}
