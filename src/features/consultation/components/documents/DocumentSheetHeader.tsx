"use client";

import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { cn } from "@/lib/utils";

interface DocumentSheetHeaderProps {
  title: string;
  subtitle?: string;
  isDraft?: boolean;
  className?: string;
}

export function DocumentSheetHeader({
  title,
  subtitle,
  isDraft = false,
  className,
}: DocumentSheetHeaderProps) {
  return (
    <header className={cn("flex flex-col pb-2 select-text", className)}>
      {/* Top Brand & Validity Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <AppLogo width={140} height={34} type="withText" variant="light" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-(--teal-700) tracking-tight pl-0.5">
            Care that continues
          </span>
        </div>

        <div>
          {isDraft ? (
            <span className="inline-flex items-center rounded-md border border-amber-600 bg-amber-50 px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider text-amber-700 uppercase">
              DRAFT • NOT FINAL
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-(--teal-700) bg-white px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider text-(--teal-700) uppercase">
              OFFICIAL • VALID
            </span>
          )}
        </div>
      </div>

      {/* Main Document Title */}
      <div className="pt-2.5 sm:pt-3">
        <h1 className="text-xl sm:text-[28px] font-extrabold tracking-tight text-(--navy-700) uppercase font-sans">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-(--teal-700)">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Crisp Solid Teal Divider Line */}
      <div className="h-[1.5px] w-full bg-(--teal-700) mt-2 mb-3" />
    </header>
  );
}
