import type { ReactNode } from "react";

import { QueryClientProviders } from "@/components/blocks/Providers";
import { NavBar } from "@/features/patient/components/NavBar";
import { PatientBreadcrumb } from "@/features/patient/components/Breadcrumb";
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
      <div className="bg-satin relative flex min-h-screen w-full gap-4 overflow-hidden p-0 text-(--text-body) sm:px-3.5 sm:pb-3.5 sm:pt-0 lg:h-screen lg:gap-4 lg:px-5 lg:pb-3 lg:pt-0">
        <aside className="relative z-30 hidden h-[calc(100vh-1.75rem)] w-60 shrink-0 flex-col justify-between rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-raised) p-5 text-(--text-body) shadow-lg lg:flex lg:my-3 lg:h-[calc(100%-1.5rem)]">
          <SidebarContent />
        </aside>
        <main
          className={cn(
            "bg-satin relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden pb-24 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pb-2",
            className,
          )}
        >
          <PatientBreadcrumb />
          {children}
        </main>
        <NavBar />
      </div>
    </QueryClientProviders>
  );
}
