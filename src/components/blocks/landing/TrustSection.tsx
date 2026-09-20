import type { TrustItem } from "./content";

/**
 * The trust strip.
 *
 * A quiet band between the teal journey block and the footer, matching the
 * design: three claims, no heading competing with the two sections either side
 * of it. The section is still labelled for assistive technology — a visually
 * silent heading is not the same as an unlabelled region.
 */
export function TrustSection({ indicators }: { indicators: TrustItem[] }) {
  return (
    <section
      aria-labelledby="trust-heading"
      className="bg-(--surface-warm) py-10"
    >
      <h2 id="trust-heading" className="sr-only">
        Your data is safe with us
      </h2>
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 lg:px-8">
        {indicators.map((indicator) => (
          <li
            key={indicator.label}
            className="flex items-center gap-2 text-sm text-(--text-muted)"
          >
            <indicator.icon
              className="size-4 shrink-0 text-(--status-available-fg)"
              aria-hidden
            />
            {indicator.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
