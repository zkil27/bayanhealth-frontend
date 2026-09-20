import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

import type {
  LegalBlock,
  LegalDocument,
  LegalListItem,
  LegalSection,
} from "./legalContent";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/** A numbered anchor list, shared by the sticky sidebar and the mobile accordion. */
function TableOfContents({
  sections,
  className,
  "aria-label": ariaLabel,
}: {
  sections: LegalSection[];
  className?: string;
  "aria-label": string;
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <p className="text-xs font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
        On this page
      </p>
      <ol className="mt-3 flex flex-col gap-1">
        {sections.map((section, index) => (
          <li key={section.id}>
            <Link
              href={`#${section.id}`}
              className={`block rounded-md py-1.5 text-sm text-(--text-muted) transition-colors hover:text-(--text-heading) ${focusRing}`}
            >
              {index + 1}. {section.heading}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ListItems({ items }: { items: LegalListItem[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-(--text-body)">
      {items.map((item) => {
        const text = typeof item === "string" ? item : item.text;
        const children = typeof item === "string" ? undefined : item.items;
        return (
          <li key={text}>
            {text}
            {children && children.length > 0 && (
              <ul className="mt-2 flex list-[circle] flex-col gap-1.5 pl-5 text-(--text-muted)">
                {children.map((child) => (
                  <li key={child}>{child}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-(--text-body)">
          {block.text}
        </p>
      );
    case "subheading":
      return (
        <h3 className="font-display text-base font-bold text-(--text-heading)">
          {block.text}
        </h3>
      );
    case "list":
      return <ListItems items={block.items} />;
  }
}

/**
 * A static legal / policy document, read end to end.
 *
 * Data-driven like {@link ProtocolArticle}, and capped to `max-w-3xl` for the
 * same reason: this is prose, and a clause set 120 characters wide is one the
 * reader loses their place in. With `withTableOfContents` the page widens to a
 * two-column grid on `lg` — a sticky anchor sidebar beside the column — and
 * falls back to a `<details>` accordion above the content on smaller screens.
 * Smooth scrolling is inherited from the global `scroll-smooth` on `<html>`;
 * each section carries `scroll-mt-24` so its heading clears the fixed header.
 */
export function LegalArticle({
  document,
  withTableOfContents = false,
}: {
  document: LegalDocument;
  withTableOfContents?: boolean;
}) {
  const header = (
    <>
      <Link
        href="/"
        className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-(--text-muted) transition-colors hover:text-(--text-heading) ${focusRing}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to home
      </Link>

      <header className="mt-4 flex flex-col gap-3 border-b border-(--border-subtle) pb-6">
        <span className="inline-flex w-fit items-center rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
          {document.eyebrow}
        </span>
        <h1 className="font-display text-3xl leading-snug font-bold text-(--text-heading) md:text-4xl">
          {document.title}
        </h1>
        <p className="text-sm text-(--text-muted)">
          Last Updated: {document.lastUpdated}
        </p>
      </header>
    </>
  );

  const body = (
    <>
      {document.intro.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {document.intro.map((paragraph) => (
            <p
              key={paragraph}
              className="text-[15px] leading-relaxed text-(--text-body)"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-10">
        {document.sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 flex flex-col gap-3"
          >
            <h2 className="font-display text-xl font-bold text-(--text-heading)">
              {index + 1}. {section.heading}
            </h2>
            {section.blocks.map((block, blockIndex) => (
              <Block key={blockIndex} block={block} />
            ))}
          </section>
        ))}
      </div>
    </>
  );

  if (!withTableOfContents) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-14 lg:px-8 lg:py-20">
        {header}
        {body}
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-14 lg:px-8 lg:py-20">
      {header}

      {/* Mobile / tablet: collapsible menu above the content. */}
      <details className="group mt-8 lg:hidden">
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-2 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-card) px-4 py-3 text-sm font-bold text-(--text-heading) [&::-webkit-details-marker]:hidden ${focusRing}`}
        >
          On this page
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="px-1 pt-3">
          <TableOfContents
            sections={document.sections}
            aria-label="Table of contents"
          />
        </div>
      </details>

      <div className="mt-4 lg:mt-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        {/* Desktop: sticky sidebar beside the column. */}
        <TableOfContents
          sections={document.sections}
          aria-label="Table of contents"
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
        />
        <div className="max-w-3xl">{body}</div>
      </div>
    </article>
  );
}
