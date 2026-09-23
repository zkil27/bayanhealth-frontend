"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DRAG_SNAP_MINUTES,
  defaultRangeFrom,
  dragRangeToTimes,
  minutesAtOffset,
  normaliseDragRange,
  type DragRange,
} from "./calendarView";
import { CATEGORY_LABEL, styleFor, type CalendarPalette } from "./calendarColors";
import { formatTimeOfDay } from "./calendarView";
import { formatMinutesToTime } from "./slotPlan";
import { isAppointment, type CalendarEntry } from "./calendarEntries";
import { rectFromElement, rectFromPointer, type AnchorRect } from "./SchedulePopover";
import {
  blockPosition,
  computeGridBounds,
  formatBlockRange,
  formatHourLabel,
  hourMarks,
} from "./weekGridLayout";

/**
 * How much a block can say, given how tall it actually is.
 *
 * This is the fix for text being sliced in half. A block's height was a
 * percentage of the grid with a 4% floor — on a 360px week that is 14px, while
 * the two-line label inside it needs about 40px — so every short consultation
 * rendered its own text clipped, and inflating the floor only made neighbouring
 * blocks overlap instead.
 *
 * Height is now resolved to pixels first and the label is chosen to fit it: two
 * lines when there is room, one when there is not, and the time alone when the
 * block is barely a sliver. Nothing is ever drawn into a space too small for it.
 */
export type BlockDensity = "full" | "compact" | "tiny";

/** Pixel heights at which more detail becomes legible rather than clipped. */
const DENSITY_FULL_PX = 40;
const DENSITY_COMPACT_PX = 22;
/** Never thinner than this, so a 15-minute block stays a clickable target. */
const MIN_BLOCK_PX = 16;

/**
 * The column body's height, shared by Day and Week so switching between them
 * cannot resize the calendar. Chosen so a standard hour-long slot in the
 * default 8am–6pm (600-minute) range still clears `DENSITY_FULL_PX`, and a
 * 30-minute one still lands in `tiny` rather than `compact` — preserving the
 * exact density behaviour doctors already see, just no longer split across
 * two different heights depending on which view is open.
 */
const GRID_BODY_HEIGHT_PX = 580;

export function densityForHeight(heightPx: number): BlockDensity {
  if (heightPx >= DENSITY_FULL_PX) return "full";
  if (heightPx >= DENSITY_COMPACT_PX) return "compact";
  return "tiny";
}

/** A time range the doctor has just marked out, and where on screen they did it. */
export interface GridSelection extends DragRange {
  date: string;
  /** Where the availability popover should point. */
  anchor: AnchorRect;
}

/**
 * What a block says.
 *
 * An appointment leads with what it *is* — the category word — because that is
 * the question a doctor scanning their day is answering. Availability leads with
 * its hours, because that is what is being managed rather than attended.
 */
