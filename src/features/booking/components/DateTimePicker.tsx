"use client";

import { useState, useCallback, useMemo } from "react";
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  LucideIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import AppButton from "@/components/primitives/AppButton";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface DateTimePickerBaseProps {
  date: Date | string | undefined;
  onDateChange: (date: Date | undefined) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  placeholder?: string;
  dropDownDate?: boolean;
  /**
   * Shown when `availableTimes` is empty. Override it wherever the reason is
   * known — the default cannot mention a doctor, because this component is also
   * used on forms that have no doctor in scope.
   */
  noTimesMessage?: string;
}

/**
 * Requiring a time and supplying no times is not expressible.
 *
 * `enableTime` defaults to `true`, and the time step's `Confirm` is disabled
 * until a time is chosen — so a caller that wanted a time but passed no
 * `availableTimes` produced a dialog the user could never satisfy. That shipped:
 * the intake form's "Consultation Date and Time" field stores a date only, took
 * the default `enableTime`, had no doctor and therefore no times, and left every
 * date showing "no published times" above a permanently greyed-out Confirm. It
 * had looked fine only while this component still shipped a fabricated
 * `["09:00 AM" … "11:30 AM"]` fallback.
 *
 * So the two are bound together in the type: ask for a time and you must supply
 * the times, or declare `enableTime={false}` and collect a date. A caller that
 * omits both no longer compiles.
 */
type DateTimePickerProps = DateTimePickerBaseProps &
  (
    | { enableTime: false; availableTimes?: never }
    | { enableTime?: true; availableTimes: string[] }
  );

interface DatePickerProps {
  date?: Date | string | undefined;
  onDateChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  icon?: LucideIcon;
}

/** Narrow a possibly-invalid Date to one that is safe to format. */
function isValidDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Parse a `string | Date` prop into a Date that is safe to format.
 *
 * Both pickers are bound to free-text-capable form fields (e.g. the intake
 * `onset` field, whose schema is `z.string()`), so the incoming value can be
 * something like "2 days ago". `new Date("2 days ago")` yields an Invalid Date,
 * and BOTH `Intl.DateTimeFormat().format()` and date-fns `format()` throw
 * `RangeError: Invalid time value` on one — which took the whole page down.
 * An unparseable value degrades to "no date selected" instead.
 */
function toValidDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return isValidDate(parsed) ? parsed : undefined;
}

/**
 * No fabricated fallback window.
 *
 * This used to default to `["09:00 AM" … "11:30 AM"]`, so any caller that did not
 * pass `availableTimes` let the patient pick a consultation time from a schedule
 * no doctor had published. Callers must now supply real slots; the prop type
 * above makes omitting them while still asking for a time a compile error.
 */
const DEFAULT_AVAILABLE_TIMES: string[] = [];

/**
 * Default empty-times copy.
 *
 * Deliberately says nothing about a doctor. This component is used on the intake
 * form, which has no doctor in scope, where the previous wording ("This doctor
 * has no published times. Pick another doctor…") was simply untrue.
 */
const DEFAULT_NO_TIMES_MESSAGE =
  "No times are available to choose from for this date.";

interface DatePickerProps {
  date?: Date | string | undefined;
  onDateChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  icon?: LucideIcon;
}

