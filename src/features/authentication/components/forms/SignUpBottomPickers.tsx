"use client";

import React, { useMemo, useState } from "react";
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
          "flex h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
          "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
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
        <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Pronoun"
        description="Choose how you'd like your doctor to address you"
      >
        <div className="flex flex-col gap-2.5">
          {PRONOUN_OPTIONS.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex min-h-[56px] w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer active:scale-[0.98]",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-(--border-subtle) bg-(--surface-card) hover:bg-muted/60",
                )}
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-bold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background",
                  )}
                >
                  {isSelected && <Check className="size-3.5 stroke-[3]" />}
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
          "flex h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
          "focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          hasError && "border-destructive focus-visible:ring-destructive/30",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "text-[15px] sm:text-sm font-medium truncate",
              !value && "text-muted-foreground",
            )}
          >
            {value || "Select Specialization"}
          </span>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Medical Specialization"
        description="Select your primary clinical field of practice"
      >
        <div className="flex flex-col gap-3">
          {/* Thumb-friendly search input */}
          <div className="relative flex items-center shrink-0">
            <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specialization..."
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-[16px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Scrollable list with 48px touch targets */}
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
            {filteredSpecializations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
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
                      "flex min-h-[48px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer select-none active:bg-muted/80",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span className="truncate">{spec}</span>
                    {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
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

  const days = useMemo(() => {
    const list: string[] = [];
    for (let d = 1; d <= 31; d++) {
      list.push(String(d).padStart(2, "0"));
    }
    return list;
  }, []);

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
          "flex h-12 w-full items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left transition-colors cursor-pointer select-none active:scale-[0.99]",
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
        title="Date of Birth"
        description="Choose your birth date with thumb-friendly selectors"
      >
        <div className="flex flex-col gap-4">
          {/* 3 Thumb-Friendly Select Columns */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Month Column */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name.slice(0, 3)} ({m.num})
                  </option>
                ))}
              </select>
            </div>

            {/* Day Column */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Day
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {parseInt(d, 10)}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Column */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview Badge */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
            <span className="text-xs text-muted-foreground">Selected Date: </span>
            <span className="text-sm font-bold text-primary">
              {MONTHS.find((m) => m.num === month)?.name} {parseInt(day, 10)}, {year}
            </span>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            Confirm Date
          </button>
        </div>
      </CustomBottomModal>
    </>
  );
}
