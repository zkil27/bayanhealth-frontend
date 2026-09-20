"use client";

import {
  LogOut,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSignOut } from "@/hooks/use-sign-out";

/** Derive two-letter initials from a display name, e.g. "Sarah Rodriguez" → "SR". */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // Shared across the doctor and admin shells, so the fallback can't assume a
  // role — an unnamed account renders a neutral mark, not someone else's title.
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SidebarUserButton({
  user,
}: {
  user: {
    name: string;
    /** Shown under the name — a doctor's specialty, an admin's role, else the email. */
    subtitle: string;
    avatar?: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { signOut } = useSignOut();
  const initials = getInitials(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="rounded-xl bg-(--text-on-brand)/6 text-sidebar-foreground hover:bg-(--text-on-brand)/6 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-9 w-9 rounded-full bg-(--teal-800) text-white">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-(--teal-800) font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">{user.name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/65">
                    {user.subtitle}
                  </span>
                </div>
                <Settings className="ml-auto size-4 text-sidebar-foreground/60" />
              </SidebarMenuButton>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuGroup>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg shadow-2xl bg-primary"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal text-white">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.subtitle}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="text-white">
                <DropdownMenuItem
                  className="text-white cursor-pointer"
                  onClick={() => signOut()}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenuGroup>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
