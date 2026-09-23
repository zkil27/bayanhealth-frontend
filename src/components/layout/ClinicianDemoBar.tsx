"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  FileSignature,
  FileText,
  Info,
  LayoutDashboard,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoRouteItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const DEMO_LINKS: DemoRouteItem[] = [
  {
    name: "Flight Deck & Queue",
    href: "/doctor",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Teleconsult Room",
    href: "/consultation/room/demo",
    icon: Video,
  },
  {
    name: "Post-Consult CDS",
    href: "/doctor/post-consultation/id?consultationId=demo&bookingId=demo",
    icon: FileSignature,
  },
  {
    name: "Clinic Schedule",
    href: "/doctor/schedule",
    icon: Calendar,
  },
  {
    name: "Route Index",
    href: "/admin/routes",
    icon: Compass,
  },
];

export function ClinicianDemoBar() {
  const pathname = usePathname() ?? "";

  return (
    <header
      data-slot="clinician-demo-bar"
      aria-label="Clinician Demonstration Controls"
      className="sticky top-0 z-40 mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-3.5 py-2 shadow-2xs backdrop-blur-xs"
    >
      {/* Clinician Demo Indicator */}
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-(--navy-800) text-(--teal-400)">
          <Stethoscope className="size-4" aria-hidden />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-(--text-heading)">
              Physician UI Demo Mode
            </span>
            <span className="inline-flex items-center rounded-full bg-(--teal-50) px-2 py-0.5 text-[10px] font-semibold text-(--teal-800) border border-(--teal-200)">
              Live Preview
            </span>
          </div>
          <span className="text-[11px] text-(--text-muted) hidden sm:inline">
            Interactive clinical cockpit & zero-backend consultation workspaces
          </span>
        </div>
      </div>

      {/* Quick Jump Links */}
      <nav className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {DEMO_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href.split("?")[0]);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                isActive
                  ? "bg-(--navy-800) text-white shadow-xs"
                  : "text-(--text-body) hover:bg-(--surface-warm) hover:text-(--text-heading)",
              )}
            >
              <Icon className={cn("size-3.5", isActive ? "text-(--teal-400)" : "text-(--text-muted)")} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
