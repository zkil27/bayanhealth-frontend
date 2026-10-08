import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SOAP = ["S", "O", "A", "P"] as const;

/**
 * The post-consult workspace while it loads: the patient banner, the four
 * SOAP sections in their real shells, and the patient rail. Same shapes as
 * the loaded page, so nothing jumps when it arrives.
 */
export function PostConsultationSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="post-consultation-skeleton"
      aria-busy="true"
      aria-label="Loading post-consultation workspace"
      className={cn("flex min-h-full w-full max-w-full min-w-0 flex-col", className)}
    >
      <header className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 sm:px-4 md:px-6">
        <Skeleton className="size-11 shrink-0 rounded-xl lg:size-9" />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4.5 w-40 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <Skeleton className="h-6 w-56 rounded-full max-md:w-32" />
          <Skeleton className="h-11 w-36 rounded-full lg:h-9" />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 items-start gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)]">
        <main className="flex min-w-0 flex-col gap-3">
          {SOAP.map((letter, index) => (
            <section
              key={letter}
              aria-hidden
              className="rounded-2xl border border-(--border-subtle) bg-(--surface-card)"
            >
              <div className="flex min-h-14 items-center gap-3 px-4 sm:px-5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-(--surface-brand-soft) text-sm font-bold text-(--navy-700) dark:text-(--navy-300)">
                  {letter}
                </span>
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="ml-auto h-4 w-16 rounded" />
              </div>
              {index < 3 ? (
                <div className="flex flex-col gap-3 border-t border-(--border-subtle) px-4 py-4 sm:px-5">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : null}
            </section>
          ))}
        </main>

        <aside className="hidden min-w-0 lg:block">
          <div className="flex flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </aside>
      </div>
    </div>
  );
}
