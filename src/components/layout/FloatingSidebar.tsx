"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSignOut } from "@/hooks/use-sign-out";
import { AppLogo } from "@/components/primitives/Logo/AppLogo";
import { DOCTOR_NAV, PATIENT_NAV, isNavItemActive } from "@/components/layout/nav-items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * The inner content of the desktop navigation island, in three pinned bands:
 *
 * 1. **Top** — the BayanHealth wordmark logo.
 * 2. **Middle** — the nav list, `my-auto` so it sits vertically centred in
 *    whatever space the top and bottom bands leave.
 * 3. **Bottom** — for a doctor, the teleconsult-duty toggle; then a sign-out
 *    button that opens a confirmation dialog rather than ending the session on
 *    the first click. (The patient "switch profile" control lived here until the
 *    dependent flow it belonged to shipped a backend — it does not, so it is
 *    gone rather than sitting inert.)
 *
 * It is position-agnostic: it renders those three flex children and nothing
 * else. The owning `<aside>` in each app shell ({@link PatientShell}, the doctor
 * layout) provides the chrome — a `sticky` in-flow column, the white surface,
 * the radius, `p-5`, `shadow-lg` and `flex-col justify-between`. Making the rail
 * a real flex sibling of `<main>` rather than a `fixed` overlay is what removed
 * the `lg:pl-28` / `xl:pl-68` clearance padding — and the oversized dead margins
 * it produced on wide displays — from every content wrapper.
 */
export function SidebarContent() {
  const pathname = usePathname() ?? "";
  const area: "patient" | "doctor" = pathname.startsWith("/doctor")
    ? "doctor"
    : "patient";
  const items = useMemo(
    () => (area === "doctor" ? DOCTOR_NAV : PATIENT_NAV),
    [area],
  );

  const { signOut, pending } = useSignOut();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // `next-themes`: `resolvedTheme` is only known client-side, so the toggle is
  // withheld until mount rather than rendering the wrong icon for a
  // `system`-resolved theme (same guard as `DoctorThemeToggle` / `ModeToggle`).
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* -------------------------------------------------- top: brand -- */}
      <div className="flex px-1 pt-1">
        <AppLogo
          type="withText"
          width={164}
          height={33}
          className="dark:brightness-0 dark:invert"
        />
        <span className="sr-only">BayanHealth</span>
      </div>

      {/* --------------------------------------- middle: nav (centred) -- */}
      <nav className="my-auto flex flex-col gap-1.5 py-4">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-(--text-subtle)"
              >
                <Icon className="size-5 shrink-0" />
                <span className="flex-1">{item.title}</span>
                <span className="rounded-full bg-(--surface-accent-soft) px-2 py-0.5 text-[10px] font-semibold tracking-wide text-(--text-muted) uppercase">
                  Soon
                </span>
              </div>
            );
          }

          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                active
                  ? "bg-(--action-primary) font-semibold text-(--action-primary-text) shadow-sm"
                  : "text-(--text-muted) hover:bg-(--surface-accent-soft) hover:text-(--text-heading)",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* --------------------------------- bottom: theme + sign out -- */}
      {/*
        No duty toggle here for a doctor. There used to be one — `useState`
        holding its own `onDuty` boolean, never written to any backend field —
        and the doctor dashboard's `DoctorDutyCard` is the single source of
        truth for on-demand availability (`onDemandAvailable` on the doctor's
        real profile, `PUT /v1/doctors/me/profile`). Two controls both named
        "duty" that could disagree — one real, one a decorative local
        `useState` — is worse than one.
      */}
      <div className="flex flex-col gap-1.5 border-t border-(--border-subtle) pt-3">
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-(--text-muted) transition-colors hover:bg-(--surface-accent-soft) hover:text-(--text-heading)"
          >
            {isDark ? (
              <Sun className="size-5 shrink-0" />
            ) : (
              <Moon className="size-5 shrink-0" />
            )}
            <span className="flex-1 text-left font-medium text-(--text-heading)">
              {isDark ? "Light mode" : "Dark mode"}
            </span>
            <span
              aria-hidden
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                isDark ? "bg-(--action-primary)" : "bg-(--border-default)",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
                  isDark ? "left-[1.125rem]" : "left-0.5",
                )}
              />
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-(--danger-fg) transition-colors hover:bg-(--danger-bg)"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>

      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent data-slot="sidebar-logout-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of BayanHealth?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end your current session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                void signOut();
              }}
            >
              {pending ? "Signing out…" : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Standalone `fixed` island — retained for {@link AppCanvas} and any surface
 * that is not built on the sticky-flex app shell. New shells should render a
 * `sticky` `<aside>` wrapping {@link SidebarContent} directly instead; see
 * {@link PatientShell}.
 */
export function FloatingSidebar() {
  return (
    <aside
      className={cn(
        "fixed left-4 top-4 bottom-4 z-50 hidden w-60 flex-col justify-between",
        "rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-5 text-(--text-body) shadow-lg lg:flex",
      )}
    >
      <SidebarContent />
    </aside>
  );
}
