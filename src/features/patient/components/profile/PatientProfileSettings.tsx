"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Languages,
  Lock,
  LogOut,
  Moon,
  Phone,
  SlidersHorizontal,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn, deriveDisplayName, initialsOf } from "@/lib/utils";
import { useAuthStore, useUserId } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { patientPageClass } from "@/features/patient/components/PatientPage";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import { useSignOut } from "@/hooks/use-sign-out";
import { Avatar, Chip } from "@/features/patient/components/redesign/primitives";

/**
 * `/patient/profile` — patient profile & settings (Figma S3).
 *
 * What this replaces: a two-tab "User Data" page (`AppHeaderSimple` + Profile /
 * Doctor Preferences tabs) that rendered in its own layout, so tapping the
 * Profile nav tab dropped the patient out of `PatientShell` and the navigation
 * disappeared — on the one screen that holds "Sign out". Both editors survive as
 * their own routes, reached from the rows below; the shell now wraps them.
 *
 * Only rows with something real behind them are interactive:
 *
 * - **Personal details**, **Allergies** → `/patient/profile/details`, the existing
 *   profile form. `PUT /v1/patients/me/profile` stores `fullName`; the rest of
 *   that form is session-scoped, which `useProfile` already states outright
 *   (`isPersisted: false`, `isNamePersisted: true`).
 * - **Doctor preferences** → `/patient/profile/doctor-preferences`.
 * - **Dark mode** → `next-themes`, the real theme the app already ships.
 * - **Privacy & data** → `/privacy`, the standing public policy page.
 * - **Sign out** → {@link useSignOut}.
 *
 * The rest of the design's rows — emergency contact, family members, language,
 * reminders, help & support — have no field in `PatientProfile` (which holds
 * `patientId`, `fullName`, `createdAt`, `updatedAt` and nothing else) and no
 * endpoint anywhere in the contract. They are rendered visibly disabled with a
 * "Soon" badge, the same treatment the home service tiles use, rather than
 * wired to nothing or filled with the design's placeholder values
 * ("Juan D.", "Nanay Rosa · 68").
 */
export function PatientProfileSettings() {
  const userId = useUserId();
  const email = useAuthStore((s) => s.session?.email ?? "");
  const { profile, isLoading } = useProfile(userId);
  const { signOut, pending } = useSignOut();

  // The stored name wins; an email-derived one is a fallback for a patient who
  // has not saved a profile yet, never presented as if they had.
  const storedName = profile?.name?.trim();
  const displayName = storedName || (email ? deriveDisplayName(email) : "");

  const allergens = [
    ...(profile?.allergens ?? []),
    ...(profile?.otherAllergens?.trim() ? [profile.otherAllergens.trim()] : []),
  ].filter(Boolean);

  return (
    <div
      data-slot="patient-profile-page"
      className="flex h-full min-h-0 w-full min-w-0 flex-col justify-start pb-4"
    >
      <PatientPageHeader
        title="Profile"
        subtitle="Manage your personal details, allergies, and account preferences."
      />
      <section
        data-slot="patient-profile"
        className={patientPageClass("narrow", "gap-3.5 pt-4")}
      >
        <div className="flex flex-col items-center pt-4 pb-2">
          <Avatar size={84}>{initialsOf(displayName)}</Avatar>
          {isLoading ? (
            <span className="mt-3 flex items-center gap-2 text-[15px] text-(--text-muted)">
              <Spinner className="size-4" />
              Loading your profile…
            </span>
          ) : (
            <>
              <p className="mt-3 text-[20px] font-bold tracking-[-0.01em] text-(--text-heading)">
                {displayName || "Your profile"}
              </p>
              {email ? (
                <p className="mt-0.5 text-[16px] text-(--text-muted)">{email}</p>
              ) : null}
            </>
          )}
        </div>

        <SettingsCard label="Your details">
          <Row
            icon={<User />}
            label="Personal details"
            href="/patient/profile/details"
          />
          <Row
            icon={<TriangleAlert />}
            label="Allergies"
            href="/patient/profile/details"
            trailing={
              allergens.length > 0 ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {allergens.slice(0, 2).map((allergen) => (
                    <Chip key={allergen} tone="danger">
                      {allergen}
                    </Chip>
                  ))}
                  {allergens.length > 2 ? (
                    <Chip tone="neutral">+{allergens.length - 2}</Chip>
                  ) : null}
                </span>
              ) : (
                <span className="text-[14px] text-(--text-subtle)">Not set</span>
              )
            }
          />
          <Row
            icon={<SlidersHorizontal />}
            label="Doctor preferences"
            href="/patient/profile/doctor-preferences"
          />
          <Row icon={<Phone />} label="Emergency contact" soon />
          <Row icon={<Users />} label="Family members" soon />
        </SettingsCard>

        <SettingsCard label="Preferences">
          <Row
            icon={<Languages />}
            label="Language"
            soon
            trailing={
              <span className="text-[14px] text-(--text-subtle)">
                English (US)
              </span>
            }
          />
          <DarkModeRow />
          <Row
            icon={<Lock />}
            label="Privacy & data"
            href="/privacy"
          />
          <Row icon={<Bell />} label="Reminders" soon />
          <Row icon={<CircleHelp />} label="Help & support" soon />
        </SettingsCard>

        <SettingsCard label="Session">
          <Row
            icon={<LogOut />}
            label={pending ? "Signing out…" : "Sign out"}
            danger
            onClick={() => void signOut()}
            disabled={pending}
          />
        </SettingsCard>
      </section>
    </div>
  );
}

