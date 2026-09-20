import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import {
  MEDICAL_HUB_HREF,
  PROTOCOL_BACK_BOTTOM_LABEL,
  PROTOCOL_BACK_TOP_LABEL,
  PROTOCOL_WARNING_HEADING,
  type MedicalProtocol,
  type ProtocolBullet,
} from "./medicalHubContent";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

function BulletList({ bullets }: { bullets: ProtocolBullet[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-(--text-body)">
      {bullets.map((bullet) => (
        <li key={bullet.text}>
          {bullet.text}
          {bullet.children && (
            <ul className="mt-2 flex list-[circle] flex-col gap-1.5 pl-5 text-(--text-muted)">
              {bullet.children.map((child) => (
                <li key={child}>{child}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * One clinical protocol, read end to end.
 *
 * Measure is capped rather than run to the 7xl grid the rest of the landing
 * uses: this is the only surface on the site that is read as prose, and a
 * dosage line set 120 characters wide is a line a reader loses their place in.
 */
export function ProtocolArticle({
  protocol,
  backHref = MEDICAL_HUB_HREF,
}: {
  protocol: MedicalProtocol;
  /** Where the "back" links point. Defaults to the public hub index. */
  backHref?: string;
}) {
  const referenceHeading =
    protocol.references.length === 1 ? "Reference" : "References";

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 lg:px-8 lg:py-20">
      <Link
        href={backHref}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-(--text-muted) transition-colors hover:text-(--text-heading) ${focusRing}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {PROTOCOL_BACK_TOP_LABEL}
      </Link>

      <header className="mt-4 flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
          {protocol.category}
        </span>
        <h1 className="font-display text-3xl leading-snug font-bold text-(--text-heading) md:text-4xl">
          {protocol.title}
        </h1>
      </header>

      <div className="mt-10 flex flex-col gap-8">
        {protocol.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold text-(--text-heading)">
              {section.heading}
            </h2>
            {section.lead && (
              <p className="text-[15px] leading-relaxed text-(--text-muted)">
                {section.lead}
              </p>
            )}
            <BulletList bullets={section.bullets} />
          </section>
        ))}
      </div>

      <section
        data-slot="protocol-warning"
        aria-labelledby="protocol-warning-heading"
        className="mt-10 rounded-(--radius-card) border border-(--danger-border) bg-(--danger-bg) p-6 text-(--danger-fg)"
      >
        <h2
          id="protocol-warning-heading"
          className="flex items-center gap-2 font-display text-xl font-bold"
        >
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          {PROTOCOL_WARNING_HEADING}
        </h2>
        <p className="mt-3 text-xs font-bold tracking-(--tracking-overline) uppercase">
          {protocol.warning.heading}
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
          {protocol.warning.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-col gap-3 border-t border-(--border-subtle) pt-6">
        <h2 className="font-display text-lg font-bold text-(--text-heading)">
          {referenceHeading}
        </h2>
        <ul className="flex flex-col gap-3">
          {protocol.references.map((reference) => (
            <li
              key={reference.title}
              className="text-sm leading-relaxed text-(--text-muted)"
            >
              {reference.authors} ({reference.year}).{" "}
              <cite className="italic">{reference.title}</cite>.
            </li>
          ))}
        </ul>
      </section>

      <Link
        href={backHref}
        className={`mt-10 inline-flex min-h-11 items-center gap-2 rounded-(--radius-pill) border border-(--action-secondary-border) px-5 text-[15px] font-bold text-(--action-secondary-text) transition-colors hover:bg-(--action-secondary-hover-surface) ${focusRing}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {PROTOCOL_BACK_BOTTOM_LABEL}
      </Link>
    </article>
  );
}
