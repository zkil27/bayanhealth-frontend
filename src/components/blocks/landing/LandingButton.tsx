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

const SIZE: Record<Size, string> = {
  md: "min-h-12 px-6 text-[15px]",
  sm: "min-h-11 px-4 text-sm",
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
