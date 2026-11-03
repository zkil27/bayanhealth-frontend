"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowUp, Plus, Search, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PREVIEW ONLY — the multi-diagnosis Assessment, for IT and clinical
 * governance to size. Nothing here is wired to the CDS contract.
 *
 * Pilot feedback (2026-11) asked for (1) ICD search by keyword or diagnosis
 * with dropdown suggestions, including common terms, and (2) several
 * diagnoses, each with its own ICD code, per consultation, after the
 * "Impression + Add ICD" list in the Aventus EMR doctors already use.
 *
 * Today the contract holds ONE `confirmed.diagnosis` + ONE `icd10`, and the
 * CDS gate computes drafting eligibility per diagnosis. Shipping this needs:
 *   - an ordered `diagnoses[]` on the Assessment (diagnosis, icd10, primary);
 *   - an ICD-10 dictionary search endpoint that matches names, codes and
 *     synonyms ("LBM", "high blood");
 *   - a gate rule for which diagnosis drives eligibility (proposed: primary).
 *
 * The rows below are illustrative sample data, not the BayanHealth ICD map.
 */

interface IcdEntry {
  code: string;
  name: string;
  /** Common terms a doctor or patient might type instead of the ICD name. */
  synonyms: readonly string[];
}

const SAMPLE_ICD: readonly IcdEntry[] = [
  { code: "J00", name: "Acute nasopharyngitis (common cold)", synonyms: ["common cold", "colds", "coryza", "URTI"] },
  { code: "J02.9", name: "Acute pharyngitis, unspecified", synonyms: ["sore throat", "pharyngitis"] },
  { code: "J02.0", name: "Streptococcal pharyngitis", synonyms: ["strep throat"] },
  { code: "J03.90", name: "Acute tonsillitis, unspecified", synonyms: ["tonsillitis", "tonsillopharyngitis"] },
  { code: "J11.1", name: "Influenza with other respiratory manifestations", synonyms: ["flu", "influenza", "ILI"] },
  { code: "A09", name: "Infectious gastroenteritis and colitis, unspecified", synonyms: ["LBM", "loose bowel movement", "diarrhea", "AGE"] },
  { code: "I10", name: "Essential (primary) hypertension", synonyms: ["high blood", "HPN", "hypertension", "HTN"] },
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications", synonyms: ["diabetes", "DM2", "T2DM", "sugar"] },
  { code: "N39.0", name: "Urinary tract infection, site not specified", synonyms: ["UTI", "bladder infection"] },
  { code: "R51", name: "Headache", synonyms: ["headache", "cephalgia"] },
  { code: "G43.9", name: "Migraine, unspecified", synonyms: ["migraine"] },
  { code: "K21.9", name: "Gastro-oesophageal reflux disease without oesophagitis", synonyms: ["GERD", "acid reflux", "hyperacidity"] },
  { code: "J45.9", name: "Asthma, unspecified", synonyms: ["asthma", "hika"] },
  { code: "L50.9", name: "Urticaria, unspecified", synonyms: ["hives", "urticaria", "allergy rash"] },
];

interface Impression {
  code: string;
  name: string;
}

interface Match {
  entry: IcdEntry;
  /** The synonym the query matched, when it was not the name or code. */
  via?: string;
}

function search(query: string, taken: ReadonlySet<string>): Match[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results: Match[] = [];
  for (const entry of SAMPLE_ICD) {
    if (taken.has(entry.code)) continue;
    if (entry.code.toLowerCase().startsWith(q) || entry.name.toLowerCase().includes(q)) {
      results.push({ entry });
      continue;
    }
    const via = entry.synonyms.find((term) => term.toLowerCase().includes(q));
    if (via) results.push({ entry, via });
  }
  return results.slice(0, 6);
}