/** Dark mode, wired to the real `next-themes` theme. */
function DarkModeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  // `resolvedTheme` is undefined until `next-themes` has read the DOM class its
  // pre-paint inline script set, so the first client render cannot know the
  // theme. The switch is held disabled for that one render rather than drawn
  // "off" and then flipped on. Same mount guard, and the same lint exemption,
  // as `components/blocks/ModeToggle.tsx`.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Row
      icon={<Moon />}
      label="Dark mode"
      trailing={
        <Switch
          checked={isDark}
          disabled={!mounted}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Dark mode"
        />
      }
    />
  );
}

function SettingsCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="px-1 text-[13px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
        {label}
      </h2>
      <div className="divide-y divide-(--border-subtle) overflow-hidden rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-sm)">
        {children}
      </div>
    </div>
  );
}

/**
 * One settings row. Renders as a link, a button, or inert content depending on
 * what it actually does — a row with `soon` is never focusable, so the keyboard
 * order matches what can be used.
 */
function Row({
  icon,
  label,
  href,
  onClick,
  trailing,
  danger,
  soon,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
  soon?: boolean;
  disabled?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn(
          "shrink-0 [&_svg]:size-[19px]",
          danger
            ? "text-(--danger-fg)"
            : soon
              ? "text-(--text-subtle)/60"
              : "text-(--status-available-fg)",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "flex-1 text-left text-[15px] font-semibold",
          danger
            ? "text-(--danger-fg)"
            : soon
              ? "text-(--text-subtle)"
              : "text-(--text-body)",
        )}
      >
        {label}
      </span>
      {trailing}
      {soon ? (
        <span className="shrink-0 rounded-(--radius-pill) bg-(--status-soon-bg) px-1.5 py-0.5 text-[11px] font-bold text-(--status-soon-fg)">
          Soon
        </span>
      ) : href ? (
        <ChevronRight className="size-[17px] shrink-0 text-(--text-subtle)" />
      ) : null}
    </>
  );

  const shell =
    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors";

  if (soon) {
    return (
      <div
        aria-disabled="true"
        title={`${label} — coming soon`}
        className={cn(shell, "cursor-not-allowed")}
      >
        {body}
      </div>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)",
        )}
      >
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          shell,
          "hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={cn(shell, "cursor-default")}>{body}</div>;
}
