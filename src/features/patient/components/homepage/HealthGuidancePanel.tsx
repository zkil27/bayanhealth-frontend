"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Newspaper } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  MEDICAL_PROTOCOLS,
  type ProtocolCategory,
} from "@/components/blocks/landing";
import {
  Card,
  cardHoverClass,
} from "@/features/patient/components/redesign/primitives";

import { DailyTipBody } from "./DailyTipCard";

/**
 * "Health guidance" — the page's one editorial surface, split into three tabs
 * so the Med Hub, longer-form writing, and the day's tip share a card instead
 * of each claiming its own band on the page.
 *
 * - **Med Hub** — real `MEDICAL_PROTOCOLS` entries with their real issuing
 *   authority, filtered by topic, linking into the in-shell hub on the Health
 *   page. Never the public `/medical-hub` landing chrome.
 * - **Articles** — see {@link HEALTH_ARTICLES}. Nothing is published yet, so the
 *   tab says so rather than inventing posts.
 * - **Daily tip** — the same tip and physician the Health page shows.
 */

type TabId = "medhub" | "articles" | "tip";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "medhub", label: "Med Hub" },
  { id: "articles", label: "Articles" },
  { id: "tip", label: "Daily tip" },
];

/**
 * Long-form patient writing, when there is any.
 *
 * **Deliberately empty.** There is no blog or article content anywhere in this
 * repository — no route, no corpus, no CMS — so there is nothing to render and
 * nothing that may be invented: a fabricated health article with a made-up
 * byline is the same category of problem as a fabricated guideline citation.
 * Drop real entries in here and the tab lights up with no other change.
 */
export interface HealthArticle {
  slug: string;
  title: string;
  excerpt: string;
  /** Who wrote it — required, so a post can never appear unattributed. */
  author: string;
  publishedAt: string;
  href: string;
}

export const HEALTH_ARTICLES: readonly HealthArticle[] = [];

/** Topic pills, matching the categories the corpus actually uses. */
const TOPICS: ReadonlyArray<{
  label: string;
  category: ProtocolCategory | null;
}> = [
  { label: "All", category: null },
  { label: "General", category: "General" },
  { label: "Respiratory", category: "Respiratory" },
  { label: "Gastrointestinal", category: "Gastrointestinal" },
  { label: "Chronic/Non-Communicable", category: "Chronic/Non-Communicable" },
];

const VISIBLE = 3;

