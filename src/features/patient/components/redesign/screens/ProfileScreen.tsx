import type { ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Languages,
  Lock,
  LogOut,
  Moon,
  Phone,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";

import {
  Avatar,
  BottomNav,
  Chip,
  Screen,
  Toggle,
} from "../primitives";
import { cn } from "@/lib/utils";

/** Figma S3 — profile & settings. */
export function ProfileScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col px-5 pt-2 pb-28">
        <div className="flex flex-col items-center pt-4 pb-5">
          <Avatar size={84}>MD</Avatar>
          <p className="mt-3 text-[20px] font-bold tracking-[-0.01em] text-(--text-heading)">
            Maria Dela Cruz
          </p>
          <p className="mt-0.5 text-[16px] text-(--text-muted)">
            maria.delacruz@gmail.com
          </p>
        </div>

        <SettingsCard>
          <Row icon={<User />} label="Personal details" chevron />
          <Row
            icon={<TriangleAlert />}
            label="Allergies"
            chevron
            trailing={
              <Chip tone="danger" className="border border-(--red-600)">
                Penicillin
              </Chip>
            }
          />
          <Row
            icon={<Phone />}
            label="Emergency contact"
            value="Juan D."
            chevron
          />
          <Row
            icon={<Users />}
            label="Mga kapamilya"
            value="Nanay Rosa · 68"
            chevron
          />
        </SettingsCard>

        <SettingsCard className="mt-3.5">
          <Row
            icon={<Languages />}
            label="Wika"
            trailing={
              <span className="flex gap-1 rounded-full bg-(--cream-200) p-1">
                <span className="rounded-full bg-(--surface-card) px-3 py-1 text-[14px] font-bold text-(--text-heading) shadow-(--shadow-xs)">
                  Filipino
                </span>
                <span className="px-3 py-1 text-[14px] font-semibold text-(--text-muted)">
                  English
                </span>
              </span>
            }
          />
          <Row icon={<Moon />} label="Dark mode" trailing={<Toggle />} />
          <Row
            icon={<Bell />}
            label="Email at in-app reminders"
            trailing={<Toggle on />}
          />
          <Row icon={<Lock />} label="Privacy at data" chevron />
        </SettingsCard>

        <SettingsCard className="mt-3.5">
          <Row icon={<CircleHelp />} label="Help & support" chevron />
          <Row icon={<LogOut />} label="Sign out" danger />
        </SettingsCard>
      </div>

      <BottomNav active="profile" />
    </Screen>
  );
}

function SettingsCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-(--border-subtle) overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-sm)",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  trailing,
  chevron,
  danger,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          "shrink-0 [&_svg]:size-[19px]",
          danger ? "text-(--red-700)" : "text-(--teal-800)",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "flex-1 text-[15px] font-semibold",
          danger ? "text-(--red-700)" : "text-(--text-body)",
        )}
      >
        {label}
      </span>
      {value && (
        <span className="text-[14px] text-(--text-muted)">{value}</span>
      )}
      {trailing}
      {chevron && (
        <ChevronRight className="size-[17px] shrink-0 text-(--text-subtle)" />
      )}
    </div>
  );
}
