"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Check, Palette } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  CATEGORY_DESCRIPTION,
  CATEGORY_LABEL,
  DEFAULT_STYLES,
  ENTRY_CATEGORIES,
  HUES,
  PALETTE_HUES,
  getPaletteSnapshot,
  getServerPalette,
  savePalette,
  subscribeToPalette,
  swatchStyle,
  type CalendarPalette,
  type PaletteHue,
} from "./calendarColors";
import type { EntryCategory } from "./calendarEntries";

/**
 * The doctor's colour choices, held in `localStorage`.
 *
 * Read through `useSyncExternalStore` rather than `useState`: the first paint
 * happens on the server, where `window` does not exist, so the server snapshot
 * is the defaults and the stored palette takes over the moment hydration
 * finishes — no effect, and no cascading render. It also means the same calendar
 * open in a second tab repaints when colours change in the first.
 */
export function useCalendarPalette(): {
  palette: CalendarPalette;
  setCategory: (category: EntryCategory, hue: PaletteHue) => void;
  reset: () => void;
  persisted: boolean;
} {
  const palette = useSyncExternalStore(
    subscribeToPalette,
    getPaletteSnapshot,
    getServerPalette,
  );
  const [persisted, setPersisted] = useState(true);

  const setCategory = useCallback(
    (category: EntryCategory, hue: PaletteHue) => {
      // The pattern is deliberately not user-editable: it is what keeps two
      // categories distinguishable when a doctor picks the same hue for both,
      // and it is the channel a colour-blind reader relies on.
      const current = getPaletteSnapshot();
      setPersisted(
        savePalette({ ...current, [category]: { ...current[category], hue } }),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    setPersisted(savePalette({ ...DEFAULT_STYLES }));
  }, []);

  return { palette, setCategory, reset, persisted };
}

/**
 * The calendar's key, and where colours are changed.
 *
 * Every row states the same thing three ways — swatch treatment, name, and
 * description — so the legend doubles as the accessible explanation of a grid
 * that would otherwise rely on hue.
 */
export function CalendarLegend({
  palette,
  onChangeCategory,
  onReset,
  persisted,
}: {
  palette: CalendarPalette;
  onChangeCategory: (category: EntryCategory, hue: PaletteHue) => void;
  onReset: () => void;
  persisted: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    // `shrink-0`: this sits below the calendar card in a fixed-height column
    // where the card is the flexible member. Without it, a flex item's default
    // `flex-shrink: 1` would let an unusually tall picker state squeeze against
    // the card instead of the reverse, which is exactly backwards — the legend
    // is the thing that must always stay fully visible.
    <div data-slot="calendar-legend" className="flex shrink-0 flex-col gap-2 pt-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-(--text-muted)">
        {ENTRY_CATEGORIES.map((category) => (
          <span key={category} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-xs border"
              style={swatchStyle(palette[category])}
            />
            {CATEGORY_LABEL[category]}
          </span>
        ))}

        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          aria-expanded={editing}
          data-slot="calendar-legend-toggle"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-(--border-subtle) bg-(--surface-card) px-2.5 py-1 text-xs font-semibold text-(--text-muted) shadow-xs transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
        >
          <Palette className="size-3" aria-hidden="true" />
          {editing ? "Done" : "Colours"}
        </button>
      </div>

      {editing ? (
        <div
          data-slot="calendar-colour-picker"
          className="flex flex-col gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-4"
        >
          {ENTRY_CATEGORIES.map((category) => (
            <div key={category} className="flex flex-wrap items-center gap-3">
              <span
                aria-hidden
                className="size-4 shrink-0"
                style={swatchStyle(palette[category])}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold text-(--text-heading)">
                  {CATEGORY_LABEL[category]}
                </span>
                <span className="text-xs text-(--text-muted)">
                  {CATEGORY_DESCRIPTION[category]}
                </span>
              </span>
              <span
                role="radiogroup"
                aria-label={`Colour for ${CATEGORY_LABEL[category]}`}
                className="flex items-center gap-1"
              >
                {PALETTE_HUES.map((hue) => {
                  const selected = palette[category].hue === hue;
                  return (
                    <button
                      key={hue}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${HUES[hue].name} for ${CATEGORY_LABEL[category]}`}
                      onClick={() => onChangeCategory(category, hue)}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full transition-transform",
                        selected
                          ? "scale-110 ring-2 ring-(--focus-ring) ring-offset-1"
                          : "hover:scale-105",
                      )}
                      style={{ background: HUES[hue].strong }}
                    >
                      {selected ? (
                        <Check className="size-3.5" style={{ color: HUES[hue].onStrong }} />
                      ) : null}
                    </button>
                  );
                })}
              </span>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-(--border-subtle) pt-3">
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-(--text-muted) underline-offset-2 hover:text-(--text-heading) hover:underline"
            >
              Reset to defaults
            </button>
            {/*
              Said plainly rather than implied. There is no preferences endpoint,
              and a doctor who assumes these follow them to the clinic tablet
              would find the calendar unrecognisable there.
            */}
            <span className="ml-auto text-xs text-(--text-subtle)">
              {persisted
                ? "Colours are saved on this device only."
                : "This browser refused to save the change, so it will not survive a reload."}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
