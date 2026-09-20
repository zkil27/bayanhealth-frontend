import { Activity } from "lucide-react";

import { JOURNEY_CONTENT, type StepItem } from "./content";

/**
 * "Your care doesn't end at the consult." — the care journey.
 *
 * Drawn on the brand teal, which is the design's one full-bleed colour block on
 * the page. It carries the product's actual differentiator: the consultation is
 * step one of four, and the summary, prescription, and follow-up routing that
 * come after it are the reason to choose this over a phone call.
 */
export function HowItWorksSection({ steps }: { steps: StepItem[] }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="journey-heading"
      className="scroll-mt-20 bg-(--surface-inverse) py-14 lg:py-20"
    >
      <div id="paano-ito-gumagana" className="mx-auto max-w-7xl scroll-mt-20 px-4 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-(--text-on-accent)/75 uppercase">
            <Activity className="size-4" aria-hidden />
            {JOURNEY_CONTENT.eyebrow}
          </p>
          <h2
            id="journey-heading"
            className="font-display text-3xl font-bold text-balance text-(--text-on-accent) md:text-4xl"
          >
            {JOURNEY_CONTENT.heading}
          </h2>
          <p className="text-[15px] leading-relaxed text-(--text-on-accent)/80">
            {JOURNEY_CONTENT.subheading}
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.number}
              className="group flex flex-col items-center gap-3 rounded-(--radius-lg) p-4 text-center ring-1 ring-transparent transition duration-200 ease-out hover:-translate-y-2 hover:bg-(--text-on-accent)/10 hover:shadow-(--shadow-lg) hover:ring-(--text-on-accent)/25 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span
                aria-hidden
                className={`flex size-14 items-center justify-center rounded-full shadow-(--shadow-sm) transition duration-200 ease-out group-hover:scale-110 group-hover:shadow-(--shadow-md) motion-reduce:transition-none ${
                  // The first step is filled to mark where the journey starts;
                  // the rest are the same shape in reverse, so the row reads as
                  // one sequence rather than four unrelated badges.
                  step.number === 1
                    ? "bg-(--surface-brand) text-(--text-on-brand)"
                    : "bg-(--surface-card) text-(--status-available-fg)"
                }`}
              >
                <step.icon className="size-6" />
              </span>
              <h3 className="text-[15px] font-bold text-(--text-on-accent)">
                {step.number} · {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-(--text-on-accent)/75">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
