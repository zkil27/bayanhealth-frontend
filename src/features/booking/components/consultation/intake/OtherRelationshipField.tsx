"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState } from "react";

interface RelationshipOption {
  value: string;
  label: string;
  data: unknown;
}

interface RelationshipSelectorProps {
  value: string;
  onChange: (value: string) => void;
  relationshipOptions: RelationshipOption[];
}

interface SelectorComboboxProps {
  relationshipOptions: RelationshipOption[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function SelectorCombobox({
  relationshipOptions,
  value,
  onChange,
  onClose,
}: SelectorComboboxProps) {
  return (
    <Command>
      <CommandInput placeholder="Search relationship..." />
      <CommandList>
        <CommandEmpty>No relationship found.</CommandEmpty>
        <CommandGroup>
          {relationshipOptions.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => {
                onChange(option.value);
                onClose();
              }}
            >
              <Check
                className={cn(
                  "mr-2 size-4",
                  value === option.value ? "opacity-100" : "opacity-0",
                )}
              />
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function PersonDataRelationshipSection({
  value,
  onChange,
  relationshipOptions,
}: RelationshipSelectorProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedOption = relationshipOptions.find((opt) => opt.value === value);

  const triggerButton = (
    <Button
      variant="outline"
      className="w-full justify-between bg-background font-normal capitalize"
    >
      {selectedOption ? selectedOption.label : "Select relationship"}
      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        Relationship {!value && <span className="text-red-500">*</span>}
      </label>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger render={triggerButton} />
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Select Relationship</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pt-0">
              <SelectorCombobox
                relationshipOptions={relationshipOptions}
                value={value}
                onChange={onChange}
                onClose={() => setOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={triggerButton}></PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <SelectorCombobox
              relationshipOptions={relationshipOptions}
              value={value}
              onChange={onChange}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
