import { Quote } from "lucide-react";

import { TESTIMONIALS_CONTENT, type Testimonial } from "./content";

/**
 * "Stories from Filipino families" — illustrative consultation scenarios.
 *
 * Three short quotes. They are the kind of consult the product is built for
 * rather than statements from named patients on file, so the subheading says
 * so and every story carries an "Illustrative" tag: a quote screenshotted on
 * its own still reads honestly.
 *
 * Set as typography on a white band (quotes split by hairlines), not as a
 * third row of identical white cards.
 */
export function TestimonialsSection({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  return (
    <section
      id="stories"
      aria-labelledby="stories-heading"
      className="scroll-mt-16 border-y border-(--border-subtle) bg-(--surface-card) py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2
            id="stories-heading"
            className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-(--text-heading) md:text-[2.75rem] md:leading-[1.1]"
          >
            {TESTIMONIALS_CONTENT.heading}
          </h2>
          <p className="text-base leading-relaxed text-(--text-muted)">
            {TESTIMONIALS_CONTENT.subheading}
          </p>
        </div>

        <ul className="mt-10 grid divide-y divide-(--border-subtle) md:grid-cols-3 md:divide-x md:divide-y-0">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.quote}
              data-slot="testimonial"
              className="flex flex-col gap-5 py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0"
            >
              <div className="flex items-center justify-between gap-3">
                <Quote
                  className="size-6 text-(--status-available-fg)"
                  aria-hidden
                />
                <span className="rounded-(--radius-pill) border border-(--border-default) px-2.5 py-0.5 text-xs font-bold text-(--text-muted)">
                  {TESTIMONIALS_CONTENT.label}
                </span>
              </div>
              <blockquote className="flex-1 font-display text-lg leading-relaxed text-(--text-body)">
                {testimonial.quote}
              </blockquote>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold text-(--text-heading)">
                  {testimonial.attribution}
                </span>
                <span className="text-sm text-(--text-muted)">
                  {testimonial.context}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
