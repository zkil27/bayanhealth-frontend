import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BookingNavBarProps {
  header: string;
  /** Optional supporting line shown under the title (O1 redesign). */
  subtitle?: string;
  /** Where the back control points; defaults to the booking home. */
  backHref?: string;
  /**
   * Optional chip shown above the title, naming which of the two consultation
   * paths this screen belongs to. The two flows reach the doctor through
   * different queues, so the screen says which one the patient is in.
   */
  badge?: ReactNode;
}

export function BookingNavBar({
  header,
  subtitle,
  backHref = "/patient/booking",
  badge,
}: BookingNavBarProps) {
  return (
    <div className="px-4 pt-4 md:px-2">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Go back"
          className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) text-(--text-heading) transition-transform duration-300 md:hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0">
          {badge}
          <h1 className="font-display text-[20px] leading-tight font-semibold tracking-tight text-(--text-heading)">
            {header}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-(--text-muted)">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
