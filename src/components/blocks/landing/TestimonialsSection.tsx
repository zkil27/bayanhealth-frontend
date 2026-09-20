import { TESTIMONIALS_CONTENT, type Testimonial } from "./content";

/**
 * "Stories from Filipino families" — illustrative consultation scenarios.
 *
 * Three short quotes. They are the kind of consult the product is built for
 * rather than statements from named patients on file, matching the honesty the
 * rest of the page keeps about what exists today (see {@link CareTracksSection},
 * {@link LandingMedia}).
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
      className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-14 lg:px-8 lg:pb-20"
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <h2
          id="stories-heading"
          className="font-display text-3xl font-bold text-balance text-(--text-heading) md:text-4xl"
        >
          {TESTIMONIALS_CONTENT.heading}
        </h2>
        <p className="text-[15px] leading-relaxed text-(--text-muted)">
          {TESTIMONIALS_CONTENT.subheading}
        </p>
      </div>

      <ul className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <li
            key={testimonial.quote}
            data-slot="testimonial"
            className="flex h-full flex-col gap-4 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-6 shadow-(--shadow-card)"
          >
            <blockquote className="flex-1 text-[15px] leading-relaxed text-(--text-muted)">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-(--text-heading)">
                &mdash; {testimonial.attribution}
              </span>
              <span className="text-[13px] text-(--text-subtle)">
                {testimonial.context}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
