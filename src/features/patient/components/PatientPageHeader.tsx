import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backHref?: string;
  className?: string;
}

/**
 * Shared Patient Page Header with the brand green top bar.
 *
 * Renders the top green bar (`--teal-700`) across patient sub-pages
 * (My Health, Book, Chat, Profile) with high-contrast white typography:
 * - Green bar background: `bg-(--teal-700)` with `border-b border-(--teal-800)/20`.
 * - Header title in white: `text-white font-display font-bold`.
 * - Subtitle in soft white: `text-white/85`.
 * - Responsive layout: matches `patientPageClass` horizontal padding
 *   (`px-4 sm:px-6 md:px-8 lg:px-8`) for consistent alignment across all breakpoints.
 */
export function PatientPageHeader({
  title,
  subtitle,
  action,
  backHref,
  className,
}: PatientPageHeaderProps) {
  return (
    <header
      data-slot="patient-page-header"
      className={cn(
        "w-full border-b border-(--teal-800)/20 bg-(--teal-700) shadow-xs dark:border-(--teal-700)/30 dark:bg-(--teal-800)",
        className,
      )}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-1 px-4 py-3.5 sm:px-6 md:max-w-none md:px-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Go back"
                className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-md) border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <ArrowLeft className="size-4.5" strokeWidth={2} />
              </Link>
            )}
            <h1 className="font-display text-[22px] leading-tight font-bold tracking-tight text-white sm:text-[24px] md:text-[28px] truncate">
              {title}
            </h1>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {subtitle && (
          <p className="text-[13px] leading-snug text-white/85 sm:text-[14px]">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
