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
    <header className={cn("flex flex-col gap-3 pb-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppLogo width={160} height={40} type="withText" />
        </div>
        <div>
          {isDraft ? (
            <span className="inline-flex items-center rounded-md border border-rose-400 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-rose-700 uppercase">
              SAMPLE • NOT VALID
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-teal-500 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-teal-800 uppercase">
              OFFICIAL • VALID
            </span>
          )}
        </div>
      </div>

      <div className="pt-2">
        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#074972]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="h-0.5 w-full bg-[#074972]/20" />
    </header>
  );
}
