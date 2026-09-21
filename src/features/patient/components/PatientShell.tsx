import type { ReactNode } from "react";

import { QueryClientProviders } from "@/components/blocks/Providers";
import { NavBar } from "@/features/patient/components/NavBar";
import { SidebarContent } from "@/components/layout/FloatingSidebar";
import { cn } from "@/lib/utils";

interface PatientShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * The one app shell every patient-area route renders inside.
 */
export function PatientShell({ children, className }: PatientShellProps) {
  return (
    <QueryClientProviders>
      <div className="bg-satin relative flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden p-0 text-(--text-body)">
        <aside className="fixed left-4 top-3 bottom-3 z-30 hidden w-60 flex-col justify-between rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-raised) p-5 text-(--text-body) shadow-lg lg:flex">
          <SidebarContent />
        </aside>
        <main
          className={cn(
            "bg-satin relative z-10 flex min-w-0 w-full flex-1 flex-col overflow-x-hidden p-0 m-0 h-full min-h-0 lg:overflow-y-auto lg:pb-2",
            className,
          )}
        >
          {children}
        </main>
        <NavBar />
      </div>
    </QueryClientProviders>
  );
}
