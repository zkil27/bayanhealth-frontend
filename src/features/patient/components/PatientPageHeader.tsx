import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientBreadcrumb } from "@/features/patient/components/Breadcrumb";

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
 * (My Health, Book, Chat, Profile) expanding all the way edge-to-edge
 * with no outer padding, border, or margin.
 */
export function PatientPageHeader({
  title,
  subtitle: _subtitle,
  action,
  backHref,
  className,
}: PatientPageHeaderProps) {
  return (
    <header
      data-slot="patient-page-header"
      className={cn(
        "w-full m-0 p-0 border-0 border-none bg-(--teal-700) shadow-none dark:bg-[#0c1f1b] pt-[env(safe-area-inset-top,0px)]",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-1 px-4 py-3 sm:px-6 md:px-8">
        <PatientBreadcrumb variant="header" />
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
      </div>
    </header>
  );
}
