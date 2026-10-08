import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The bar that always says what to do next, pinned to the bottom of the
 * scrolling column.
 *
 * `status` is the left side: where things stand and what comes next, in
 * words. `children` are the actions, primary last so it lands under the
 * right thumb on a phone and at the end of the reading line on a desktop.
 * Bottom padding includes the safe-area inset, so nothing sits under the
 * iOS home indicator.
 */
export function StickyActionBar({
  status,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  status?: ReactNode;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      data-slot="sticky-action-bar"
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-(--border-subtle) bg-(--surface-card) px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-6px_16px_-8px_rgb(7_73_114/0.18)]",
        className,
      )}
    >
      {status ? <div className="min-w-0 flex-1 basis-56">{status}</div> : null}
      {/* Callers size their own actions: the primary usually grows, Finish stays compact. */}
      <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
        {children}
      </div>
    </div>
  );
}
