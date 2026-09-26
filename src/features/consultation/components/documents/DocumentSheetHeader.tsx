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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <AppLogo width={150} height={36} type="withText" />
          </div>
          <span className="text-[11px] font-semibold text-[#18a58c] tracking-tight pl-0.5">
            Care that continues
          </span>
        </div>

        <div>
          {isDraft ? (
            <span className="inline-flex items-center rounded-md border border-red-500 bg-white px-3 py-0.5 text-[11px] font-bold tracking-wider text-red-600 uppercase">
              SAMPLE • NOT VALID
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-[#18a58c] bg-white px-3 py-0.5 text-[11px] font-bold tracking-wider text-[#18a58c] uppercase">
              OFFICIAL • VALID
            </span>
          )}
        </div>
      </div>

      {/* Main Document Title */}
      <div className="pt-3">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#074972] uppercase font-sans">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-[#18a58c]">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Crisp Solid Teal Divider Line */}
      <div className="h-[1.5px] w-full bg-[#18a58c] mt-2 mb-3" />
    </header>
  );
}
