import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

import { MEDICAL_PROTOCOLS } from "@/components/blocks/landing";
import { dashboardLinkClass } from "./dashboardLink";

/**
 * "Verified Clinical Protocols" — the left half of the sheet's bottom split row.
 *
 * Three real entries from {@link MEDICAL_PROTOCOLS} (the same corpus the Med Hub
 * screen reads), each deep-linking to its full read at
 * `/patient/health?tab=medhub&protocol=<slug>`. The titles and sources are the
 * data's own — nothing here is a hand-typed guideline name.
 */
const FEATURED_SLUGS = [
  "acute-bronchitis-protocol-pafp-mqic",
  "general-fever-management-protocol-who",
  "acute-infectious-diarrhea-protocol-philippine-cpg",
] as const;

const MED_HUB_HREF = "/patient/health?tab=medhub";

const featured = FEATURED_SLUGS.map((slug) =>
  MEDICAL_PROTOCOLS.find((protocol) => protocol.slug === slug),
).filter((protocol): protocol is (typeof MEDICAL_PROTOCOLS)[number] => !!protocol);

export function ClinicalProtocolsList() {
  return (
    <section
      data-slot="patient-home-protocols"
      aria-labelledby="protocols-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id="protocols-heading"
          className="text-[15px] font-bold text-(--text-heading)"
        >
          Verified clinical protocols
        </h3>
        <Link href={MED_HUB_HREF} className={dashboardLinkClass()}>
          Open Med Hub
          <ArrowUpRight />
        </Link>
      </div>

      <ul className="divide-y divide-(--border-subtle)">
        {featured.map((protocol) => (
          <li key={protocol.slug}>
            <Link
              href={`${MED_HUB_HREF}&protocol=${protocol.slug}`}
              className="group flex items-center gap-2.5 py-2.5 text-[13.5px] text-(--text-body) transition-colors hover:text-(--text-link-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              <BookOpen
                aria-hidden
                className="size-4 shrink-0 text-(--text-subtle) group-hover:text-(--text-link-hover)"
              />
              <span className="min-w-0 flex-1 font-medium">{protocol.title}</span>
              <ArrowUpRight
                aria-hidden
                className="size-3.5 shrink-0 text-(--text-subtle) transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--text-link-hover)"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
