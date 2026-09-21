"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search, Cake, Smile, Stethoscope, Calendar as CalendarIcon } from "lucide-react";
import { CustomBottomModal } from "@/components/ui/custom-bottom-modal";
import { cn } from "@/lib/utils";
import { specializations } from "./SignUpProfile";

// ==========================================
// 1. PRONOUN BOTTOM PICKER
// ==========================================

const PRONOUN_OPTIONS = [
  {
    value: "he/him",
    label: "He / Him",
    description: "e.g., He is attending his medical consultation",
  },
  {
    value: "she/her",
    label: "She / Her",
    description: "e.g., She is attending her medical consultation",
  },
  {
    value: "they/them",
    label: "They / Them",
    description: "e.g., They are attending their medical consultation",
  },
  {
    value: "prefer-not-to-say",
    label: "Prefer not to say",
    description: "Do not specify a pronoun on the patient profile",
  },
];

interface PronounPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PronounBottomPicker({
  value,
  onChange,
  disabled,
}: PronounPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = PRONOUN_OPTIONS.find((opt) => opt.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 sm:h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
          "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Smile className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "text-[15px] sm:text-sm font-medium truncate",
              !selectedOption && "text-muted-foreground",
            )}
          >
            {selectedOption ? selectedOption.label : "Select pronoun"}
          </span>
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground ml-1" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Pronoun"
        description="Choose how you'd like your doctor to address you"
      >
        <div className="space-y-2">
          {PRONOUN_OPTIONS.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg p-4 text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "bg-(--teal-100) ring-1 ring-(--action-primary)"
                    : "hover:bg-(--action-secondary-hover-surface)",
                )}
              >
                <div className="flex flex-1 flex-col">
                  <span
                    className={cn(
                      "font-medium",
                      isSelected ? "text-(--teal-800)" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span className="text-xs text-(--text-muted) mt-0.5">
                      {opt.description}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CustomBottomModal>
    </>
  );
}

// ==========================================
// 2. DOCTOR SPECIALIZATION BOTTOM PICKER
// ==========================================

