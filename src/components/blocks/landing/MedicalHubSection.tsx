"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, ShieldCheck, Stethoscope } from "lucide-react";

import { MED_HUB_CONVERSION } from "./content";
import {
  AUTHORITY_BADGES,
  MED_HUB_HERO,
  PROTOCOL_EMPTY_STATE,
  PROTOCOL_FILTERS,
  PROTOCOL_PREVIEW_LABEL,
  safeguardSummary,
  type MedicalProtocol,
} from "./medicalHubContent";
import { ProtocolWorkflowDrawer } from "./ProtocolWorkflowDrawer";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/**
 * The Medical Resource Hub as a capability showcase.
 *
 * The earlier version put each protocol's full referral list in a red panel on
 * the card. That was faithful to the source but wrong for this surface: eleven
 * red panels down a page read as an alarm, and a visitor deciding whether to
 * trust the product cannot act on any of them. The clinical text is not gone —
 * every red flag is now one click away in the workflow drawer, counted honestly
 * on the card by the safeguard pill.
 */
export function MedicalHubSection({
  protocols,
}: {
  protocols: MedicalProtocol[];
}) {
  const [activeFilter, setActiveFilter] = useState(PROTOCOL_FILTERS[0].id);
  // Kept after close so the drawer has content to render while it animates out.
  const [previewed, setPreviewed] = useState<MedicalProtocol | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visible = useMemo(() => {
    const filter = PROTOCOL_FILTERS.find((f) => f.id === activeFilter);
    if (!filter?.category) return protocols;
    return protocols.filter((p) => p.category === filter.category);
  }, [activeFilter, protocols]);

  function openPreview(protocol: MedicalProtocol) {
    setPreviewed(protocol);
    setDrawerOpen(true);
  }

  return (
    <section
      aria-labelledby="medical-hub-heading"
      className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20"
    >
      {/* --- Authority framing --- */}
      <div className="flex max-w-3xl flex-col gap-4">
        <h1
          id="medical-hub-heading"
          className="font-display text-3xl leading-snug font-bold text-(--text-heading) md:text-4xl"
        >
          {MED_HUB_HERO.headline}
        </h1>
        <p className="text-[15px] leading-relaxed text-(--text-muted) md:text-base">
          {MED_HUB_HERO.subtext}
        </p>
      </div>

      <ul
        data-slot="authority-badges"
        aria-label="Guideline sources"
        className="mt-6 flex flex-wrap gap-2"
      >
        {AUTHORITY_BADGES.map((badge) => (
          <li
            key={badge}
            className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-(--border-brand) bg-(--surface-brand-soft) px-3 py-1.5 text-xs font-bold text-(--text-heading) sm:text-sm"
          >
            <BadgeCheck
              className="size-4 shrink-0 text-(--status-available-fg)"
              aria-hidden
            />
            {badge}
          </li>
        ))}
      </ul>

      {/* --- Category filter --- */}
      <div
        role="tablist"
        aria-label="Filter protocols by category"
        // Scrolls rather than wraps on narrow screens so the pill row stays one
        // line at 375px and the grid below never shifts as filters change.
        className="mt-10 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-wrap lg:px-0"
      >
        {PROTOCOL_FILTERS.map((filter) => {
          const active = filter.id === activeFilter;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(filter.id)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-(--radius-pill) border px-4 text-sm font-bold whitespace-nowrap transition-colors ${focusRing} ${
                active
                  ? "border-(--border-brand) bg-(--action-primary) text-(--action-primary-text)"
                  : "border-(--border-default) bg-(--surface-card) text-(--text-muted) hover:bg-(--action-secondary-hover-surface) hover:text-(--text-heading)"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* --- Protocol grid --- */}
      {visible.length === 0 ? (
        <div
          data-slot="protocol-empty"
          className="mt-8 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-8 text-center"
        >
          <p className="font-display text-lg font-bold text-(--text-heading)">
            {PROTOCOL_EMPTY_STATE.heading}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-(--text-muted)">
            {PROTOCOL_EMPTY_STATE.body}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((protocol) => (
            <article
              key={protocol.slug}
              data-slot="protocol-card"
              className="flex h-full flex-col gap-4 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-6 shadow-(--shadow-card) transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-md)"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
                  {protocol.category}
                </span>
                <span className="rounded-(--radius-pill) border border-(--border-default) px-3 py-1 text-xs font-medium text-(--text-muted)">
                  {protocol.authority}
                </span>
              </div>

              <h2 className="font-display text-lg leading-snug font-bold text-(--text-heading)">
                {protocol.title}
              </h2>

              <p className="line-clamp-4 text-[15px] leading-relaxed text-(--text-muted)">
                {protocol.excerpt}
              </p>

              <p
                data-slot="safeguard-pill"
                className="inline-flex w-fit items-center gap-2 rounded-(--radius-pill) bg-(--surface-sunken) px-3 py-1.5 text-xs font-bold text-(--text-heading)"
              >
                <ShieldCheck
                  className="size-4 shrink-0 text-(--status-available-fg)"
                  aria-hidden
                />
                {safeguardSummary(protocol)}
              </p>

              <button
                type="button"
                onClick={() => openPreview(protocol)}
                className={`mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-(--radius-pill) border border-(--action-secondary-border) px-5 text-[15px] font-bold text-(--action-secondary-text) transition-colors hover:bg-(--action-secondary-hover-surface) ${focusRing}`}
              >
                {PROTOCOL_PREVIEW_LABEL}
                <ArrowRight className="size-4" aria-hidden />
                <span className="sr-only">: {protocol.title}</span>
              </button>
            </article>
          ))}
        </div>
      )}

      {/* --- Dual conversion --- */}
      <div
        data-slot="med-hub-conversion"
        className="mt-14 flex flex-col gap-5 rounded-(--radius-card) bg-(--surface-brand) p-8 text-(--text-on-brand) sm:p-10"
      >
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            {MED_HUB_CONVERSION.heading}
          </h2>
          <p className="text-[15px] leading-relaxed text-(--text-on-brand)/75">
            {MED_HUB_CONVERSION.body}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={MED_HUB_CONVERSION.patientCta.href}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--action-primary) px-5 text-[15px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) ${focusRing}`}
          >
            <Stethoscope className="size-4" aria-hidden />
            {MED_HUB_CONVERSION.patientCta.label}
          </Link>
          <Link
            href={MED_HUB_CONVERSION.partnerCta.href}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) border border-(--text-on-brand)/40 px-5 text-[15px] font-bold text-(--text-on-brand) transition-colors hover:bg-(--text-on-brand)/10 ${focusRing}`}
          >
            {MED_HUB_CONVERSION.partnerCta.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <ProtocolWorkflowDrawer
        protocol={previewed}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </section>
  );
}
