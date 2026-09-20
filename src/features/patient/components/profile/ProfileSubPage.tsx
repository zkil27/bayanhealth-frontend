import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shell for the two editors reached from `/patient/profile`: a back control to the
 * settings list, a title, and the editor itself on a card.
 *
 * These were tabs on the old `/patient/profile` page. As routes they get their own
 * address (linkable, and the browser back button means something on them), and
 * the settings list stays the single index of everything in the patient's
 * profile — which is what the design's row-and-chevron layout implies.
 */
export function ProfileSubPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-4 pb-8 md:max-w-3xl md:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/patient/profile"
          aria-label="Back to profile"
          className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) text-(--text-heading) transition-transform duration-300 md:hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-[20px] leading-tight font-semibold tracking-tight text-(--text-heading)">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] text-(--text-muted)">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) md:p-6">
        {children}
      </div>
    </section>
  );
}
