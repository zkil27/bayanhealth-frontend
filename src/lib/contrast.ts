/**
 * WCAG contrast helper for the dual-theme verification harness.
 *
 * The semantic theme tokens in `src/app/globals.css` are expressed mostly in
 * `oklch(...)` (plus a few hex literals). To audit those tokens against the
 * WCAG 2.1 AA Contrast Standard we need to:
 *
 *  1. Parse `oklch(...)` and hex color strings into gamma-encoded sRGB.
 *  2. Convert OKLCH → OKLab → linear sRGB → gamma-encoded sRGB.
 *  3. Compute WCAG relative luminance from sRGB and the contrast ratio
 *     `(L1 + 0.05) / (L2 + 0.05)` where `L1` is the lighter of the two.
 *
 * This module is pure (no DOM, no runtime deps) so it can run inside the
 * deterministic Vitest contrast audit.
 */

/** Gamma-encoded sRGB color, each channel in the `[0, 1]` range. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A color expressed in the OKLab perceptual space. */
export interface OkLab {
  L: number;
  a: number;
  b: number;
}

/** Clamp a number into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --- Parsing -------------------------------------------------------------

/**
 * Parse a hex color string (`#rgb`, `#rrggbb`, or `#rrggbbaa`) into
 * gamma-encoded sRGB. Any alpha channel is parsed and discarded (contrast is
 * computed over opaque colors).
 *
 * @param hex - A hex color string, with or without a leading `#`.
 * @returns The gamma-encoded sRGB color.
 * @throws If the string is not a recognised hex format.
 */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, "");

  let r: number;
  let g: number;
  let b: number;

  if (raw.length === 3 || raw.length === 4) {
    // #rgb / #rgba — each nibble is duplicated.
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
  } else if (raw.length === 6 || raw.length === 8) {
    // #rrggbb / #rrggbbaa
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Parse an `oklch(...)` color string into its OKLCH components.
 *
 * Accepts the formats used in `globals.css`, e.g.:
 *   - `oklch(0.53 0.09 175.87)`            (lightness as a 0–1 number)
 *   - `oklch(84.551% 0.00146 285.388)`     (lightness as a percentage)
 *   - `oklch(1.00 0 0 / 0.5)`              (optional alpha after a slash)
 *
 * Lightness is normalised to the `[0, 1]` range; chroma and hue (degrees) are
 * returned as-is. Any alpha component is tolerated and discarded.
 *
 * @param color - An `oklch(...)` color string.
 * @returns The parsed `{ L, C, H }` components.
 * @throws If the string is not a recognised `oklch(...)` value.
 */
export function parseOklch(color: string): { L: number; C: number; H: number } {
  const match = color.trim().match(/^oklch\(\s*([^)]*)\)$/i);
  if (!match) {
    throw new Error(`Invalid oklch color: "${color}"`);
  }

  // Drop an optional alpha component after a slash, then split on whitespace
  // and/or commas.
  const body = match[1].split("/")[0].trim();
  const parts = body.split(/[\s,]+/).filter(Boolean);

  if (parts.length < 3) {
    throw new Error(`Invalid oklch color: "${color}"`);
  }

  const lightnessToken = parts[0];
  const L = lightnessToken.endsWith("%")
    ? parseFloat(lightnessToken) / 100
    : parseFloat(lightnessToken);
  const C = parseFloat(parts[1]);
  const H = parseFloat(parts[2]);

  if (Number.isNaN(L) || Number.isNaN(C) || Number.isNaN(H)) {
    throw new Error(`Invalid oklch color: "${color}"`);
  }

  return { L, C, H };
}

// --- Color-space conversion ---------------------------------------------

