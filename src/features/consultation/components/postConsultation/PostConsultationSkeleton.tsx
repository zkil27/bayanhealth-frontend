import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * PostConsultationSkeleton
 *
 * High-fidelity, accessible skeleton loader that mirrors the 3-column clinical
 * cockpit layout of the post-consultation workspace (AssessmentFirstWorkspace).
 *
 * Eliminates jarring layout shifts (CLS) and replaces the bare spinner/gear
 * with an authoritative, reassuring preview of the incoming clinical workspace.
 */
export function PostConsultationSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="post-consultation-skeleton"
      aria-busy="true"
      aria-label="Loading post-consultation workspace"
      className={cn(
        "flex min-h-screen w-full max-w-full min-w-0 flex-col bg-satin text-(--text-body) antialiased",
        className,
      )}
    >
      {/* 1. Header (matches WorkspaceHeader) */}
      <header
        data-slot="workspace-header-skeleton"
        className="flex w-full max-w-full min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 shadow-xs sm:px-4 sm:py-3 md:px-6"
      >
        {/* Left: Back button + Avatar + Heading + Status badge */}
        <div className="flex min-w-0 flex-1 sm:flex-initial items-center gap-2.5 sm:gap-3">
          {/* Back button */}
          <div className="flex size-8.5 sm:size-9 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card)">
            <Skeleton className="size-4 rounded" />
          </div>

          {/* Stethoscope circle avatar */}
          <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-(--surface-brand)/15">
            <Skeleton className="size-4.5 sm:size-5 rounded-full" />
          </div>

          {/* Title and ID */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-4.5 sm:h-5 w-36 sm:w-44 rounded-md" />
            <Skeleton className="h-3 w-24 sm:w-32 rounded" />
          </div>

          {/* Status badge pill */}
          <Skeleton className="ml-1 hidden sm:block h-6 w-36 rounded-full" />
        </div>

        {/* Right: Stepper (Review -> Assess -> Deliver) + Actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3 lg:gap-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {/* Step 1: Review */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="hidden xl:block h-3.5 w-12 rounded" />
            </div>
            <span className="h-px w-3 sm:w-4 xl:w-6 bg-(--border-default)" />

            {/* Step 2: Assess */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="hidden xl:block h-3.5 w-12 rounded" />
            </div>
            <span className="h-px w-3 sm:w-4 xl:w-6 bg-(--border-default)" />

            {/* Step 3: Deliver */}
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 w-12 rounded" />
            </div>
          </div>

          {/* Actions placeholder */}
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-7 w-9 sm:w-20 rounded-full" />
            <Skeleton className="h-7 w-36 sm:w-40 rounded-full bg-(--action-primary)/20" />
          </div>
        </div>
      </header>

      {/* 2. Responsive 2-Column Cockpit Grid (70/30) */}
      <div className="grid flex-1 grid-cols-1 items-start gap-4 p-3 sm:p-4 min-w-0 max-w-full lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* Left Stage: Main Clinical Workspace (70%) */}
        <main className="order-1 flex min-w-0 flex-col gap-4">
          {/* SOAP Summary Ribbon (Subjective & Objective) */}
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between lg:divide-x lg:divide-(--border-subtle)">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-52 rounded" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:pl-3.5">
              <Skeleton className="size-6 rounded-md" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
            </div>
          </div>


          {/* Confirmed Assessment Card */}
          <div className="rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4.5 shadow-xs sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-1 items-start gap-3">
                <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-44 rounded" />
                  <Skeleton className="h-6 w-3/4 max-w-sm rounded-md" />
                </div>
              </div>
              {/* Revise action placeholder */}
              <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
            </div>
          </div>

          {/* Deliverables & Documentation Deck */}
          <div className="overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-xs">
            {/* Document Draft Canvas / Empty State Placeholder */}
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center sm:p-12">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-5 w-44 rounded-md" />
              <div className="flex w-full max-w-sm flex-col items-center space-y-1.5">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-4/5 rounded" />
              </div>
            </div>
          </div>

          {/* Care Continuity Panel */}
          <div className="rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4.5 shadow-xs sm:p-5">
            <div className="mb-4 space-y-1">
              <Skeleton className="h-4.5 w-32 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-3.5 w-44 rounded" />
                </div>
                <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
              </div>

              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>

          {/* Authorized Artifact History Accordion */}
          <div className="rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4.5 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
          </div>
        </main>

        {/* Right Rail: Patient Intake Reference Dock (30%) */}
        <aside className="order-2 min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2.5rem)]">
          <div className="flex flex-col gap-4 rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4 shadow-xs">
            {/* Patient Intake Header */}
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4.5 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="size-5 rounded" />
            </div>

            {/* Intake Content Placeholder */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--border-subtle) bg-(--surface-warm-soft)/40 p-6 text-center">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <div className="space-y-1.5 w-full flex flex-col items-center">
                <Skeleton className="h-3 w-44 max-w-full rounded" />
                <Skeleton className="h-3 w-36 max-w-full rounded" />
              </div>
            </div>

            {/* Quick Demographics Metadata Skeleton */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
