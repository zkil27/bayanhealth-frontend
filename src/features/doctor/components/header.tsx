"use client";

import { usePathname } from "next/navigation";

import { DoctorNotification } from "./notification/DoctorNotification";
import { DoctorThemeToggle } from "./theme/DoctorThemeToggle";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMyDoctorProfile } from "../hooks/useMyDoctorProfile";

/** Last name from a full name, so the header can say "Dr. Santos" rather than the whole registered name. */
function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : fullName;
}

/*
 * `--surface-warm-soft` used to be the hover fill here, but it sits one shade
 * off `--surface-card` in the same cream family — on the actual page the
 * hover was nearly imperceptible. `--action-secondary-hover-surface` is a
 * distinct hue (pale navy on the light theme, deep navy on dark) already
 * reserved in the token set for exactly this: a hover surface that reads as a
 * state change rather than a rounding error.
 */
const iconButtonClass =
  "flex size-[42px] items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) [&_svg]:size-[19px]";

export function DoctorHeader() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const email = session?.email ?? "";
  const { profile } = useMyDoctorProfile();
  const displayName = profile?.fullName?.trim() || email || "Doctor";
  const greetingName = profile?.fullName?.trim() ? lastName(profile.fullName) : displayName;

  // Real "today", formatted the way the D1 design shows it: weekday · long date.
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const longDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // The dashboard has no header: it greets in its identity card (like the
  // patient home), the sidebar carries the dark-mode switch, and the
  // notification bell sits in the "Your practice" row.
  if (pathname === "/doctor") return null;

  return (
    <header className="flex items-center justify-between gap-2 border-b border-(--border-subtle) bg-(--surface-page) px-4 py-5 md:px-7">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <h1 className="font-display text-xl leading-tight font-bold text-(--text-heading) md:text-2xl">
            Kumusta, Dr. {greetingName}
          </h1>
          <p className="text-sm text-(--text-muted) capitalize">
            {weekday} · {longDate}
          </p>
        </div>
      </div>
      {/*
        Each control is wrapped in the same `iconButtonClass` shell, and the
        hover state belongs to the shell alone. The inner components must not
        carry their own — the notification bell used to paint itself teal on
        hover while the theme toggle used the shell's warm wash, so two
        neighbouring buttons of identical shape behaved differently.
      */}
      <div className="flex items-center gap-2.5">
        <div className={iconButtonClass}>
          <DoctorThemeToggle />
        </div>
        <div className={iconButtonClass}>
          <DoctorNotification />
        </div>
      </div>
    </header>
  );
}
