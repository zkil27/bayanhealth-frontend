"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Resizable patient rail for the post-consult workspace (desktop only).
 *
 * The doctor drags the handle between the SOAP column and the rail to give the
 * intake / chart more room, even more than the SOAP column. The width is kept
 * per browser (`bh:post-consult:rail-width`), so it holds across patients.
 * Double-click, or press Home on the handle, to return to the default.
 */

const STORAGE_KEY = "bh:post-consult:rail-width";
/** Default and minimum match the old fixed `minmax(17rem, 21rem)` column. */
export const RAIL_DEFAULT_PX = 336;
const RAIL_MIN_PX = 272;
/** The SOAP column never gets narrower than this (30rem): below it the Plan & documents deck clips. */
const MAIN_MIN_PX = 480;
/** The handle replaces the 16px grid gap between the two columns. */
const HANDLE_PX = 16;
const STEP_PX = 32;

function readStored(): number {
  if (typeof window === "undefined") return RAIL_DEFAULT_PX;
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value >= RAIL_MIN_PX ? value : RAIL_DEFAULT_PX;
  } catch {
    return RAIL_DEFAULT_PX;
  }
}

function store(width: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  } catch {
    // Storage blocked: the width still applies for this page.
  }
}

/**
 * Rail width state, clamped to the grid it lives in. Attach `containerRef` to
 * the two-column grid; its content width sets how wide the rail may grow. It is
 * a callback ref because the grid mounts only after the workspace has loaded.
 */
export function useResizableRail() {
  const [width, setWidth] = useState(RAIL_DEFAULT_PX);
  const [maxWidth, setMaxWidth] = useState(Number.POSITIVE_INFINITY);
  const [container, containerRef] = useState<HTMLElement | null>(null);

  // Read after mount so the server render and the first client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only preference
    setWidth(readStored());
  }, []);

  useEffect(() => {
    const el = container;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setMaxWidth(Math.max(RAIL_MIN_PX, inner - HANDLE_PX - MAIN_MIN_PX));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [container]);

  const clamp = useCallback((value: number) => Math.min(Math.max(value, RAIL_MIN_PX), maxWidth), [maxWidth]);

  const set = useCallback(
    (value: number, persist = true) => {
      const next = clamp(value);
      setWidth(next);
      if (persist) store(next);
    },
    [clamp],
  );

  return { width: clamp(width), min: RAIL_MIN_PX, max: maxWidth, set, containerRef };
}

export function RailResizeHandle({
  width,
  min,
  max,
  onResize,
}: {
  width: number;
  min: number;
  max: number;
  /** `persist` is false while dragging and true on release. */
  onResize: (width: number, persist?: boolean) => void;
}) {
  const drag = useRef<{ startX: number; startWidth: number; last: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width, last: width };
    setDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // The rail is on the right: dragging left makes it wider.
    const next = drag.current.startWidth + (drag.current.startX - event.clientX);
    drag.current.last = next;
    onResize(next, false);
  };

  const endDrag = () => {
    if (!drag.current) return;
    onResize(drag.current.last, true);
    drag.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? STEP_PX * 3 : STEP_PX;
    let next: number | undefined;
    if (event.key === "ArrowLeft") next = width + step;
    else if (event.key === "ArrowRight") next = width - step;
    else if (event.key === "Home") next = RAIL_DEFAULT_PX;
    else if (event.key === "End" && Number.isFinite(max)) next = max;
    if (next === undefined) return;
    event.preventDefault();
    onResize(next, true);
  };

  const finiteMax = Number.isFinite(max) ? Math.round(max) : undefined;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize patient panel"
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={finiteMax}
      aria-valuetext={`Patient panel ${Math.round(width)} pixels wide`}
      title="Drag to resize the patient panel. Double-click to reset."
      tabIndex={0}
      data-slot="rail-resize-handle"
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onResize(RAIL_DEFAULT_PX, true)}
      onKeyDown={onKeyDown}
      className="group order-2 hidden w-4 cursor-col-resize touch-none self-stretch outline-none lg:block"
    >
      {/* Sticky so the grip stays in view however long the SOAP column is. */}
      <div className="sticky top-4 flex h-[calc(100dvh-2.5rem)] items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-(--border-default) group-focus-visible:bg-(--teal-700) motion-reduce:transition-none",
            dragging && "bg-(--teal-700)",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "relative flex h-10 w-3 items-center justify-center rounded-full border border-(--border-subtle) bg-(--surface-card) text-(--text-subtle) transition-colors group-hover:border-(--border-default) group-hover:text-(--text-muted) group-focus-visible:border-(--teal-700) group-focus-visible:ring-3 group-focus-visible:ring-(--focus-ring)/30 motion-reduce:transition-none",
            dragging && "border-(--teal-700) text-(--teal-750)",
          )}
        >
          <GripVertical className="size-3" />
        </span>
      </div>
    </div>
  );
}
