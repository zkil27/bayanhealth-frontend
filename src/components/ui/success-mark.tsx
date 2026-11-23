"use client";

import type { SVGProps } from "react";
import { usePlayOnce } from "@/hooks/use-motion-moment";
import { cn } from "@/lib/utils";

/*
 * Drawn marks for the micro-interaction pass (CHANGELOG_UI_MI.md).
 *
 * Both use Lucide's own geometry (`check` and `circle-check`, 24px grid,
 * round caps) so they sit beside Lucide icons without a seam. Each stroke has
 * `pathLength="1"` and `stroke-dasharray: 1`; the keyframes in globals.css
 * draw it by moving `stroke-dashoffset` from 1 to 0. With no animation class
 * (static, reduced motion, or a failed stylesheet) the stroke is fully drawn.
 */

type DrawnCheckProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Draw the check in (160ms). False renders it already drawn. */
  animate?: boolean;
};

/** Lucide's `check`, drawn in when `animate` is true. Decorative. */
export function DrawnCheck({ animate = true, className, strokeWidth = 2, ...props }: DrawnCheckProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      <path
        d="M20 6 9 17l-5-5"
        pathLength={1}
        className={cn("[stroke-dasharray:1]", animate && "animate-check-draw")}
      />
    </svg>
  );
}

const SIZE = {
  md: { svg: "size-6", ring: "animate-success-ring", check: "animate-success-check" },
  sm: { svg: "size-4", ring: "animate-success-ring-sm", check: "animate-success-check-sm" },
} as const;

/**
 * The success mark for outcomes that matter: booking confirmed, doctor
 * accepted, consultation complete (`md`, about 520ms), and a document signed
 * or released (`sm`, about 320ms, for the doctor's workspace).
 *
 * The ring draws from the top, then the check. It plays once per `momentKey`
 * per tab (see `usePlayOnce`), so polling and remounts show it static. It is
 * `aria-hidden`: the heading or status line next to it carries the meaning.
 */
export function SuccessMark({
  momentKey,
  size = "md",
  animate = true,
  className,
}: {
  /** Stable id for the event, e.g. `booking-confirmed:${bookingId}`. */
  momentKey: string;
  size?: keyof typeof SIZE;
  /** False always renders the finished mark (e.g. reviewing a past step). */
  animate?: boolean;
  className?: string;
}) {
  const play = usePlayOnce(animate ? momentKey : null);
  const tokens = SIZE[size];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-slot="success-mark"
      className={cn(tokens.svg, "shrink-0", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        pathLength={1}
        transform="rotate(-90 12 12)"
        className={cn("[stroke-dasharray:1]", play && tokens.ring)}
      />
      <path d="m9 12 2 2 4-4" pathLength={1} className={cn("[stroke-dasharray:1]", play && tokens.check)} />
    </svg>
  );
}