export function ImpressionListPreview() {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [impressions, setImpressions] = useState<Impression[]>([
    { code: "J03.90", name: "Acute tonsillitis, unspecified" },
    { code: "I10", name: "Essential (primary) hypertension" },
  ]);

  const taken = useMemo(() => new Set(impressions.map((item) => item.code)), [impressions]);
  const matches = useMemo(() => search(query, taken), [query, taken]);
  const showList = open && query.trim().length >= 2;

  const add = (entry: IcdEntry) => {
    setImpressions((current) => [...current, { code: entry.code, name: entry.name }]);
    setQuery("");
    setHighlight(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (code: string) => setImpressions((current) => current.filter((item) => item.code !== code));

  const makePrimary = (code: string) =>
    setImpressions((current) => {
      const target = current.find((item) => item.code === code);
      return target ? [target, ...current.filter((item) => item.code !== code)] : current;
    });

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && showList && matches[highlight]) {
      event.preventDefault();
      add(matches[highlight].entry);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <section
      aria-labelledby="impressions-heading"
      className="w-full max-w-3xl rounded-2xl border border-(--border-default) bg-(--surface-card) p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="impressions-heading" className="text-base font-bold text-(--text-heading)">
          Assessment
        </h2>
        <span className="text-sm text-(--text-muted)">
          {impressions.length === 0
            ? "No diagnosis yet"
            : `${impressions.length} diagnos${impressions.length === 1 ? "is" : "es"}`}
        </span>
      </div>

      {/* Search: one field takes a diagnosis name, an ICD-10 code, or a common term. */}
      <div className="relative mt-3">
        <label htmlFor={`${listboxId}-input`} className="text-sm font-semibold text-(--text-body)">
          Add a diagnosis
        </label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-muted)"
            aria-hidden
          />
          <input
            ref={inputRef}
            id={`${listboxId}-input`}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={showList && matches[highlight] ? `${listboxId}-${matches[highlight].entry.code}` : undefined}
            autoComplete="off"
            value={query}
            placeholder="Type a diagnosis, ICD-10 code, or common term (e.g. LBM, high blood)"
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-xl border border-(--border-default) bg-(--surface-raised) pr-3 pl-9 text-base text-(--text-body) placeholder:text-(--text-muted) focus-visible:border-(--border-focus) focus-visible:ring-3 focus-visible:ring-(--focus-ring)/30 focus-visible:outline-none lg:h-10 lg:text-sm"
          />
        </div>

        {showList ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Diagnosis suggestions"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-raised) shadow-(--shadow-md)"
          >
            {matches.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-(--text-muted)">
                No match in the ICD-10 list. Check the spelling, or try the code.
              </li>
            ) : (
              matches.map(({ entry, via }, index) => (
                <li
                  key={entry.code}
                  id={`${listboxId}-${entry.code}`}
                  role="option"
                  aria-selected={index === highlight}
                  // mousedown, not click: the input's blur would close the list first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    add(entry);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3.5 py-2.5",
                    index === highlight && "bg-(--surface-accent-soft)",
                  )}
                >
                  <IcdCode code={entry.code} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-(--text-body)">{entry.name}</span>
                    {via ? (
                      <span className="block text-xs text-(--text-muted)">Matches &ldquo;{via}&rdquo;</span>
                    ) : null}
                  </span>
                  <Plus className="size-4 shrink-0 text-(--text-muted)" aria-hidden />
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {/* The impression list. Order is clinical: the first row is the primary diagnosis. */}
      {impressions.length > 0 ? (
        <ol className="mt-4 flex flex-col divide-y divide-(--border-subtle) rounded-xl border border-(--border-subtle)">
          {impressions.map((item, index) => {
            const primary = index === 0;
            return (
              <li key={item.code} className="flex items-center gap-3 px-3.5 py-3">
                <span className="w-5 shrink-0 text-right text-sm font-semibold text-(--text-muted) tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-(--text-heading)">{item.name}</span>
                    <IcdCode code={item.code} />
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-(--text-muted)">
                    {primary ? (
                      <>
                        <Star className="size-3.5 shrink-0 text-(--status-available-fg)" aria-hidden />
                        Primary diagnosis. Drives which documents can be drafted.
                      </>
                    ) : (
                      "Secondary diagnosis"
                    )}
                  </span>
                </span>
                {!primary ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 gap-1 text-(--text-muted) hover:text-(--text-heading)"
                    onClick={() => makePrimary(item.code)}
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                    Make primary
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-9 shrink-0 p-0 text-(--text-muted) hover:text-(--danger-fg)"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.code)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-(--border-default) px-3.5 py-4 text-sm text-(--text-muted)">
          Search above to add the first diagnosis. The first one you add is the primary diagnosis.
        </p>
      )}
    </section>
  );
}

function IcdCode({ code }: { code: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-(--border-default) bg-(--surface-sunken) px-1.5 py-0.5 font-mono text-xs font-semibold text-(--text-body)">
      {code}
    </span>
  );
}
