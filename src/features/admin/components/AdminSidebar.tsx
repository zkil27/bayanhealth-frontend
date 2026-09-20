"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { SidebarUserButton } from "@/components/blocks/navigation/SidebarUserButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Admin-area sidebar (design A1–A6).
 *
 * The admin shell now uses the same navy `Sidebar` primitive as the doctor area
 * rather than the earlier top-header + light side nav, so an operator moving
 * between the two areas gets one chrome instead of two. Every admin page — the
 * operational queue, user management, KYC supervision, the notification outbox
 * and platform settings — is reachable from here (Requirements 6.6, 7.6);
 * access to `/admin/*` itself is gated to the `admin` role by the route guard
 * (`src/lib/route-guard.ts`).
 */

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kyc", label: "KYC supervision", icon: ShieldCheck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Platform settings", icon: Settings },
];

/**
 * The active nav entry, by longest match.
 *
 * `/admin` is a genuine path-ancestor of every other admin route, so a plain
 * prefix test marks Overview active everywhere. Longest-match-wins is the same
 * rule client-side routers use for nested routes.
 */
function activeHref(pathname: string): string | null {
  return ADMIN_NAV_ITEMS.reduce<string | null>((best, { href }) => {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (!matches) return best;
    return best === null || href.length > best.length ? href : best;
  }, null);
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const isCollapsed = state === "collapsed";
  const current = activeHref(pathname);

  const session = useAuthStore((s) => s.session);
  const email = session?.email ?? "";
  // The identity store is the only name source the admin shell has; there is no
  // "admin profile" endpoint. Falling back to the email is honest — inferring a
  // display name from the local part would invent one.
  const displayName = email || "Administrator";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader
        className={cn(
          "flex items-center pt-4 pb-2",
          isCollapsed ? "px-0" : "px-3",
        )}
      >
        {/*
          Matches DoctorSidebar: the `withText` logo draws "Bayan" in navy for a
          light header, which disappears against this navy sidebar, so the
          wordmark is drawn as colored text beside the mark instead.
        */}
        <div className="flex items-center gap-2">
          <AppLogo type="logoOnly" width={isCollapsed ? 26 : 32} height={32} />
          {!isCollapsed && (
            <span className="font-display text-2xl leading-none font-medium">
              <span className="text-(--teal-700)">Bayan</span>
              <span className="text-(--cream-100)">Health</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("pt-3", isCollapsed ? "px-2" : "px-3")}>
        {!isCollapsed && (
          <div className="px-3 pb-1 text-xs font-semibold tracking-wide text-sidebar-foreground/55 uppercase">
            Administration
          </div>
        )}
        <SidebarMenu className="space-y-2">
          {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === current;
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  tooltip={label}
                  className={cn(
                    // Hover is a faint wash, not a fill, so the pointer never
                    // makes a second row read as active.
                    "flex items-center rounded-xl px-3 py-3 text-sidebar-foreground/82 transition-colors hover:bg-(--text-on-brand)/10 hover:text-(--text-on-brand)",
                    isCollapsed && "justify-center",
                    isActive &&
                      "bg-(--teal-500) font-bold text-(--navy-900) hover:bg-(--teal-500) hover:text-(--navy-900)",
                  )}
                  render={
                    <Link
                      href={href}
                      prefetch
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="ml-2 text-sm font-medium">{label}</span>
                      )}
                    </Link>
                  }
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className={cn("gap-3", isCollapsed ? "px-2" : "px-3")}>
        {/* `/admin` is admin-only, so the subtitle is the area's one role. */}
        <SidebarUserButton
          user={{ name: displayName, subtitle: "Platform admin" }}
        />
        {!isCollapsed && (
          <p className="px-1 text-xs text-sidebar-foreground/50">
            Click your name to sign out.
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
