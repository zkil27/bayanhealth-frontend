/**
 * How each kind of block on the doctor's calendar looks, and how a doctor
 * changes it.
 *
 * Three rules this module exists to enforce:
 *
 * 1. **Never colour alone.** Every category carries a colour *and* a fill
 *    pattern *and* a word. The design tokens say as much ("status — text+icon,
 *    never color alone"), and roughly 1 in 12 men has a colour-vision deficiency
 *    — a calendar that distinguishes "booked" from "open" by hue alone is
 *    unreadable to them, and the consequence here is a missed consultation.
 * 2. **Custom colours cannot break contrast.** Doctors pick from a fixed set of
 *    hues, each shipped with a foreground chosen to stay legible on its own
 *    surface, rather than an arbitrary picker that can produce grey-on-grey.
 * 3. **Per-device, and honest about it.** Choices live in `localStorage`, so
 *    they do not follow a doctor to another machine. There is no preferences
 *    endpoint, and inventing one that silently forgets would be worse than
 *    saying where the setting lives — the picker labels it plainly.
 */

import type { EntryCategory } from "./calendarEntries";

/** A named hue a doctor can assign to a category. */
export type PaletteHue =
  | "teal"
  | "navy"
  | "violet"
  | "amber"
  | "rose"
  | "slate";

/**
 * Fill treatment, carried alongside hue so two categories sharing a colour are
 * still told apart — including by someone who cannot see the difference.
 */
export type FillPattern = "solid" | "soft" | "outline" | "hatched" | "dashed";

export interface CategoryStyle {
  hue: PaletteHue;
  pattern: FillPattern;
}

/** Every category the calendar can draw, in the order the legend lists them. */
export const ENTRY_CATEGORIES: readonly EntryCategory[] = [
  "open",
  "scheduled",
  "onDemand",
  "reservation",
  "blocked",
  "completed",
];

/** Short label shown on the block and in the legend. Never omitted. */
export const CATEGORY_LABEL: Record<EntryCategory, string> = {
  open: "Open",
  scheduled: "Scheduled",
  onDemand: "On-demand",
  reservation: "Reservation",
  blocked: "Blocked",
  completed: "Completed",
};

/** One-line explanation, for the legend and the picker. */
export const CATEGORY_DESCRIPTION: Record<EntryCategory, string> = {
  open: "Published and bookable by patients.",
  scheduled: "A confirmed consultation at a booked time.",
  onDemand: "A consultation you accepted from the request pool.",
  reservation: "Booked but not yet paid for or confirmed.",
  blocked: "Time you have taken out of offer.",
  completed: "Already happened.",
};

/**
 * The defaults.
 *
 * Chosen so the two things a doctor most needs to tell apart at a glance —
 * "someone is expecting me" versus "this is free" — differ in hue, fill and
 * word all at once, rather than being two shades of the same green.
 */
export const DEFAULT_STYLES: Record<EntryCategory, CategoryStyle> = {
  open: { hue: "teal", pattern: "outline" },
  scheduled: { hue: "navy", pattern: "solid" },
  onDemand: { hue: "violet", pattern: "solid" },
  reservation: { hue: "amber", pattern: "hatched" },
  blocked: { hue: "slate", pattern: "dashed" },
  completed: { hue: "slate", pattern: "soft" },
};

/**
 * Concrete colours per hue.
 *
 * Literal values rather than design tokens because a doctor's choice has to
 * resolve at runtime, and the token set has no per-hue triple. `strong` is used
 * for solid fills with `onStrong` text; `soft`/`border`/`text` are used by every
 * other pattern, and each pair was checked to clear 4.5:1.
 */
export const HUES: Record<
  PaletteHue,
  { name: string; strong: string; onStrong: string; soft: string; border: string; text: string }
> = {
  teal: {
    name: "Teal",
    strong: "#0f766e",
    onStrong: "#ffffff",
    soft: "#ccfbf1",
    border: "#5eead4",
    text: "#115e59",
  },
  navy: {
    name: "Navy",
    strong: "#1e3a5f",
    onStrong: "#ffffff",
    soft: "#dbe6f4",
    border: "#7c9cc4",
    text: "#1b3454",
  },
  violet: {
    name: "Violet",
    strong: "#5b21b6",
    onStrong: "#ffffff",
    soft: "#ede9fe",
    border: "#a78bfa",
    text: "#4c1d95",
  },
  amber: {
    name: "Amber",
    strong: "#92610a",
    onStrong: "#ffffff",
    soft: "#fef3c7",
    border: "#fbbf24",
    text: "#7c4a03",
  },
  rose: {
    name: "Rose",
    strong: "#9f1239",
    onStrong: "#ffffff",
    soft: "#ffe4e6",
    border: "#fb7185",
    text: "#881337",
  },
  slate: {
    name: "Slate",
    strong: "#475569",
    onStrong: "#ffffff",
    soft: "#f1f5f9",
    border: "#94a3b8",
    text: "#334155",
  },
};

