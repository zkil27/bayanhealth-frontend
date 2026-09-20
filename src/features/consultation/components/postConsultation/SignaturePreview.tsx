"use client";

import { cn } from "@/lib/utils";
import type { CdsSignaturePoint } from "@/types/cds-contract";

/**
 * Renders a stored stroke set as the signature it is.
 *
 * The strokes are normalized to the unit box, so this is a fixed `0 0 1 1`
 * viewBox with a non-scaling stroke — the same drawing reads correctly at the
 * 40px height used in a sign-off strip and at the larger size used on the
 * profile page, with no separate raster to keep in sync.
 *
 * A physician confirming "sign as me" must be able to see *what* they are
 * signing with. A stored signature the doctor cannot see before it is committed
 * to a prescription is worse than no stored signature.
 */
export function SignaturePreview({
  strokes,
  className,
  label = "Saved signature",
}: {
  strokes: readonly CdsSignaturePoint[][];
  className?: string;
  label?: string;
}) {
  if (strokes.length === 0) return null;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-10 w-auto text-(--text-heading)", className)}
    >
      {strokes.map((stroke, index) => (
        <polyline
          key={index}
          points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
