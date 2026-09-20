import { Suspense } from "react";

import { SidebarContent } from "@/components/layout/FloatingSidebar";
import { DoctorHeader } from "@/features/doctor/components/header";
import { QueryClientProviders } from "@/components/blocks/Providers";
import Loading from "./loading";

/**
 * The whole doctor shell now reads real backend data — the header shows their
 * real schedule and the availability card reads their recorded profile — so the
 * QueryClient lives here rather than being wrapped around individual cards.
 *
 * Navigation is a `sticky` in-flow `<aside>` wrapping {@link SidebarContent}
 * (desktop `lg:` and up). It replaced the `fixed` `FloatingSidebar`, whose
 * out-of-flow positioning forced `<main>` to reserve the rail's width with
 * `lg:pl-28` / `xl:pl-68` clearance padding on top of an `mx-auto` `max-w`
 * cap — offsets that compounded into oversized dead margins on wide displays.
 * The shell is now one `flex … gap-6 p-4` row: the rail beside
 * `<main className="flex-1 min-w-0">`, which fills the remaining width up to a
 * single 1440px cap with an exact 24px gap to the rail and no coordinate math.
 */
export default function DoctorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryClientProviders>
      {/*
        `lg` and up, the row is pinned to exactly one viewport and only `<main>`
        scrolls — the same shell rule as `PatientShell` — so the dashboard fits
        the screen with the sidebar and content bottoms aligned.
      */}
      <div className="bg-satin relative flex min-h-screen gap-6 overflow-hidden p-4 text-(--text-body) lg:h-screen lg:py-3">
        <aside className="relative z-50 hidden h-full w-60 shrink-0 flex-col justify-between rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-raised) p-5 text-(--text-body) shadow-lg lg:flex">
          <SidebarContent />
        </aside>
        <main className="bg-satin relative flex min-w-0 flex-1 flex-col overflow-x-hidden lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <DoctorHeader />
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
      </div>
    </QueryClientProviders>
  );
}