interface SpecializationPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function SpecializationBottomPicker({
  value,
  onChange,
  disabled,
  hasError,
}: SpecializationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredSpecializations = useMemo(() => {
    if (!search.trim()) return specializations;
    const q = search.toLowerCase();
    return specializations.filter((s) => s.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = (spec: string) => {
    onChange(spec);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 sm:h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
          "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          hasError && "border-destructive focus-visible:ring-destructive/30",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "text-[15px] sm:text-sm font-medium truncate",
              !value && "text-muted-foreground",
            )}
          >
            {value || "Specialization"}
          </span>
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground ml-1" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Specialization"
        description="Select your primary clinical field of practice"
      >
        <div className="flex flex-col gap-2.5">
          {/* Thumb-friendly search input */}
          <div className="relative flex items-center shrink-0">
            <Search className="pointer-events-none absolute left-3.5 size-4 text-(--text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specialization..."
              className="h-11 w-full rounded-xl border border-(--border-default) bg-(--surface-card) pl-10 pr-4 text-[16px] text-foreground outline-none focus:border-(--action-primary) focus:ring-1 focus:ring-(--action-primary)"
            />
          </div>

          {/* Scrollable list with 44px+ touch targets */}
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredSpecializations.length === 0 ? (
              <p className="py-8 text-center text-sm text-(--text-muted)">
                No specializations matching &ldquo;{search}&rdquo;
              </p>
            ) : (
              filteredSpecializations.map((spec) => {
                const isSelected = value === spec;
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => handleSelect(spec)}
                    className={cn(
                      "flex min-h-[44px] w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer select-none",
                      isSelected
                        ? "bg-(--teal-100) ring-1 ring-(--action-primary) text-(--teal-800) font-semibold"
                        : "text-foreground hover:bg-(--action-secondary-hover-surface)",
                    )}
                  >
                    <span className="truncate">{spec}</span>
                    {isSelected && <Check className="size-4 text-(--teal-800) shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </CustomBottomModal>
    </>
  );
}

// ==========================================
// 3. DATE OF BIRTH BOTTOM PICKER
// ==========================================

interface DateOfBirthPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const MONTHS = [
  { num: "01", name: "January" },
  { num: "02", name: "February" },
  { num: "03", name: "March" },
  { num: "04", name: "April" },
  { num: "05", name: "May" },
  { num: "06", name: "June" },
  { num: "07", name: "July" },
  { num: "08", name: "August" },
  { num: "09", name: "September" },
  { num: "10", name: "October" },
  { num: "11", name: "November" },
  { num: "12", name: "December" },
];

export function DateOfBirthBottomPicker({
  value,
  onChange,
  disabled,
  hasError,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = useState(false);

  // Parse existing date or default to 1995-01-01
  const parts = value ? value.split("-") : [];
  const currentYear = parts[0] || "1995";
  const currentMonth = parts[1] || "01";
  const currentDay = parts[2] || "01";

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState(currentDay);

  // Synchronize internal state when value prop changes
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      if (y) setYear(y);
      if (m) setMonth(m);
      if (d) setDay(d);
    }
  }, [value]);

  // Format displayed text
  const displayDate = useMemo(() => {
    if (!value) return "Select date of birth";
    try {
      const [y, m, d] = value.split("-");
      const monthObj = MONTHS.find((item) => item.num === m);
      return `${monthObj ? monthObj.name : m} ${parseInt(d, 10)}, ${y}`;
    } catch {
      return value;
    }
  }, [value]);

  const years = useMemo(() => {
    const list: string[] = [];
    const maxYear = new Date().getFullYear();
    for (let y = maxYear; y >= 1910; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  // Compute days in month dynamically (accounts for leap years & varying month lengths)
  const daysInMonth = useMemo(() => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }, [year, month]);

  const days = useMemo(() => {
    const list: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(String(d).padStart(2, "0"));
    }
    return list;
  }, [daysInMonth]);

  // Clamp selected day if month changes to one with fewer days
  useEffect(() => {
    if (parseInt(day, 10) > daysInMonth) {
      setDay(String(daysInMonth).padStart(2, "0"));
    }
  }, [daysInMonth, day]);

  // Calculated Age for clinical preview
  const calculatedAge = useMemo(() => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);
    if (!y || isNaN(m) || !d) return null;
    const birth = new Date(y, m, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mDiff = today.getMonth() - birth.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [year, month, day]);

  // Auto-scroll columns to selected items when modal opens
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const monthEl = monthScrollRef.current?.querySelector(
          `[data-value="${month}"]`,
        ) as HTMLElement;
        const dayEl = dayScrollRef.current?.querySelector(
          `[data-value="${day}"]`,
        ) as HTMLElement;
        const yearEl = yearScrollRef.current?.querySelector(
          `[data-value="${year}"]`,
        ) as HTMLElement;

        monthEl?.scrollIntoView({ block: "center", behavior: "smooth" });
        dayEl?.scrollIntoView({ block: "center", behavior: "smooth" });
        yearEl?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, month, day, year]);

  const handleConfirm = () => {
    onChange(`${year}-${month}-${day}`);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 sm:h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
          "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          hasError && "border-destructive focus-visible:ring-destructive/30",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Cake className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "text-[15px] sm:text-sm font-medium truncate",
              !value && "text-muted-foreground",
            )}
          >
            {displayDate}
          </span>
        </div>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground ml-2" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Date of Birth"
        description="Scroll or tap to choose your month, day, and year"
      >
        <div className="flex flex-col gap-3">
          {/* Selected Date & Age Preview Badge */}
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Selected Birth Date
              </span>
              <span className="text-sm font-bold text-foreground">
                {MONTHS.find((m) => m.num === month)?.name} {parseInt(day, 10)}, {year}
              </span>
            </div>
            {calculatedAge !== null && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {calculatedAge} {calculatedAge === 1 ? "year" : "years"} old
              </span>
            )}
          </div>

          {/* 3 Touch-Friendly Scroll Columns (Zero Native Select Popups) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-2xl border border-border bg-card/60 p-2">
            {/* Month Column */}
            <div className="flex flex-col min-w-0">
              <span className="text-center pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                Month
              </span>
              <div
                ref={monthScrollRef}
                className="h-48 overflow-y-auto space-y-1 py-1.5 px-0.5 scroll-smooth overscroll-contain touch-pan-y"
              >
                {MONTHS.map((m) => {
                  const isSelected = month === m.num;
                  return (
                    <button
                      key={m.num}
                      type="button"
                      data-value={m.num}
                      onClick={() => setMonth(m.num)}
                      className={cn(
                        "w-full h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none active:scale-[0.97]",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
                      )}
                    >
                      {m.name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Column */}
            <div className="flex flex-col min-w-0 border-x border-border/60 px-1">
              <span className="text-center pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                Day
              </span>
              <div
                ref={dayScrollRef}
                className="h-48 overflow-y-auto space-y-1 py-1.5 px-0.5 scroll-smooth overscroll-contain touch-pan-y"
              >
                {days.map((d) => {
                  const isSelected = day === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      data-value={d}
                      onClick={() => setDay(d)}
                      className={cn(
                        "w-full h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none active:scale-[0.97]",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
                      )}
                    >
                      {parseInt(d, 10)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Year Column */}
            <div className="flex flex-col min-w-0">
              <span className="text-center pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                Year
              </span>
              <div
                ref={yearScrollRef}
                className="h-48 overflow-y-auto space-y-1 py-1.5 px-0.5 scroll-smooth overscroll-contain touch-pan-y"
              >
                {years.map((y) => {
                  const isSelected = year === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-value={y}
                      onClick={() => setYear(y)}
                      className={cn(
                        "w-full h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none active:scale-[0.97]",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            Confirm Date
          </button>
        </div>
      </CustomBottomModal>
    </>
  );
}
