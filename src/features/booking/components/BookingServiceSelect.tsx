"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICES } from "../constants/bookingConstants";
import { useIsMobile } from "@/hooks/use-mobile";

type ServiceOption = {
  value: string | null;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  fee?: number;
  description?: string;
};

type BookingServiceSelectProps = {
  value: string;
  onChange: (value: string) => void;
  showFee?: boolean;
  /** Override the option set (defaults to the booking SERVICES). */
  options?: ServiceOption[];
  /** Group label shown above the option list. */
  label?: string;
  /** Trigger placeholder when no value is selected. */
  placeholder?: string;
  /** Tailwind width class for the trigger (defaults to the wide booking trigger). */
  triggerWidth?: string;
  className?: string;
  /**
   * `default` keeps the original booking-flow rendering (a labelled
   * "Consultation Service" field). `simple` renders a compact select used by
   * the intake forms.
   */
  variant?: "default" | "simple";
};

const TRIGGER_CLASS =
  "h-auto min-h-14 gap-3 rounded-[14px] border-(--border-default) bg-(--surface-card) px-3.5 py-2.5 hover:bg-(--surface-card) [&>span]:line-clamp-none";

export function BookingServiceSelect({
  value,
  onChange,
  showFee = true,
  options = SERVICES,
  label,
  placeholder = "Select a service",
  triggerWidth = "w-56",
  className,
  variant = "default",
}: BookingServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedService = options.find((s) => s.value === value);

  const handleValueChange = (newValue: string | null) => {
    onChange(newValue ?? "");
    setOpen(false);
  };

  const formatFee = (fee?: number) => {
    if (!showFee || !fee) return null;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(fee);
  };

  const TriggerContent = (
    <div className="flex w-full items-center gap-3 [&_svg]:h-5 [&_svg]:w-5">
      {selectedService ? (
        <div
          key={selectedService.value}
          className="flex min-w-0 animate-in items-center gap-3 duration-200 fade-in slide-in-from-left-2"
        >
          {selectedService.icon && (
            <selectedService.icon className="shrink-0 text-(--teal-800)" />
          )}
          <span className="flex min-w-0 flex-col items-start">
            <span className="text-[15px] font-semibold text-(--text-heading)">
              {selectedService.label}
            </span>
            {selectedService.description && (
              <span className="line-clamp-2 text-xs whitespace-normal text-(--text-muted)">
                {selectedService.description}
              </span>
            )}
          </span>
          {showFee && selectedService.fee && (
            <span className="text-xs text-(--text-muted)">
              {formatFee(selectedService.fee)}
            </span>
          )}
        </div>
      ) : (
        <span className="text-base text-(--text-muted)">{placeholder}</span>
      )}
    </div>
  );

  const DefaultTrigger = (
    <Button
      type="button"
      variant="outline"
      className={cn("justify-between", TRIGGER_CLASS, triggerWidth, className)}
    >
      {TriggerContent}
      <ChevronDown className="size-4 shrink-0 text-(--text-muted) transition-transform duration-200" />
    </Button>
  );

  /** One option row shared by the desktop / simple `Select`. Label and the full
   * description are shown (the description wraps rather than truncating, so no
   * service detail is hidden); the list scrolls if it runs long. */
  const OptionRow = (service: ServiceOption) => (
    <div className="flex w-full min-w-0 items-start gap-2.5">
      {service.icon && (
        <service.icon className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-(--text-heading)">
          {service.label}
        </span>
        {service.description && (
          <span className="text-xs leading-snug whitespace-normal text-(--text-muted)">
            {service.description}
          </span>
        )}
      </span>
      {showFee && service.fee && (
        <span className="shrink-0 text-xs text-(--text-muted)">
          {formatFee(service.fee)}
        </span>
      )}
    </div>
  );

  const OptionList = (groupLabel?: string) => (
    <SelectGroup className="space-y-0.5">
      {groupLabel && <SelectLabel>{groupLabel}</SelectLabel>}
      {options.map((service) => (
        <SelectItem
          key={service.value ?? ""}
          value={service.value ?? ""}
          className={cn(
            "items-start py-2.5 pr-8 pl-2 [&_span]:whitespace-normal focus:bg-(--action-secondary-hover-surface)",
            service.value === value && "bg-(--teal-100)",
          )}
        >
          {OptionRow(service)}
        </SelectItem>
      ))}
    </SelectGroup>
  );

  const DropdownContent = (
    <SelectContent
      side="bottom"
      alignItemWithTrigger={false}
      className="max-h-[min(70vh,420px)] rounded-[14px] border-(--border-subtle) p-1"
    >
      {OptionList(variant === "simple" ? label : "Service")}
    </SelectContent>
  );

  if (variant === "simple") {
    return (
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className={cn("h-12 px-2", triggerWidth, className)}>
          {TriggerContent}
        </SelectTrigger>
        {DropdownContent}
      </Select>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger render={DefaultTrigger} />
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Select a Service</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-2 overflow-y-auto p-4">
            {options.map((service) => {
              const isSelected = service.value === value;
              return (
                <button
                  key={service.value}
                  onClick={() => handleValueChange(service.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg p-4 text-left transition-all duration-200",
                    isSelected
                      ? "bg-(--teal-100) ring-1 ring-(--action-primary)"
                      : "hover:bg-(--action-secondary-hover-surface)",
                  )}
                >
                  <div className="flex flex-1 items-center gap-3">
                    {service.icon && (
                      <service.icon
                        className={cn(
                          "size-5 shrink-0",
                          isSelected
                            ? "text-(--teal-800)"
                            : "text-(--text-muted)",
                        )}
                      />
                    )}

                    <div className="flex flex-1 flex-col">
                      <span
                        className={cn(
                          "font-medium",
                          isSelected && "text-(--teal-800)",
                        )}
                      >
                        {service.label}
                      </span>
                      {service.description && (
                        <span className="text-xs text-(--text-muted)">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {showFee && service.fee && (
                    <span className="shrink-0 text-sm font-semibold text-(--teal-800)">
                      {formatFee(service.fee)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Default desktop version
  return (
    <Select onValueChange={handleValueChange} value={value}>
      <SelectTrigger className={cn(TRIGGER_CLASS, triggerWidth, className)}>
        {TriggerContent}
      </SelectTrigger>
      {DropdownContent}
    </Select>
  );
}
