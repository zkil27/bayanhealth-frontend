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
import { ArrowDown, ArrowUp, CornerDownLeft } from "lucide-react";
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
      className=" sm:max-w-2xl  rounded-lg border gap-0"
    >
      <div className="rounded-t-xl bg-secondary p-4 text-secondary-foreground">
        CPG
      </div>
      <Command className="flex h-full w-full max-w-2xl flex-row overflow-hidden">
        
        <div className="flex h-full w-1/2 flex-1 flex-col overflow-hidden">
          <CommandInput
            className="text-xs text-foreground"
            placeholder="Type Search..."
          />
          <CommandList className="max-h-none flex-1 overflow-y-auto pb-6">
            <CommandEmpty>No results found.</CommandEmpty>

            {limitedSuggestions.length > 0 && (
              <>
                <CommandGroup
                  heading="Suggestions"
                  className="space-y-1 **:[[cmdk-group-heading]]:rounded-lg **:[[cmdk-group-heading]]:bg-secondary **:[[cmdk-group-heading]]:text-secondary-foreground"
                >
                  {limitedSuggestions.map((item, index) => (
                    <CommandItem
                      key={`suggest-${item}`}
                      value={item}
                      onSelect={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className="data-selected:bg-primary data-selected:text-primary-foreground"
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
                className="space-y-1 **:[[cmdk-group-heading]]:rounded-lg **:[[cmdk-group-heading]]:bg-secondary **:[[cmdk-group-heading]]:text-secondary-foreground"
              >
                {items.map((item, index) => {
                  const realIndex = limitedSuggestions.length + index;
                  return (
                    <CommandItem
                      key={`code-${item}`}
                      value={item}
                      onSelect={() => onSelect(item)}
                      onMouseEnter={() => setSelectedIndex(realIndex)}
                      className="data-selected:bg-primary data-selected:text-primary-foreground"
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

        <div className="relative flex h-full w-1/2 flex-col justify-between border-l bg-muted/40 p-4 pb-24">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              CPG Preview
            </h3>
            <p className="text-xs leading-relaxed text-foreground/80">
              {totalItems[selectedIndex] ? (
                <>
                  Focused Code:
                  <span className="mt-1 block font-mono font-bold text-secondary">
                    {totalItems[selectedIndex]}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground italic">
                  No item highlighted
                </span>
              )}
            </p>
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
