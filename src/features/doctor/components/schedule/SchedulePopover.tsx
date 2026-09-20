"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Where a popover should point: the on-screen box of the thing that was
 * clicked — a grid block, a month cell, a toolbar button.
 *
 * A plain `DOMRect` rather than an element ref, because the anchor is often a
 * *place* rather than a node: a drag on the day grid ends at a rectangle of
 * time that no element owns. Callers build one with
 * {@link rectFromPointer} or from `getBoundingClientRect()`.
 */
export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The anchor rect for a pointer event, as a zero-width box at the cursor. */
export function rectFromPointer(event: { clientX: number; clientY: number }): AnchorRect {
  return { top: event.clientY, left: event.clientX, width: 0, height: 0 };
}

/**
 * The anchor rect for a click, preferring the pointer and falling back to the
 * element.
 *
 * A button activated from the keyboard still fires `click`, but with
 * `clientX/clientY` of 0 — anchoring to that would pin the popover to the
 * top-left corner of the screen, nowhere near the day the doctor is on. The
 * element's own box is the right anchor in that case.
 */
export function rectFromMouseEvent(
  event: { clientX: number; clientY: number; currentTarget: Element },
): AnchorRect {
  if (event.clientX === 0 && event.clientY === 0) return rectFromElement(event.currentTarget);
  return rectFromPointer(event);
}

/** The anchor rect for an element that was clicked. */
export function rectFromElement(element: Element): AnchorRect {
  const box = element.getBoundingClientRect();
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

/** Gap between the anchor and the popover, and the minimum margin to the viewport edge. */
const GAP = 8;
const EDGE_MARGIN = 12;
/** Assumed popover size before it has been measured, so the first paint is close. */
const ESTIMATED_WIDTH = 320;
const ESTIMATED_HEIGHT = 320;

/**
 * Place the popover beside its anchor, inside the viewport.
 *
 * Prefers below-and-left-aligned, the direction a calendar reads. Flips above
 * when the space below cannot hold it *and* the space above can — flipping into
 * an equally bad position would only move the clipping. Horizontal placement is
 * clamped rather than flipped, because a popover that jumps sides as the doctor
 * clicks across a week is harder to follow than one that slides.
 */
export function placePopover(
  anchor: AnchorRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const spaceBelow = viewport.height - (anchor.top + anchor.height) - GAP;
  const spaceAbove = anchor.top - GAP;
  const flipUp = spaceBelow < size.height && spaceAbove > spaceBelow;

  const rawTop = flipUp
    ? anchor.top - GAP - size.height
    : anchor.top + anchor.height + GAP;

  const maxTop = Math.max(EDGE_MARGIN, viewport.height - size.height - EDGE_MARGIN);
  const maxLeft = Math.max(EDGE_MARGIN, viewport.width - size.width - EDGE_MARGIN);

  return {
    top: Math.min(Math.max(rawTop, EDGE_MARGIN), maxTop),
    left: Math.min(Math.max(anchor.left, EDGE_MARGIN), maxLeft),
  };
}

/**
 * A calendar popover: a small card anchored to whatever was clicked.
 *
 * Written here rather than composed from `@/components/ui/popover` because that
 * primitive positions against a *trigger element*, and half of this calendar's
 * popovers are opened by a gesture that has no element — a drag across empty
 * grid ends at a rectangle of time, not a node. Driving it from a rect keeps
 * one opening path for blocks, cells, drags and buttons alike.
 *
 * Dismissal follows the same rules as a Google Calendar popover: Escape closes
 * it, a pointer press anywhere outside closes it, and neither disturbs the
 * calendar underneath. It is deliberately **not** modal — the doctor can still
 * read the week behind it, which is the point of a popover over a drawer — so
 * focus is moved in on open and returned on close without being trapped.
 */
export function SchedulePopover({
  open,
  anchor,
  label,
  onClose,
  children,
  className,
  testId,
}: {
  open: boolean;
  anchor: AnchorRect | null;
  /** Accessible name for the dialog; also what a screen reader announces. */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** Value for `data-slot`, so tests and styles can target a specific popover. */
  testId: string;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  /*
    Measure once mounted, then place. `useLayoutEffect` rather than `useEffect`
    so the placement lands before the browser paints — a card that painted at a
    stale position and then moved would read as a flicker.

    A closed popover renders nothing, so there is no stale position to clear:
    the next open re-measures against its own anchor in this same effect,
    still before paint.
  */
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const measure = () => {
      const box = cardRef.current?.getBoundingClientRect();
      setPosition(
        placePopover(
          anchor,
          {
            width: box?.width || ESTIMATED_WIDTH,
            height: box?.height || ESTIMATED_HEIGHT,
          },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, anchor]);

  // Focus in on open, back out on close. Stored on the way in rather than read
  // on the way out, because by then the element may be gone.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    // `data-autofocus` wins over document order: the first focusable node in a
    // popover is usually its close button, and landing there means the first
    // keystroke dismisses the thing that just opened.
    const preferred = card?.querySelector<HTMLElement>("[data-autofocus]");
    const focusable =
      preferred ??
      card?.querySelector<HTMLElement>(
        "input, select, textarea, button, [href], [tabindex]:not([tabindex='-1'])",
      );
    (focusable ?? card)?.focus();
    return () => {
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      // Stopped here so the calendar's own D/W/M/T shortcuts, which listen on
      // the window, never see a key meant for this popover.
      event.stopPropagation();
      close();
    }
    function onPointerDown(event: PointerEvent) {
      const card = cardRef.current;
      if (!card) return;
      if (event.target instanceof Node && card.contains(event.target)) return;
      close();
    }

    // Capture phase: a press on a grid block would otherwise open the *next*
    // popover in the same gesture that should have dismissed this one.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, close]);

  if (!open || !anchor) return null;

  return (
    <div
      ref={cardRef}
      data-slot={testId}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: position?.top ?? anchor.top + anchor.height + GAP,
        left: position?.left ?? anchor.left,
        // Hidden until placed, so the card is never seen in the wrong spot. It
        // still occupies the DOM, which is what lets the measurement above run.
        visibility: position ? "visible" : "hidden",
      }}
      className={cn(
        "z-50 flex w-[min(21rem,calc(100vw-1.5rem))] flex-col gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4 text-sm shadow-[0_12px_32px_rgba(120,110,80,0.22),0_2px_6px_rgba(120,110,80,0.10)] outline-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
