"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandInput,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ArrowDown, ArrowUp, BookOpen, CornerDownLeft } from "lucide-react";
import { forwardRef, useImperativeHandle, useState, useEffect } from "react";

export interface MedicalCodeSuggestionHandle {
  forwardKeyDown: (event: KeyboardEvent) => boolean;
}

interface MedicalCodeSuggestionProps {
  items: string[];
  suggestionCodes: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const MedicalCodeSuggestionCommandList = forwardRef<
  MedicalCodeSuggestionHandle,
  MedicalCodeSuggestionProps
>(({ items, suggestionCodes, onSelect, onClose }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(true);

  const limitedSuggestions = suggestionCodes.slice(0, 3);
  const totalItems = [...limitedSuggestions, ...items];

  useEffect(() => {
    setSelectedIndex(0);
  }, [items, suggestionCodes]);

  useImperativeHandle(ref, () => ({
    forwardKeyDown: (event: KeyboardEvent) => {
      const currentMax = totalItems.length;
      if (currentMax === 0) return false;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % currentMax);
          return true;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + currentMax) % currentMax);
          return true;
        case "Enter":
          event.preventDefault();
          if (totalItems[selectedIndex]) {
            onSelect(totalItems[selectedIndex]);
          }
          return true;
        default:
          return false;
      }
    },
  }));

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setOpen(false);
      onClose();
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-2xl rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-2xl gap-0 overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b border-(--border-subtle) bg-(--surface-warm) px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-(--navy-700) text-(--teal-700) shadow-xs">
          <BookOpen className="size-4" />
        </span>
        <div>
          <h2 className="text-xs font-bold text-(--text-heading)">
            Clinical Practice Guidelines (CPG)
          </h2>
          <p className="text-[11px] text-(--text-muted)">
            Search and reference diagnostic guidelines &amp; medical codes
          </p>
        </div>
      </div>
      <Command className="flex h-full w-full max-w-2xl flex-row overflow-hidden bg-transparent">
        
        <div className="flex h-full w-1/2 flex-1 flex-col overflow-hidden">
          <CommandInput
            className="text-xs text-(--text-heading)"
            placeholder="Type Search..."
          />
          <CommandList className="max-h-none flex-1 overflow-y-auto pb-6">
            <CommandEmpty className="py-6 text-center text-xs text-(--text-muted)">No results found.</CommandEmpty>

            {limitedSuggestions.length > 0 && (
              <>
                <CommandGroup
                  heading="Suggestions"
                  className="space-y-1 **:[[cmdk-group-heading]]:rounded-md **:[[cmdk-group-heading]]:bg-(--surface-subtle) **:[[cmdk-group-heading]]:text-(--text-muted) **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
                >
                  {limitedSuggestions.map((item, index) => (
                    <CommandItem
                      key={`suggest-${item}`}
                      value={item}
                      onSelect={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className="data-selected:bg-(--surface-active) data-selected:text-(--text-heading) cursor-pointer"
                      data-selected={index === selectedIndex}
                    >
                      {item}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {items.length > 0 && <CommandSeparator />}
              </>
            )}

            {items.length > 0 && (
              <CommandGroup
                heading="Medical Codes"
                className="space-y-1 **:[[cmdk-group-heading]]:rounded-md **:[[cmdk-group-heading]]:bg-(--surface-subtle) **:[[cmdk-group-heading]]:text-(--text-muted) **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
              >
                {items.map((item, index) => {
                  const realIndex = limitedSuggestions.length + index;
                  return (
                    <CommandItem
                      key={`code-${item}`}
                      value={item}
                      onSelect={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(realIndex)}
                      className="data-selected:bg-(--surface-active) data-selected:text-(--text-heading) cursor-pointer"
                      data-selected={realIndex === selectedIndex}
                    >
                      {item}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </div>

        <div className="relative flex h-full w-1/2 flex-col justify-between border-l border-(--border-subtle) bg-(--surface-warm-soft) p-4 pb-24">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wider text-(--text-muted) uppercase">
              CPG Preview
            </h3>
            <div className="text-xs leading-relaxed text-(--text-body)">
              {totalItems[selectedIndex] ? (
                <>
                  <span className="text-(--text-muted)">Focused Code:</span>
                  <span className="mt-1 block font-mono font-bold text-(--teal-700)">
                    {totalItems[selectedIndex]}
                  </span>
                </>
              ) : (
                <span className="text-(--text-muted) italic">
                  No item highlighted
                </span>
              )}
            </div>
          </div>

          <div className="absolute right-3 bottom-3 left-3 flex gap-1.5 border-t border-border/60 bg-transparent pt-3">
            <KbdGroup className="justify-start gap-1">
              <Kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                <span>Move</span>
              </Kbd>
              <Kbd className="flex items-center gap-1 px-1.5 py-0.5 text-[10px]">
                <CornerDownLeft className="h-2.5 w-2.5" />
                <span>Add</span>
              </Kbd>
              <Kbd className="flex items-center gap-1 px-1.5 py-0.5 text-[8px]">
                <span>ESC Exit</span>
              </Kbd>
              <Kbd className="text-[8px] font-semibold">
                Type /med in text editor to open
              </Kbd>
            </KbdGroup>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
});

MedicalCodeSuggestionCommandList.displayName =
  "MedicalCodeSuggestionCommandList";