/** Encode a single linear-light sRGB channel with the sRGB transfer function. */
function linearToGamma(channel: number): number {
  const c = clamp(channel, 0, 1);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Decode a single gamma-encoded sRGB channel to linear light. */
function gammaToLinear(channel: number): number {
  const c = clamp(channel, 0, 1);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert an OKLab color to gamma-encoded sRGB.
 *
 * OKLab → LMS (cubed) → linear sRGB → sRGB transfer function, with channels
 * clamped into the displayable `[0, 1]` gamut.
 */
export function okLabToRgb({ L, a, b }: OkLab): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: linearToGamma(rLinear),
    g: linearToGamma(gLinear),
    b: linearToGamma(bLinear),
  };
}

/** Convert OKLCH (hue in degrees) to OKLab. */
export function oklchToOkLab(L: number, C: number, H: number): OkLab {
  const hRad = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) };
}

/** Convert an `oklch(...)` color string to gamma-encoded sRGB. */
export function oklchToRgb(color: string): Rgb {
  const { L, C, H } = parseOklch(color);
  return okLabToRgb(oklchToOkLab(L, C, H));
}

/** Convert gamma-encoded sRGB to OKLab. */
export function rgbToOkLab({ r, g, b }: Rgb): OkLab {
  const lr = gammaToLinear(r);
  const lg = gammaToLinear(g);
  const lb = gammaToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// --- Public color parsing ------------------------------------------------

/**
 * Parse any supported color string (`oklch(...)` or hex) into gamma-encoded
 * sRGB.
 *
 * @param color - An `oklch(...)` or hex (`#rgb`/`#rrggbb`/`#rrggbbaa`) string.
 * @returns The gamma-encoded sRGB color.
 * @throws If the string is not a recognised color format.
 */
export function parseColor(color: string): Rgb {
  const trimmed = color.trim();
  if (/^oklch\(/i.test(trimmed)) {
    return oklchToRgb(trimmed);
  }
  if (trimmed.startsWith("#")) {
    return parseHex(trimmed);
  }
  // Tolerate bare hex without a leading '#'.
  if (/^[0-9a-f]{3,8}$/i.test(trimmed)) {
    return parseHex(trimmed);
  }
  throw new Error(`Unsupported color format: "${color}"`);
}

// --- WCAG contrast -------------------------------------------------------

/**
 * Compute the WCAG 2.1 relative luminance of a color.
 *
 * @param color - A color string (`oklch(...)`/hex) or an already-parsed {@link Rgb}.
 * @returns The relative luminance in `[0, 1]`.
 */
export function relativeLuminance(color: string | Rgb): number {
  const { r, g, b } = typeof color === "string" ? parseColor(color) : color;
  const R = gammaToLinear(r);
  const G = gammaToLinear(g);
  const B = gammaToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Compute the WCAG 2.1 contrast ratio between two colors.
 *
 * Uses `(L1 + 0.05) / (L2 + 0.05)` where `L1` is the lighter luminance, so the
 * result is symmetric and lies in `[1, 21]`.
 *
 * @param colorA - First color (string or {@link Rgb}).
 * @param colorB - Second color (string or {@link Rgb}).
 * @returns The contrast ratio in `[1, 21]`.
 */
export function contrast(colorA: string | Rgb, colorB: string | Rgb): number {
  const la = relativeLuminance(colorA);
  const lb = relativeLuminance(colorB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Perceived lightness of a color, suitable for ordering two colors by how
 * light they appear. Returns the OKLab lightness (`L`) component, which matches
 * the OKLCH lightness used in `globals.css` and is perceptually uniform — ideal
 * for the dark-`secondary` invariant (`secondary` L < `secondary-foreground` L).
 *
 * @param color - A color string (`oklch(...)`/hex) or an {@link Rgb}.
 * @returns The OKLab lightness in roughly `[0, 1]`.
 */
export function perceivedLightness(color: string | Rgb): number {
  if (typeof color === "string" && /^oklch\(/i.test(color.trim())) {
    // Use the authored lightness directly to avoid round-trip error.
    return parseOklch(color).L;
  }
  const rgb = typeof color === "string" ? parseColor(color) : color;
  return rgbToOkLab(rgb).L;
}
