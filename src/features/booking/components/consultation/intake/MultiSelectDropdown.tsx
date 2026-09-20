"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NONE_OPTION } from "@/features/booking/constants/bookingConstants";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
}

type Tone = "danger" | "info";

/**
 * Token classes per tone. Allergens read as a clinical warning (danger);
 * dietary preferences are informational (navy blue). Both tones share the
 * same chip shape, so a filled field looks the same whichever it is.
 */
const TONES: Record<
  Tone,
  { label: string; trigger: string; chip: string; chipHover: string; check: string }
> = {
  danger: {
    label: "text-(--danger-fg)",
    trigger: "border-(--danger-border)/50",
    chip: "bg-(--danger-fg) text-(--text-inverse)",
    chipHover: "hover:bg-(--text-inverse)/20",
    check: "text-(--danger-fg)",
  },
  info: {
    label: "text-(--navy-700)",
    trigger: "border-(--navy-300)",
    chip: "bg-(--navy-700) text-(--text-inverse)",
    chipHover: "hover:bg-(--text-inverse)/20",
    check: "text-(--navy-700)",
  },
};

interface MultiSelectDropdownProps {
  label: string;
  icon: React.ReactNode;
  tone: Tone;
  value: string[];
  onChange: (value: string[]) => void;
  presets: readonly DropdownOption[];
  presetHeading: string;
  noneLabel: string;
  noneChipLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  /** Prompt shown while unanswered — blank is not the same as "None". */
  emptyHint?: string;
}

/**
 * Anchored multi-select with an explicit, mutually exclusive "None" answer.
 *
 * "None" is a positive assertion, so picking it clears every named entry and
 * picking a named entry clears it. Typing a value that matches no preset adds
 * it as a custom entry.
 */
export function MultiSelectDropdown({
  label,
  icon,
  tone,
  value,
  onChange,
  presets,
  presetHeading,
  noneLabel,
  noneChipLabel,
  placeholder,
  searchPlaceholder,
  emptyHint,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const styles = TONES[tone];

  const safeValue = Array.isArray(value) ? value : [];
  const isNone = safeValue.includes(NONE_OPTION);
  const labelFor = (item: string) =>
    presets.find((preset) => preset.value === item)?.label ?? item;

  const toggle = (item: string) => {
    setInputValue("");
    if (item === NONE_OPTION) {
      onChange(isNone ? [] : [NONE_OPTION]);
      return;
    }
    const withoutNone = safeValue.filter((entry) => entry !== NONE_OPTION);
    onChange(
      withoutNone.includes(item)
        ? withoutNone.filter((entry) => entry !== item)
        : [...withoutNone, item],
    );
  };

  const addCustom = () => {
    const trimmed = inputValue.trim();
    setInputValue("");
    if (!trimmed) return;
    if (trimmed.toLowerCase() === NONE_OPTION.toLowerCase()) {
      onChange([NONE_OPTION]);
      return;
    }
    const withoutNone = safeValue.filter((entry) => entry !== NONE_OPTION);
    if (withoutNone.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...withoutNone, trimmed.charAt(0).toUpperCase() + trimmed.slice(1)]);
  };

  // The trigger doubles as the value display: selected entries render as
  // removable chips inside the same box a plain text field would use, rather
  // than a separate tray underneath it.
  const triggerContent = (
    <div
      role="combobox"
      aria-expanded={open}
      aria-label={label}
      tabIndex={0}
      className={cn(
        "flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-(--radius-sm) border bg-(--surface-card) px-2.5 py-1.5 text-sm transition-colors",
        "hover:bg-(--surface-canvas) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        styles.trigger,
      )}
    >
      {isNone ? (
        <Chip
          className="bg-(--safe-fg) text-(--text-inverse)"
          hoverClassName="hover:bg-(--text-inverse)/20"
          removeLabel={`Clear ${noneChipLabel.toLowerCase()}`}
          onRemove={() => toggle(NONE_OPTION)}
        >
          {noneChipLabel}
        </Chip>
      ) : safeValue.length > 0 ? (
        safeValue.map((item) => (
          <Chip
            key={item}
            className={styles.chip}
            hoverClassName={styles.chipHover}
            removeLabel={`Remove ${labelFor(item)}`}
            onRemove={() => toggle(item)}
          >
            {labelFor(item)}
          </Chip>
        ))
      ) : (
        <span className="truncate py-1 text-(--text-muted)">{placeholder}</span>
      )}
      <ChevronsUpDown aria-hidden className="ml-auto size-4 shrink-0 self-center opacity-50" />
    </div>
  );

  return (
    <Field>
      <FieldLabel className={cn("flex items-center gap-1.5", styles.label)}>
        {icon} {label}
      </FieldLabel>
      <FieldContent className="space-y-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger nativeButton={false} render={triggerContent} />
          <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
            <Command className="w-full">
              <CommandInput
                placeholder={searchPlaceholder}
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && inputValue.trim()) {
                    event.preventDefault();
                    addCustom();
                  }
                }}
              />
              <CommandList>
                <CommandEmpty className="p-2">
                  <button
                    type="button"
                    onClick={addCustom}
                    className="w-full rounded-(--radius-xs) px-2 py-2 text-left text-xs font-semibold text-(--text-link) hover:bg-(--surface-canvas)"
                  >
                    Add &quot;{inputValue}&quot;
                  </button>
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={NONE_OPTION}
                    onSelect={() => toggle(NONE_OPTION)}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <span className={isNone ? "font-medium text-(--status-available-fg)" : ""}>
                      {noneLabel}
                    </span>
                    {isNone ? <Check className="size-4 text-(--status-available-fg)" /> : null}
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading={presetHeading}>
                  {presets.map((preset) => {
                    const checked = safeValue.includes(preset.value);
                    return (
                      <CommandItem
                        key={preset.value}
                        value={preset.value}
                        keywords={[preset.label]}
                        onSelect={() => toggle(preset.value)}
                        className="flex cursor-pointer items-center justify-between"
                      >
                        <span className={checked ? cn("font-medium", styles.check) : ""}>
                          {preset.label}
                        </span>
                        {checked ? <Check className={cn("size-4", styles.check)} /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {!isNone && safeValue.length === 0 && emptyHint ? (
          <p className="px-1 text-xs text-(--text-muted) italic">{emptyHint}</p>
        ) : null}
      </FieldContent>
    </Field>
  );
}

function Chip({
  className,
  hoverClassName,
  removeLabel,
  onRemove,
  children,
}: {
  className: string;
  hoverClassName: string;
  removeLabel: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex animate-in items-center gap-1 rounded-(--radius-pill) py-1 pr-1 pl-2.5 text-xs font-semibold shadow-sm duration-150 fade-in-50 zoom-in-95",
        className,
      )}
    >
      {children}
      <button
        type="button"
        aria-label={removeLabel}
        // The chip now lives inside the combobox trigger, so a remove click
        // must not also bubble up and toggle the popover open.
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={cn(
          "rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)",
          hoverClassName,
        )}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