function EntryLabel({
  entry,
  density,
}: {
  entry: CalendarEntry;
  density: BlockDensity;
}) {
  const range = formatBlockRange(entry.startMinutes, entry.endMinutes);

  if (!isAppointment(entry)) {
    return (
      <span
        className={cn(
          "block truncate leading-none font-bold",
          density === "full" ? "text-sm" : "text-xs",
        )}
      >
        {entry.category === "blocked" ? "Blocked" : range}
        {density === "full" && entry.notes ? ` · ${entry.notes}` : ""}
      </span>
    );
  }

  const restricted = entry.booking === undefined;
  const label = CATEGORY_LABEL[entry.category];

  /*
    Too thin for words: the start time is the one thing that still has to be
    right, and the full description is on the button's `title`.

    Deliberately not `formatBlockRange` here — that is hour-only, so a
    thirty-minute consultation rendered as "10–10", which is worse than saying
    nothing. A single start time is unambiguous at any block height.
  */
  if (density === "tiny") {
    return (
      <span className="block truncate text-[0.625rem] leading-none font-bold">
        {formatTimeOfDay(formatMinutesToTime(entry.startMinutes))}
      </span>
    );
  }

  // One line: category and hours together rather than stacked.
  if (density === "compact") {
    return (
      <span className="flex items-center gap-1 truncate text-xs leading-none font-bold">
        {entry.category === "onDemand" ? (
          <Zap className="size-3 shrink-0" aria-hidden="true" />
        ) : null}
        {restricted ? <Lock className="size-3 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate">
          {range} · {label}
        </span>
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1 text-sm leading-tight font-bold">
        {entry.category === "onDemand" ? (
          <Zap className="size-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        {restricted ? (
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-xs leading-tight opacity-85">{range}</span>
    </div>
  );
}

/** One published block or consultation, drawn in place on the clock. */
function EntryButton({
  entry,
  palette,
  gridStart,
  gridEnd,
  bodyHeightPx,
  onSelectEntry,
}: {
  entry: CalendarEntry;
  palette: CalendarPalette;
  gridStart: number;
  gridEnd: number;
  /** The column body's height, so a percentage can be resolved to pixels. */
  bodyHeightPx: number;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
}) {
  const { topPct, heightPct } = blockPosition(entry, gridStart, gridEnd);
  const heightPx = Math.max((heightPct / 100) * bodyHeightPx, MIN_BLOCK_PX);
  const density = densityForHeight(heightPx);
  const solid = palette[entry.category].pattern === "solid";
  const title = `${formatBlockRange(entry.startMinutes, entry.endMinutes)} · ${
    CATEGORY_LABEL[entry.category]
  }${entry.notes ? ` · ${entry.notes}` : ""}`;

  return (
    <button
      type="button"
      data-slot="calendar-entry"
      data-category={entry.category}
      data-density={density}
      title={title}
      aria-label={`${CATEGORY_LABEL[entry.category]} ${formatBlockRange(
        entry.startMinutes,
        entry.endMinutes,
      )} on ${entry.date}`}
      onClick={(event) => onSelectEntry(entry, rectFromElement(event.currentTarget))}
      className={cn(
        "absolute right-1 left-1 z-10 flex flex-col justify-center overflow-hidden rounded-[10px] text-left transition-all duration-150",
        "hover:z-20 hover:shadow-[0_2px_6px_rgba(120,110,80,0.18)]",
        solid ? "hover:brightness-110" : "hover:brightness-95",
        // Padding scales with the space available; a 30-minute block cannot
        // afford 8px of vertical padding and its own text.
        density === "full" ? "px-2.5 py-2" : density === "compact" ? "px-2 py-1" : "px-1.5 py-0",
      )}
      style={{
        top: `${topPct}%`,
        height: `${heightPx}px`,
        ...styleFor(palette[entry.category]),
      }}
    >
      <EntryLabel entry={entry} density={density} />
    </button>
  );
}

/**
 * One day column: an hour-lined strip carrying this day's entries, a live "now"
 * line when it is today, and a pointer surface that turns a drag into a time
 * range.
 */
function DayColumn({
  date,
  label,
  sublabel,
  isToday,
  entries,
  palette,
  gridStart,
  gridEnd,
  nowMinutes,
  selection,
  onDragStart,
  onDragMove,
  onDragEnd,
  onSelectRange,
  onSelectEntry,
  minHeight,
  marks,
}: {
  date: string;
  label: string;
  sublabel?: string;
  isToday: boolean;
  entries: readonly CalendarEntry[];
  palette: CalendarPalette;
  gridStart: number;
  gridEnd: number;
  nowMinutes: number | null;
  selection: GridSelection | null;
  marks: readonly number[];
  onDragStart: (date: string, minutes: number, anchor: AnchorRect) => void;
  onDragMove: (minutes: number, gridEnd: number) => void;
  /** Returns true when the gesture produced a real range (so the click is spent). */
  onDragEnd: () => boolean;
  onSelectRange: (selection: GridSelection) => void;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
  minHeight: number;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const nowPct =
    isToday && nowMinutes !== null && nowMinutes >= gridStart && nowMinutes <= gridEnd
      ? ((nowMinutes - gridStart) / (gridEnd - gridStart || 1)) * 100
      : null;

  const minutesFromEvent = useCallback(
    (clientY: number): number => {
      const box = bodyRef.current?.getBoundingClientRect();
      if (!box) return gridStart;
      return minutesAtOffset({
        offsetY: clientY - box.top,
        height: box.height,
        gridStart,
        gridEnd,
      });
    },
    [gridStart, gridEnd],
  );

  const active = selection?.date === date ? selection : null;

  return (
    <div className="flex min-w-0 flex-col border-l border-(--border-subtle) first:border-l-0">
      <div
        className={cn(
          "flex h-11 items-center justify-center gap-2 border-b border-(--border-subtle) px-2 text-sm",
          isToday && "bg-(--surface-brand-soft)/15",
        )}
      >
        <span
          className={cn(
            "text-xs font-bold tracking-wider uppercase",
            isToday ? "text-(--action-primary)" : "text-(--text-muted)",
          )}
        >
          {label}
        </span>
        {sublabel ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-sm transition-colors",
              isToday
                ? "bg-(--action-primary) font-bold text-white shadow-xs"
                : "font-semibold text-(--text-heading)",
            )}
          >
            {sublabel}
          </span>
        ) : null}
      </div>

      {/*
        Two gestures share this surface, and they must not collide:

        - A *drag* marks out hours and proposes exactly that range.
        - A plain *click* proposes a default-length shift starting where the
          pointer landed, which is what Google Calendar does and what makes the
          quarter-hour grid usable without dragging at all.

        Both end in the same availability popover; they differ only in how the
        range is decided. A drag also emits a trailing `click`, so a completed
        drag consumes it via `suppressClickRef` — otherwise releasing a drag
        would immediately reopen the popover with the click's default range,
        discarding the range that was just dragged.
      */}
      <div
        ref={bodyRef}
        role="button"
        tabIndex={0}
        aria-label={`Add availability on ${date}`}
        onPointerDown={(event) => {
          // Left button only, and never when the press began on an existing
          // entry — that is a click on a block, not a new selection.
          if (event.button !== 0) return;
          if ((event.target as HTMLElement).closest("[data-slot='calendar-entry']")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          onDragStart(date, minutesFromEvent(event.clientY), rectFromPointer(event));
        }}
        onPointerMove={(event) => {
          // Deliberately not gated on `active`, which is derived from a
          // *committed* render: a pointer that moves before React has painted
          // the press would have its first movement dropped, and with it the
          // fact that this gesture is a drag rather than a click. The grid owns
          // the live gesture and ignores a move with no press behind it.
          onDragMove(minutesFromEvent(event.clientY), gridEnd);
        }}
        onPointerUp={() => {
          if (onDragEnd()) suppressClickRef.current = true;
        }}
        onPointerCancel={() => {
          onDragEnd();
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-slot='calendar-entry']")) return;
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onSelectRange({
            date,
            ...defaultRangeFrom(minutesFromEvent(event.clientY)),
            anchor: rectFromPointer(event),
          });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          // A keyboard user cannot drag, so the column's own box anchors the
          // popover and the range starts at the top of the visible window.
          onSelectRange({
            date,
            ...defaultRangeFrom(gridStart),
            anchor: rectFromElement(event.currentTarget),
          });
        }}
        className={cn(
          "relative flex-1 touch-none px-1 pt-0.5 text-left select-none",
          isToday ? "bg-(--surface-brand-soft)/10" : "bg-(--surface-card)",
        )}
        style={{ minHeight }}
      >
        {/* Crisp horizontal grid lines for each hour and half-hour guideline */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {marks.map((m) => {
            const topPct = ((m - gridStart) / (gridEnd - gridStart || 1)) * 100;
            const hourSpanPct = (60 / (gridEnd - gridStart || 1)) * 100;
            return (
              <div
                key={m}
                className="absolute inset-x-0 border-t border-(--border-subtle)/50"
                style={{ top: `${topPct}%` }}
              >
                {/* Half-hour guideline */}
                <div
                  className="absolute inset-x-0 border-t border-dashed border-(--border-subtle)/20"
                  style={{ top: `${hourSpanPct / 2}%` }}
                />
              </div>
            );
          })}
        </div>

        {entries.map((entry) => (
          <EntryButton
            key={entry.id}
            entry={entry}
            palette={palette}
            gridStart={gridStart}
            gridEnd={gridEnd}
            bodyHeightPx={minHeight}
            onSelectEntry={onSelectEntry}
          />
        ))}

        {/* The range being dragged, drawn as a ghost until the pointer is released. */}
        {active ? (
          <div
            aria-hidden
            data-slot="drag-selection"
            className="pointer-events-none absolute right-1 left-1 z-20 rounded-[10px] border-2 border-(--action-primary) bg-(--action-primary)/20 px-2.5 py-1"
            style={{
              top: `${blockPosition(active, gridStart, gridEnd).topPct}%`,
              height: `${Math.max(blockPosition(active, gridStart, gridEnd).heightPct, 2)}%`,
            }}
          >
            <span className="text-xs font-bold text-(--status-available-fg)">
              {dragRangeToTimes(active).startTime} – {dragRangeToTimes(active).endTime}
            </span>
          </div>
        ) : null}

        {nowPct !== null && (
          <div
            aria-hidden
            data-slot="now-line"
            className="pointer-events-none absolute right-0 left-0 z-20 h-0.5 bg-(--red-600)"
            style={{ top: `${nowPct}%` }}
          >
            <span className="absolute -top-1.25 -left-1.5 block size-3 rounded-full border-2 border-(--surface-card) bg-(--red-600) shadow-xs" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The day/week time grid.
 *
 * Drives both the single-day and seven-day views — they differ only in how many
 * columns they render, so they share one component rather than diverging.
 *
 * It draws {@link CalendarEntry} values, not slots: an accepted on-demand
 * consultation holds no slot at all, so a grid built from slots alone showed a
 * doctor an empty day while patients were waiting for them. Merging is
 * `calendarEntries.ts`'s job; this component only places what it is given.
 */
export function TimeGrid({
  days,
  entriesByDate,
  palette,
  todayIso,
  onSelectRange,
  onSelectEntry,
}: {
  days: { iso: string; label: string; sublabel?: string }[];
  entriesByDate: ReadonlyMap<string, CalendarEntry[]>;
  palette: CalendarPalette;
  todayIso: string;
  /** A completed drag, or a plain click: the day and the snapped range meant. */
  onSelectRange: (selection: GridSelection) => void;
  onSelectEntry: (entry: CalendarEntry, anchor: AnchorRect) => void;
}) {
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const anchorRef = useRef<number | null>(null);
  // Whether the pointer actually travelled far enough to mean a range. A press
  // that never moved is a click, and a click proposes a default-length shift
  // rather than an arbitrary quarter-hour one.
  const movedRef = useRef(false);
  /*
    The live selection, mirrored so `handleDragEnd` can read it synchronously
    and report whether the gesture produced a range. Written only from the
    pointer handlers — never during render, which would be a render-phase side
    effect and is what the React Compiler rejects.
  */
  const selectionRef = useRef<GridSelection | null>(null);

  const entriesByDay = days.map((d) => entriesByDate.get(d.iso) ?? []);
  const { startMinutes, endMinutes } = computeGridBounds(entriesByDay);
  const marks = hourMarks(startMinutes, endMinutes);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // One shared body height for Day and Week alike.
  const minHeight = GRID_BODY_HEIGHT_PX;

  const handleDragStart = useCallback(
    (date: string, minutes: number, anchor: AnchorRect) => {
      anchorRef.current = minutes;
      movedRef.current = false;
      const next = { date, anchor, ...normaliseDragRange(minutes, minutes) };
      selectionRef.current = next;
      setSelection(next);
    },
    [],
  );

  /*
    `gridEnd` arrives from the column rather than being closed over from this
    component's own computed bounds. Closing over it made the handler depend on a
    value derived during render, which the React Compiler cannot prove stable —
    and the column already knows its own window, so passing it costs nothing.
  */
  const handleDragMove = useCallback((minutes: number, gridEnd: number) => {
    const anchorMinutes = anchorRef.current;
    const current = selectionRef.current;
    if (anchorMinutes === null || !current) return;
    if (minutes !== anchorMinutes) movedRef.current = true;
    const next = {
      date: current.date,
      anchor: current.anchor,
      ...normaliseDragRange(anchorMinutes, minutes, { gridEnd }),
    };
    selectionRef.current = next;
    setSelection(next);
  }, []);

  const handleDragEnd = useCallback((): boolean => {
    const current = selectionRef.current;
    const produced = movedRef.current && current !== null;
    if (produced && current) onSelectRange(current);
    selectionRef.current = null;
    anchorRef.current = null;
    movedRef.current = false;
    setSelection(null);
    return produced;
  }, [onSelectRange]);

  // A drag released outside the grid entirely still has to finish, otherwise the
  // ghost range would stay painted and the next click would extend it.
  useEffect(() => {
    if (!selection) return;
    const end = () => handleDragEnd();
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, [selection, handleDragEnd]);

  return (
    <div
      className="grid gap-x-0"
      style={{
        gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      <div className="relative flex flex-col">
        {/* Header spacer to match day column header */}
        <div className="h-11 border-b border-(--border-subtle)" aria-hidden="true" />

        {/* Time labels aligned exactly to each hour grid line */}
        <div className="relative select-none" style={{ height: minHeight }}>
          {marks.map((m) => {
            const topPct = ((m - startMinutes) / (endMinutes - startMinutes || 1)) * 100;
            return (
              <div
                key={m}
                className="absolute right-2.5 -translate-y-1/2 text-right text-xs font-semibold text-(--text-muted)"
                style={{ top: `${topPct}%` }}
              >
                {formatHourLabel(m)}
              </div>
            );
          })}
        </div>
      </div>
      {days.map((day) => (
        <DayColumn
          key={day.iso}
          date={day.iso}
          label={day.label}
          sublabel={day.sublabel}
          isToday={day.iso === todayIso}
          entries={entriesByDate.get(day.iso) ?? []}
          palette={palette}
          gridStart={startMinutes}
          gridEnd={endMinutes}
          nowMinutes={day.iso === todayIso ? nowMinutes : null}
          selection={selection}
          marks={marks}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onSelectRange={onSelectRange}
          onSelectEntry={onSelectEntry}
          minHeight={minHeight}
        />
      ))}
    </div>
  );
}

/** Re-exported so callers can size their own affordances to the same snap. */
export { DRAG_SNAP_MINUTES };
