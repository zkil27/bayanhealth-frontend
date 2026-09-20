import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

/**
 * Admin area layout (task 6.7, design A1–A6).
 *
 * Provides the Admin shell: the navy `AdminSidebar` from which the operational
 * queue, user management, KYC supervision, notification outbox and platform
 * settings pages are each reachable (Requirements 6.6, 7.6). This replaces the
 * earlier top-header + light side-nav chrome so the admin and doctor areas share
 * one shell. Access to `/admin/*` is gated to the `admin` role by the route guard
 * (`src/lib/route-guard.ts`); sign-out lives in the sidebar footer's user button.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "15rem",
          "--sidebar-width-mobile": "20rem",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AdminSidebar />
      <SidebarInset className="bg-(--surface-page)">
        {/*
          The sidebar collapses to an off-canvas sheet on mobile, so it needs a
          trigger that lives outside it; on desktop the same control collapses
          the rail to icons.
        */}
        <div className="flex items-center gap-2 px-4 pt-4 md:px-6">
          <SidebarTrigger />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