export function DateTimePicker({
  date,
  onDateChange,
  label = "Date and Time",
  maxDate,
  disabledDates = [],
  placeholder = "MM/DD/YYYY hh:mm aa",
  enableTime = true,
  minDate = new Date(),
  dropDownDate = false,
  availableTimes = DEFAULT_AVAILABLE_TIMES,
  noTimesMessage = DEFAULT_NO_TIMES_MESSAGE,
}: DateTimePickerProps) {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [hasSelectedTime, setHasSelectedTime] = useState(false);

  const parsedDate = useMemo(() => toValidDate(date), [date]);

  const [tempDate, setTempDate] = useState<Date | undefined>(parsedDate);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setShowCalendar(true);
        setTempDate(parsedDate ?? new Date());
        setHasSelectedTime(false);
      }
    },
    [parsedDate],
  );

  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (!selectedDate) return;

      setTempDate((prev) => {
        const next = prev ? new Date(prev) : new Date();
        next.setFullYear(selectedDate.getFullYear());
        next.setMonth(selectedDate.getMonth());
        next.setDate(selectedDate.getDate());
        return next;
      });

      if (!enableTime) {
        onDateChange(selectedDate);
        setIsOpen(false);
      } else {
        setShowCalendar(false);
      }
    },
    [enableTime, onDateChange],
  );

  const handleBackToCalendar = useCallback(() => {
    setShowCalendar(true);
    setHasSelectedTime(false);
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    const [hourMin, period] = time.split(" ");
    const [hourStr, minuteStr] = hourMin.split(":");
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    setTempDate((prev) => {
      const next = new Date(prev ?? new Date());
      next.setHours(hour, minute, 0, 0);
      return next;
    });
    setHasSelectedTime(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (tempDate && (!enableTime || hasSelectedTime)) {
      onDateChange(tempDate);
      setIsOpen(false);
    }
  }, [tempDate, onDateChange, enableTime, hasSelectedTime]);

  const handleCancel = useCallback(() => {
    setTempDate(parsedDate);
    setHasSelectedTime(false);
    setIsOpen(false);
  }, [parsedDate]);

  const isDateDisabled = useCallback(
    (d: Date) => {
      if (d < minDate) return true;
      if (maxDate && d > maxDate) return true;
      return disabledDates.some((x) => x.toDateString() === d.toDateString());
    },
    [minDate, maxDate, disabledDates],
  );

  // Every formatter no-ops on a missing OR invalid date so no caller can make
  // the component throw.
  const formatDate = (d: Date | undefined) =>
    isValidDate(d)
      ? new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(d)
      : null;

  const formatDateTime = (d: Date | undefined) =>
    isValidDate(d)
      ? new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(d)
      : null;

  const formatTime = (d: Date | undefined) =>
    isValidDate(d)
      ? new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(d)
      : null;

  // Sub-views
  const calendarView = (
    <div className="transition-all duration-300 ease-in-out">
      <div className="mb-4 flex items-center justify-between">
        {tempDate && (
          <div className="text-sm text-primary">{formatDate(tempDate)}</div>
        )}
        <h3 className="flex items-center justify-center gap-0.5 text-sm text-muted-foreground">
          <CalendarIcon className="size-4" />
          Select date
        </h3>
      </div>
      <Calendar
        mode="single"
        captionLayout={dropDownDate ? "dropdown" : "label"}
        className="w-full rounded-md border"
        defaultMonth={parsedDate}
        selected={tempDate}
        onSelect={handleDateSelect}
        disabled={isDateDisabled}
        modifiers={{ booked: isDateDisabled }}
        modifiersClassNames={{ booked: "[&>button]:line-through opacity-100" }}
      />
    </div>
  );

  const timeView = (
    <div className="animate-in duration-300 ease-in-out slide-in-from-right-4">
      <div className="mb-4 flex items-center justify-between">
        <AppButton
          onClick={handleBackToCalendar}
          variant="ghost"
          className="flex items-center gap-1 text-sm text-primary transition-colors hover:underline"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to calendar
        </AppButton>
        <h3 className="flex items-center justify-center gap-0.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          Select Time
        </h3>
      </div>

      <div className="text-center">
        <div className="text-lg font-semibold">
          {tempDate ? (
            formatDate(tempDate)
          ) : (
            <span className="text-muted-foreground">Select a date first</span>
          )}
        </div>

        {tempDate && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm text-muted-foreground">Selected Time</div>
            <div className="text-xl font-semibold">{formatTime(tempDate)}</div>
          </div>
        )}

        <div className="mb-6">
          <ScrollArea className="h-64 rounded-md border bg-background">
            <div className="flex flex-col gap-2 p-2">
              {availableTimes.length === 0 ? (
                <p
                  data-slot="datetime-no-times"
                  className="p-4 text-center text-sm text-muted-foreground"
                >
                  {noTimesMessage}
                </p>
              ) : (
                availableTimes.map((time) => (
                  <AppButton
                    key={time}
                    type="button"
                    variant="secondary"
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                      tempDate && formatTime(tempDate) === time
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white text-foreground hover:bg-secondary hover:text-white",
                    )}
                  >
                    {time}
                  </AppButton>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="relative overflow-hidden">
      <div
        key={showCalendar ? "calendar" : "time"}
        className={cn(
          "transition-all duration-300 ease-in-out",
          showCalendar
            ? "animate-in duration-300 fade-in slide-in-from-left-4"
            : "animate-in duration-300 fade-in slide-in-from-right-4",
        )}
      >
        {showCalendar ? calendarView : timeView}
      </div>
    </div>
  );

  const confirmActions = !showCalendar && (
    <div className="mt-6 flex justify-end gap-2">
      <AppButton variant="outline" onClick={handleCancel}>
        Cancel
      </AppButton>
      <AppButton onClick={handleConfirm} disabled={!hasSelectedTime}>
        Confirm
      </AppButton>
    </div>
  );

  const triggerButton = (
    <AppButton
      variant="outline"
      className={cn(
        "w-full justify-start border-input text-left text-xs font-normal whitespace-break-spaces",
        !parsedDate && "text-muted-foreground",
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
      {parsedDate
        ? enableTime
          ? formatDateTime(parsedDate)
          : formatDate(parsedDate)
        : placeholder}
    </AppButton>
  );

  // Date-only mode
  if (!enableTime) {
    return (
      <Field className="w-full">
        {label && <FieldLabel>{label}</FieldLabel>}
        {isMobile ? (
          <Drawer open={isOpen} onOpenChange={handleOpenChange}>
            <DrawerTrigger render={triggerButton} />
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Select Date</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 pb-8">{calendarView}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={triggerButton} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Date</DialogTitle>
              </DialogHeader>
              {calendarView}
            </DialogContent>
          </Dialog>
        )}
      </Field>
    );
  }

  return (
    <Field className="w-full">
      {label && <FieldLabel>{label}</FieldLabel>}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={handleOpenChange}>
          <DrawerTrigger render={triggerButton} />
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Date &amp; Time</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pb-8">
              {content}
              {confirmActions}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger render={triggerButton} />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Date &amp; Time</DialogTitle>
            </DialogHeader>
            {content}
            {confirmActions}
          </DialogContent>
        </Dialog>
      )}
    </Field>
  );
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Select date",
  disabled = false,
  className,
  minDate = new Date("1900-01-01"),
  maxDate = new Date(),
  error,
  icon: Icon,
}: DatePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const parsedDate = useMemo(() => toValidDate(date), [date]);

  const isDateDisabled = useCallback(
    (d: Date) => d < minDate || d > maxDate,
    [minDate, maxDate],
  );

  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (!selectedDate) return;
      onDateChange?.(format(selectedDate, "yyyy-MM-dd"));
      setOpen(false);
    },
    [onDateChange],
  );

  const calendarView = (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      className="w-full rounded-md border"
      defaultMonth={parsedDate}
      selected={parsedDate}
      onSelect={handleDateSelect}
      disabled={isDateDisabled}
    />
  );

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "w-full justify-start border-border pl-3 text-left font-normal",
        !parsedDate && "text-muted-foreground",
        error && "border-red-500 focus:ring-red-500",
      )}
    >
      {Icon && <Icon className="mr-2 size-4 shrink-0 text-muted-foreground" />}
      {/* `parsedDate` is guaranteed valid, so date-fns `format` cannot throw. */}
      {isValidDate(parsedDate) ? (
        format(parsedDate, "PPP")
      ) : (
        <span>{placeholder}</span>
      )}
    </Button>
  );

  return (
    <Field className={cn("w-full", className)}>
      <FieldContent>
        {isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger render={triggerButton} />
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Select Date</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 pb-8">
                {calendarView}
                <div className="mt-6 flex justify-end gap-2">
                  <AppButton variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </AppButton>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={triggerButton} />
            <PopoverContent className="w-auto p-0 shadow-lg" align="end">
              {calendarView}
            </PopoverContent>
          </Popover>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </FieldContent>
    </Field>
  );
}
