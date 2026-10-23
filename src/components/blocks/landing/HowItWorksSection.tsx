import { JOURNEY_CONTENT, type StepItem } from "./content";

/**
 * "Your care doesn't end at the consult." — the care journey.
 *
 * Drawn on `--surface-inverse` (Brand Teal), the page's one full-bleed colour
 * block, directly under the hero: a visitor learns what happens before being
 * asked to sign up. It carries the product's actual differentiator: the
 * consultation is step one of four, and the summary, prescription, and
 * follow-up routing that come after it are the reason to choose this over a
 * phone call.
 *
 * All text is solid `--text-on-accent` rather than translucent white, the
 * most contrast the brand teal allows; hierarchy comes from size and weight
 * instead. The steps are not
 * interactive, so they do not lift on hover. On desktop a 1px rule runs behind
 * the step icons so the row reads as one sequence.
 */
export function HowItWorksSection({ steps }: { steps: StepItem[] }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="journey-heading"
      className="scroll-mt-16 bg-(--surface-inverse) py-16 lg:py-24"
    >
      <div id="paano-ito-gumagana" className="mx-auto max-w-7xl scroll-mt-16 px-4 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2
            id="journey-heading"
            className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-(--text-on-accent) md:text-[2.75rem] md:leading-[1.1]"
          >
            {JOURNEY_CONTENT.heading}
          </h2>
          <p className="text-base leading-relaxed text-(--text-on-accent) md:text-lg">
            {JOURNEY_CONTENT.subheading}
          </p>
        </div>

        <ol className="relative mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden
            // Runs from the first icon's centre to the last: column 4 starts at
            // 75% + 0.75 × gap (18px), plus half the 56px icon.
            className="absolute top-7 right-[calc(25%-46px)] left-7 hidden h-px bg-(--text-on-accent) opacity-40 lg:block"
          />
          {steps.map((step) => (
            <li key={step.number} className="relative flex gap-4 lg:flex-col">
              <span
                aria-hidden
                className={`flex size-14 shrink-0 items-center justify-center rounded-full ring-4 ring-(--surface-inverse) ${
                  // The first step is filled navy to mark where the journey
                  // starts; the rest are the same shape on white, so the row
                  // reads as one sequence rather than four unrelated badges.
                  step.number === 1
                    ? "bg-(--surface-brand) text-(--text-on-brand)"
                    : "bg-(--surface-card) text-(--status-available-fg)"
                }`}
              >
                <step.icon className="size-6" />
              </span>
              <div className="flex flex-col gap-1.5 pt-1 lg:pt-0">
                <h3 className="text-lg font-bold text-(--text-on-accent)">
                  <span className="tabular-nums">{step.number}.</span> {step.title}
                </h3>
                <p className="max-w-[34ch] text-base leading-relaxed text-(--text-on-accent)">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
