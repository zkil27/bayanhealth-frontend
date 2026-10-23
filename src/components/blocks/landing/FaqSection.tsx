import { ArrowRight } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { FAQ_CONTENT, WAITLIST_CTA, type FaqItem } from "./content";
import { LandingButton } from "./LandingButton";
import { LandingMedia } from "./LandingMedia";

/**
 * "Common questions" — the pre-consult FAQ.
 *
 * Sits straight on the cream page, not inside a white card: the bands either
 * side (stories, waitlist) are white, and a card here was the fourth boxed
 * section in a row. The questions are a ruled list rather than separate boxes,
 * each trigger at least 48px tall with 16px text.
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
      className="mx-auto max-w-7xl scroll-mt-16 px-4 py-16 lg:px-8 lg:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2
              id="faq-heading"
              className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-(--text-heading) md:text-[2.75rem] md:leading-[1.1]"
            >
              {FAQ_CONTENT.heading}
            </h2>
            <p className="text-base leading-relaxed text-(--text-muted)">
              {FAQ_CONTENT.subheading}
            </p>
          </div>

          <Accordion
            defaultValue={["faq-0"]}
            className="border-t border-(--border-default)"
          >
            {items.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                data-slot="faq-item"
                className="border-b border-(--border-default)"
              >
                <AccordionTrigger className="min-h-12 items-center gap-4 rounded-(--radius-sm) py-4 text-base font-bold text-(--text-heading) hover:text-(--status-available-fg) hover:no-underline **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-(--text-muted)">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-[62ch] pb-5 text-base leading-relaxed text-(--text-muted)">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div>
            <LandingButton href={WAITLIST_CTA.href}>
              {WAITLIST_CTA.label}
              <ArrowRight className="size-4" aria-hidden />
            </LandingButton>
          </div>
        </div>

        <LandingMedia
          src={FAQ_CONTENT.imageSrc}
          alt={FAQ_CONTENT.imageAlt}
          className="hidden aspect-[4/3] w-full sm:block lg:sticky lg:top-24 lg:aspect-auto lg:h-[28rem] lg:self-start"
          sizes="(min-width: 1024px) 45vw, 100vw"
        />
      </div>
    </section>
  );
}
