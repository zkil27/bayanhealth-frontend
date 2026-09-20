"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AUTHORITY_BADGES,
  MEDICAL_PROTOCOLS,
  PROTOCOL_FILTERS,
  ProtocolArticle,
  getProtocolBySlug,
  safeguardSummary,
} from "@/components/blocks/landing";
import { cardHoverClass } from "@/features/patient/components/redesign/primitives";

const BASE_HREF = "/patient/health?tab=medhub";

/**
 * The Med Hub, rendered inside the patient shell on the Health page.
 *
 * Same corpus as the public `/medical-hub` (`MEDICAL_PROTOCOLS`), but a signed-in
 * patient no longer gets bounced into the landing chrome to read a guideline.
 * `?protocol=<slug>` selects one for the full read; without it, the category
 * filter and the card grid are shown.
 */
export function PatientMedHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("protocol");
  const protocol = slug ? getProtocolBySlug(slug) : null;

  const [activeFilter, setActiveFilter] = useState<string>(
    PROTOCOL_FILTERS[0]!.id,
  );

  const visible = useMemo(() => {
    const filter = PROTOCOL_FILTERS.find((f) => f.id === activeFilter);
    if (!filter?.category) return MEDICAL_PROTOCOLS;
    return MEDICAL_PROTOCOLS.filter((p) => p.category === filter.category);
  }, [activeFilter]);

  if (slug) {
    if (!protocol) {
      return (
        <div data-slot="patient-medhub-not-found" className="flex flex-col gap-3 py-6">
          <p className="text-[15px] text-(--text-muted)">
            That protocol could not be found.
          </p>
          <button
            type="button"
            onClick={() => router.replace(BASE_HREF, { scroll: false })}
            className="inline-flex w-fit items-center gap-2 text-[14px] font-bold text-(--status-available-fg)"
          >
            <ArrowLeft className="size-4" />
            Back to Med Hub
          </button>
        </div>
      );
    }
    return (
      <div data-slot="patient-medhub-article">
        <button
          type="button"
          onClick={() => router.replace(BASE_HREF, { scroll: false })}
          className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-(--text-muted) transition-colors hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Med Hub
        </button>
        {/* The article ships its own back links; point them at the in-shell
            index rather than the public one, and drop its page-sized padding. */}
        <div className="[&>article]:mx-0 [&>article]:max-w-none [&>article]:px-0 [&>article]:py-4 lg:[&>article]:px-0">
          <ProtocolArticle protocol={protocol} backHref={BASE_HREF} />
        </div>
      </div>
    );
  }

  return (
    <div data-slot="patient-medhub" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-[15px] font-bold text-(--text-heading)">
          <BookOpen className="size-4 text-(--status-available-fg)" />
          Med Hub
        </p>
        <p className="text-[14px] leading-[1.5] text-(--text-muted)">
          DOH-aligned clinical guidelines and treatment protocols, written for you
          to read before or after a consultation.
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Guideline sources">
          {AUTHORITY_BADGES.map((badge) => (
            <li
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--border-default) bg-(--surface-brand-soft) px-2.5 py-1 text-[12px] font-bold text-(--text-heading)"
            >
              <BadgeCheck
                className="size-3.5 shrink-0 text-(--status-available-fg)"
                aria-hidden
              />
              {badge}
            </li>
          ))}
        </ul>
      </div>

      <div
        role="tablist"
        aria-label="Filter protocols by category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {PROTOCOL_FILTERS.map((filter) => {
          const isActive = filter.id === activeFilter;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center rounded-(--radius-pill) border px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                isActive
                  ? "border-(--action-primary) bg-(--action-primary) text-(--action-primary-text)"
                  : "border-(--border-default) bg-(--surface-card) text-(--text-muted) hover:bg-(--action-secondary-hover-surface) hover:text-(--text-heading)",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-(--border-default) px-4 py-8 text-center text-[14px] text-(--text-muted)">
          Nothing published in this category yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((protocol) => (
            <li key={protocol.slug}>
              <Link
                href={`${BASE_HREF}&protocol=${protocol.slug}`}
                className={cn(
                  "group flex h-full flex-col gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  cardHoverClass,
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-2.5 py-0.5 text-[11px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
                    {protocol.category}
                  </span>
                  <span className="rounded-(--radius-pill) border border-(--border-default) px-2.5 py-0.5 text-[11px] font-medium text-(--text-muted)">
                    {protocol.authority}
                  </span>
                </div>
                <h3 className="font-display text-[16px] leading-snug font-bold text-(--text-heading)">
                  {protocol.title}
                </h3>
                <p className="line-clamp-3 text-[13.5px] leading-[1.5] text-(--text-muted)">
                  {protocol.excerpt}
                </p>
                <p className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-pill) bg-(--surface-sunken) px-2.5 py-1 text-[11.5px] font-bold text-(--text-heading)">
                  <ShieldCheck
                    className="size-3.5 shrink-0 text-(--status-available-fg)"
                    aria-hidden
                  />
                  {safeguardSummary(protocol)}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-(--status-available-fg) group-hover:underline">
                  Read protocol
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