export const PALETTE_HUES: readonly PaletteHue[] = [
  "teal",
  "navy",
  "violet",
  "amber",
  "rose",
  "slate",
];

/** Inline styles for one category, ready to spread onto a block. */
export function styleFor(style: CategoryStyle): React.CSSProperties {
  const hue = HUES[style.hue];
  switch (style.pattern) {
    case "solid":
      return { background: hue.strong, color: hue.onStrong, border: `1px solid ${hue.strong}` };
    case "soft":
      return { background: hue.soft, color: hue.text, border: `1px solid ${hue.border}` };
    case "outline":
      return {
        background: hue.soft,
        color: hue.text,
        border: `1.5px solid ${hue.border}`,
      };
    case "dashed":
      return {
        background: hue.soft,
        color: hue.text,
        border: `1.5px dashed ${hue.border}`,
      };
    case "hatched":
      // Diagonal stripes read as "not settled yet" at any size, and survive a
      // greyscale print of the day's list.
      return {
        backgroundColor: hue.soft,
        backgroundImage: `repeating-linear-gradient(45deg, ${hue.border} 0 2px, transparent 2px 7px)`,
        color: hue.text,
        border: `1.5px solid ${hue.border}`,
      };
    default:
      return { background: hue.soft, color: hue.text };
  }
}

/** A small swatch for legends and pickers, using the same treatment as the block. */
export function swatchStyle(style: CategoryStyle): React.CSSProperties {
  return { ...styleFor(style), borderRadius: 4 };
}

export type CalendarPalette = Record<EntryCategory, CategoryStyle>;

export const STORAGE_KEY = "bayan.doctor.calendar.palette.v1";

/** Narrow an unknown parsed value into a palette, falling back per category. */
export function normalisePalette(raw: unknown): CalendarPalette {
  const out = { ...DEFAULT_STYLES };
  if (!raw || typeof raw !== "object") return out;
  for (const category of ENTRY_CATEGORIES) {
    const candidate = (raw as Record<string, unknown>)[category];
    if (!candidate || typeof candidate !== "object") continue;
    const { hue, pattern } = candidate as Partial<CategoryStyle>;
    out[category] = {
      hue: hue && hue in HUES ? hue : DEFAULT_STYLES[category].hue,
      pattern: isPattern(pattern) ? pattern : DEFAULT_STYLES[category].pattern,
    };
  }
  return out;
}

function isPattern(value: unknown): value is FillPattern {
  return (
    value === "solid" ||
    value === "soft" ||
    value === "outline" ||
    value === "hatched" ||
    value === "dashed"
  );
}

/**
 * The palette as an external store, so React can read it without an effect.
 *
 * `localStorage` cannot be read while rendering on the server, and reading it in
 * a `useState` initialiser makes the first client render disagree with the
 * server's HTML. `useSyncExternalStore` is the sanctioned answer: it renders
 * {@link getServerPalette} during hydration and swaps to the stored value
 * immediately after, with no cascading render.
 *
 * The snapshot is memoised against the raw string because `getSnapshot` must
 * return a *stable reference* between changes — parsing fresh each call would
 * hand React a new object every time and spin it forever.
 */
let cachedRaw: string | null = null;
let cachedPalette: CalendarPalette = { ...DEFAULT_STYLES };
const listeners = new Set<() => void>();

/**
 * Every access is guarded: `localStorage` throws outright in some contexts
 * (Safari private browsing, blocked site data), and a calendar that refused to
 * render because a colour preference could not be read would be a far worse
 * failure than one that falls back to the defaults.
 */
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getPaletteSnapshot(): CalendarPalette {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    cachedPalette = parsed ? normalisePalette(parsed) : { ...DEFAULT_STYLES };
  }
  return cachedPalette;
}

/** What renders on the server and during hydration: always the defaults. */
export function getServerPalette(): CalendarPalette {
  return DEFAULT_STYLES;
}

/**
 * Subscribe to palette changes.
 *
 * `storage` covers the same calendar open in another tab; the local listener set
 * covers this tab's own writes, which `storage` deliberately does not fire for.
 */
export function subscribeToPalette(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Persist the palette. Returns false when storage refused, so the UI can say so. */
export function savePalette(palette: CalendarPalette): boolean {
  let ok = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
  } catch {
    ok = false;
  }
  // Publish either way: a refused write still has to repaint, otherwise the
  // doctor sees their click do nothing with no explanation.
  cachedRaw = ok ? readRaw() : cachedRaw;
  cachedPalette = palette;
  if (!ok) cachedRaw = " unsaved";
  for (const listener of listeners) listener();
  return ok;
}
