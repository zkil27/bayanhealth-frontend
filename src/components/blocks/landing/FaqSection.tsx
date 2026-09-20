import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { FAQ_CONTENT, type FaqItem } from "./content";
import { LandingButton } from "./LandingButton";
import { LandingMedia } from "./LandingMedia";

/**
 * "Common questions" — the pre-consult FAQ.
 *
 * A single-open accordion: opening one answer collapses the last, so the column
 * stays short no matter how many questions it holds. The first item starts open
 * so the section isn't a wall of closed rows on load.
 *
 * The photograph has a fixed height and is `self-start` + `sticky`, so it never
 * resizes when an answer opens and never grows if more questions are added —
 * only the accordion column flexes.
 */
export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20"
    >
      <div className="grid gap-8 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-6 shadow-(--shadow-card) lg:grid-cols-2 lg:items-start lg:p-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2
              id="faq-heading"
              className="font-display text-3xl font-bold text-balance text-(--text-heading) md:text-4xl"
            >
              {FAQ_CONTENT.heading}
            </h2>
            <p className="text-[15px] leading-relaxed text-(--text-muted)">
              {FAQ_CONTENT.subheading}
            </p>
          </div>

          <Accordion defaultValue={["faq-0"]} className="flex flex-col gap-3">
            {items.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                data-slot="faq-item"
                className="rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-4"
              >
                <AccordionTrigger className="text-[15px] font-bold text-(--text-heading) hover:no-underline **:data-[slot=accordion-trigger-icon]:text-(--text-subtle)">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-(--text-muted)">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div>
            <LandingButton href={FAQ_CONTENT.cta.href}>
              {FAQ_CONTENT.cta.label}
            </LandingButton>
          </div>
        </div>

        <LandingMedia
          src={FAQ_CONTENT.imageSrc}
          alt={FAQ_CONTENT.imageAlt}
          className="aspect-[4/3] w-full lg:sticky lg:top-24 lg:aspect-auto lg:h-[26rem] lg:self-start"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>
    </section>
  );
}
