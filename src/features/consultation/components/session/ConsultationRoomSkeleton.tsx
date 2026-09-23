import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * ConsultationRoomSkeleton
 *
 * High-fidelity, accessible skeleton for the active video consultation room.
 * Mirrors the dual-pane stage (video viewport on the left, clinical companion
 * suite on the right) and top session header to eliminate layout flash.
 */
export function ConsultationRoomSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="consultation-room-skeleton"
      aria-busy="true"
      aria-label="Opening consultation room"
      className={cn(
        "bg-satin flex h-dvh max-h-dvh w-full flex-col gap-2 overflow-hidden p-2 text-slate-900 antialiased sm:p-2.5 md:gap-3 md:p-3.5 lg:gap-3 lg:p-4",
        className,
      )}
    >
      {/* 1. Session Header */}
      <header className="flex min-h-12 shrink-0 items-center justify-between rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3 py-2 shadow-2xs md:min-h-14 md:rounded-2xl md:px-5 md:py-2.5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg md:size-9" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded md:w-44" />
            <Skeleton className="h-3 w-24 rounded md:w-32" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </header>

      {/* 2. Dual-Pane Stage */}
      <main className="flex h-full min-h-0 w-full flex-1 flex-col gap-2.5 overflow-hidden md:gap-3.5 lg:flex-row lg:gap-4">
        {/* Left Pane: Video Stage */}
        <div className="flex h-[40dvh] min-h-0 min-w-0 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950 p-6 shadow-sm md:rounded-3xl lg:h-full lg:flex-[7] lg:shrink">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="size-20 rounded-full bg-slate-800 md:size-24" />
            <Skeleton className="h-4 w-36 rounded bg-slate-800" />
            <Skeleton className="h-3 w-24 rounded bg-slate-800/60" />
          </div>

          {/* Bottom video control bar placeholder */}
          <div className="mt-auto flex items-center gap-3 pt-6">
            <Skeleton className="size-10 rounded-full bg-slate-800" />
            <Skeleton className="size-10 rounded-full bg-slate-800" />
            <Skeleton className="size-10 rounded-full bg-slate-800" />
            <Skeleton className="h-10 w-24 rounded-full bg-rose-900/60" />
          </div>
        </div>

        {/* Right Pane: Companion Suite */}
        <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-sm md:rounded-3xl lg:h-full lg:flex-[5]">
          {/* Header / Tabs */}
          <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <Skeleton className="size-6 rounded-md" />
          </div>

          {/* Panel Content (Intake summary + Chat stream placeholder) */}
          <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/40 p-3.5 space-y-2">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-start gap-2">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <Skeleton className="h-12 w-3/4 rounded-xl" />
                </div>
                <div className="flex items-start justify-end gap-2">
                  <Skeleton className="h-10 w-2/3 rounded-xl" />
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                </div>
              </div>
            </div>

            {/* Chat Input Placeholder */}
            <div className="pt-2">
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
