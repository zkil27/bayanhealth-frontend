"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CustomBottomModal } from "@/components/ui/custom-bottom-modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface SymptomGroup<T extends string> {
  title: string;
  tags: readonly (readonly [T, string])[];
}

/**
 * Related-symptoms dropdown (pilot feedback: "change Related Symptoms to a
 * dropdown"). Replaces a 19-tile grid that took a full phone screen.
 *
 * One trigger opens a searchable, grouped list: a bottom sheet on phones, an
 * anchored popover from `md` up. Picks show as removable chips under the
 * trigger, so the answer stays visible without reopening the list. Values are
 * the same `complaintTags` enum members the grid wrote; nothing custom can be
 * added, because the contract only accepts the enum.
 */
export function SymptomSelect<T extends string>({
  labelId,
  groups,
  value,
  onToggle,
}: {
  /** Id of the visible question label. */
  labelId: string;
  groups: readonly SymptomGroup<T>[];
  value: readonly T[];
  onToggle: (tag: T) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const labels = useMemo(() => new Map<string, string>(groups.flatMap((group) => group.tags)), [groups]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({ ...group, tags: group.tags.filter(([, label]) => label.toLowerCase().includes(q)) }))
      .filter((group) => group.tags.length > 0);
  }, [groups, query]);

  const summary = value.length === 0 ? "Choose symptoms" : `${value.length} selected`;

  const trigger = (
    <button
      type="button"
      aria-labelledby={labelId}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      onClick={() => setOpen(true)}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-(--border-default) bg-(--surface-raised) px-4 text-left text-base transition-colors sm:max-w-md",
        "hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        value.length ? "font-semibold text-(--text-heading)" : "text-(--text-muted)",
      )}
    >
      <span>{summary}</span>
      <ChevronDown aria-hidden className="size-5 shrink-0 text-(--text-muted)" />
    </button>
  );

  return (
    <div className="space-y-2.5">
      {isMobile ? (
        <>
          {trigger}
          <CustomBottomModal
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setQuery("");
            }}
            title="Related symptoms"
            description="Tap every symptom that applies."
            footer={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-(--action-primary) text-base font-semibold text-(--action-primary-text) transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              >
                Done{value.length ? ` · ${value.length} selected` : ""}
              </button>
            }
          >
            <div className="space-y-4" id={listId}>
              <label className="relative block">
                <span className="sr-only">Search symptoms</span>
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-(--text-muted)" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search symptoms"
                  className="h-12 w-full rounded-xl border border-(--border-default) bg-(--surface-card) pr-3.5 pl-10 text-base text-(--text-body) outline-none placeholder:text-(--text-subtle) focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent)"
                />
              </label>
              {filteredGroups.length === 0 ? (
                <p className="py-4 text-center text-base text-(--text-muted)">No matching symptom. Describe it in your main concern above.</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.title} role="group" aria-label={group.title} className="space-y-1.5">
                    <p className="text-sm font-semibold text-(--text-muted)">{group.title}</p>
                    {group.tags.map(([tag, label]) => {
                      const checked = value.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => onToggle(tag)}
                          className={cn(
                            "flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-base transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                            checked
                              ? "border-(--surface-nav-accent) bg-(--safe-bg) font-semibold text-(--safe-fg)"
                              : "border-(--border-subtle) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-canvas)",
                          )}
                        >
                          {label}
                          {checked ? <Check aria-hidden className="size-5 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </CustomBottomModal>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={trigger} />
          <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
            <Command id={listId}>
              <CommandInput placeholder="Search symptoms" className="text-base" />
              <CommandList className="max-h-80">
                <CommandEmpty className="px-3 py-4 text-sm text-(--text-muted)">
                  No matching symptom. Describe it in your main concern.
                </CommandEmpty>
                {groups.map((group) => (
                  <CommandGroup key={group.title} heading={group.title}>
                    {group.tags.map(([tag, label]) => {
                      const checked = value.includes(tag);
                      return (
                        <CommandItem
                          key={tag}
                          value={tag}
                          keywords={[label]}
                          onSelect={() => onToggle(tag)}
                          className="flex min-h-10 cursor-pointer items-center justify-between text-base"
                        >
                          <span className={checked ? "font-semibold text-(--safe-fg)" : undefined}>{label}</span>
                          {checked ? <Check aria-hidden className="size-4.5 text-(--safe-fg)" /> : null}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {value.length ? (
        <ul aria-label="Selected symptoms" className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onToggle(tag)}
                aria-label={`Remove ${labels.get(tag) ?? tag}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-(--surface-nav-accent) bg-(--safe-bg) pr-3 pl-4 text-base font-semibold text-(--safe-fg) transition-colors hover:bg-(--surface-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              >
                {labels.get(tag) ?? tag}
                <X aria-hidden className="size-4.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