export function HealthGuidancePanel() {
  const [tab, setTab] = useState<TabId>("medhub");

  return (
    <section
      data-slot="patient-home-medhub"
      aria-labelledby="guidance-heading"
      className="flex h-full flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="guidance-heading"
          className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)"
        >
          Health guidance
        </h2>
        {tab === "medhub" ? (
          <Link
            href="/patient/health?tab=medhub"
            className="shrink-0 text-[14px] font-semibold text-(--text-heading) hover:text-(--text-link-hover)"
          >
            Open Med Hub
          </Link>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Health guidance sections"
        className="flex gap-1.5 self-start rounded-(--radius-pill) bg-(--surface-warm) p-1"
      >
        {TABS.map(({ id, label }) => {
          const isActive = id === tab;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-(--radius-pill) px-3 py-1.5 text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                isActive
                  ? "bg-(--surface-card) font-bold text-(--text-heading) shadow-(--shadow-xs)"
                  : "font-semibold text-(--text-muted) hover:text-(--text-heading)",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "medhub" ? (
        <MedHubTab />
      ) : tab === "articles" ? (
        <ArticlesTab />
      ) : (
        <TipTab />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- med hub -- */

function MedHubTab() {
  const [active, setActive] = useState<ProtocolCategory | null>(null);

  const shown = useMemo(() => {
    const pool = active
      ? MEDICAL_PROTOCOLS.filter((protocol) => protocol.category === active)
      : MEDICAL_PROTOCOLS;
    // Deliberately not "featured": nothing in the data marks a protocol as
    // featured, so ranking them would be invented order.
    return pool.slice(0, VISIBLE);
  }, [active]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div
        data-slot="patient-home-medhub-topics"
        role="group"
        aria-label="Filter guidance by topic"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {TOPICS.map((topic) => {
          const isActive = topic.category === active;
          return (
            <button
              key={topic.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(topic.category)}
              className={cn(
                "inline-flex min-h-8 shrink-0 snap-start items-center rounded-(--radius-pill) border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                isActive
                  ? "border-(--action-primary) bg-(--action-primary) text-(--action-primary-text)"
                  : "border-(--border-subtle) bg-(--surface-warm)/60 text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-body)",
              )}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      <ul className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {shown.map((protocol) => (
          <li key={protocol.slug}>
            <Link
              href={`/patient/health?tab=medhub&protocol=${protocol.slug}`}
              className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              {/* Recessed: this grid sits inside a white parent card, and a
                  white card on a white card is invisible. */}
              <Card
                className={`flex h-full flex-col justify-between gap-2 bg-(--surface-sunken) p-4 hover:border-(--border-strong) ${cardHoverClass}`}
              >
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2">
                    <BookOpen className="size-3.5 shrink-0 text-(--status-available-fg)" />
                    <span className="truncate text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                      {protocol.authority}
                    </span>
                  </span>
                  <span className="text-[14.5px] leading-[1.3] font-bold text-(--text-heading)">
                    {protocol.title}
                  </span>
                  <span className="line-clamp-3 text-[13px] leading-[1.45] text-(--text-muted)">
                    {protocol.excerpt}
                  </span>
                </div>
                <div className="mt-auto pt-3">
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-(--status-available-fg) group-hover:underline">
                    Read protocol <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- articles -- */

function ArticlesTab() {
  if (HEALTH_ARTICLES.length === 0) {
    return (
      <div
        data-slot="patient-home-articles-empty"
        className="flex flex-1 flex-col items-center justify-center gap-2 rounded-(--radius-md) border border-dashed border-(--border-default) bg-(--surface-sunken) px-4 py-10 text-center"
      >
        <Newspaper
          strokeWidth={1.5}
          aria-hidden
          className="size-7 text-(--text-subtle)"
        />
        <p className="text-[14px] font-semibold text-(--text-heading)">
          No articles published yet
        </p>
        <p className="max-w-sm text-[13px] leading-[1.5] text-(--text-muted)">
          When the BayanHealth team publishes longer reads, they will appear
          here. In the meantime the Med Hub carries the full clinical protocols.
        </p>
        <Link
          href="/patient/health?tab=medhub"
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-(--status-available-fg) hover:underline"
        >
          Browse the Med Hub
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <ul
      data-slot="patient-home-articles"
      className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3"
    >
      {HEALTH_ARTICLES.slice(0, VISIBLE).map((article) => (
        <li key={article.slug}>
          <Link
            href={article.href}
            className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            <Card
              className={`flex h-full flex-col gap-2 bg-(--surface-sunken) p-4 hover:border-(--border-strong) ${cardHoverClass}`}
            >
              <span className="text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
                {article.author}
              </span>
              <span className="text-[14.5px] leading-[1.3] font-bold text-(--text-heading)">
                {article.title}
              </span>
              <span className="line-clamp-3 text-[13px] leading-[1.45] text-(--text-muted)">
                {article.excerpt}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-semibold text-(--status-available-fg) group-hover:underline">
                Read article <span aria-hidden="true">→</span>
              </span>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- daily tip -- */

function TipTab() {
  return (
    <div
      data-slot="patient-home-tip"
      className="flex flex-1 flex-col gap-3 rounded-(--radius-md) border border-(--status-available-fg)/25 bg-(--surface-accent-soft) p-4"
    >
      <DailyTipBody />
    </div>
  );
}
