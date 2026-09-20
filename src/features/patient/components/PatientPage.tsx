import { cn } from "@/lib/utils";

/**
 * The content column every patient screen renders inside.
 *
 * Each screen used to declare its own width and padding, and they had all
 * drifted apart: Home capped at `5xl`, Health at `4xl`, Chat at `3xl`, Profile
 * at `2xl`, the booking directory at `4xl` with no padding of its own. Moving
 * between the five tabs therefore resized the content column every time, which
 * reads as the app being unsettled rather than as deliberate hierarchy.
 *
 * Two widths, chosen by what the screen is:
 *
 * - `wide` — dashboards and browsable collections, where a second column or a
 *   card grid genuinely uses the room: Home, Health, the booking paths.
 * - `narrow` — single columns of prose, rows or form fields, where a long
 *   measure is harder to read and a settings list stretched to `5xl` looks
 *   abandoned: Profile and the conversation list.
 *
 * Horizontal padding is identical in both, so the left edge of the content never
 * moves between tabs.
 *
 * A class helper rather than a wrapper component, deliberately: the screens are
 * already sections and articles with their own `data-slot` hooks and their own
 * gaps, and wrapping each in another element would add a layout node purely to
 * hold two classes.
 *
 * @param width - `wide` for dashboards, `narrow` for single-column reading.
 * @param extra - Screen-specific classes, e.g. a tighter `gap-*`.
 */
export function patientPageClass(
  width: "wide" | "narrow" = "wide",
  extra?: string,
): string {
  return cn(
    "mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5 px-4 pt-2 pb-8 sm:px-6 md:px-8",
    // `wide` fills modern widescreen space, spanning across the full available
    // width beside the floating rail.
    width === "wide"
      ? "md:max-w-none md:gap-6 lg:mx-0 lg:px-8"
      : "md:max-w-2xl",
    extra,
  );
}
