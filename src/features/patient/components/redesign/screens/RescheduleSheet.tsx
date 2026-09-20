import type { ReactNode } from "react";
import { CalendarClock, ChevronRight, CircleX, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandButton, IconBadge, SheetShell } from "../primitives";

/** Figma M2 — "can't make it?" reschedule / cancel bottom sheet. */
export function RescheduleSheet() {
  return (
    <SheetShell>
      <h3 className="font-display pt-4 text-[20px] tracking-[-0.01em] text-(--text-heading)">
        Hindi ka makakadalo?
      </h3>
      <p className="pt-1.5 text-[16px] leading-[1.5] text-(--text-muted)">
        Konsulta kay Dr. Santos · Ngayon, 2:30 PM
      </p>

      <OptionRow
        selected
        icon={<CalendarClock />}
        iconTone="teal"
        title="I-reschedule"
        subtitle="Libre hanggang 1 oras bago ang konsulta"
        className="mt-4"
      />
      <OptionRow
        icon={<CircleX />}
        iconTone="red"
        title="I-cancel ang booking"
        subtitle="Full refund kung 2+ oras bago ang schedule"
        className="mt-2.5"
      />

      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-(--border-default) bg-(--ink-100) px-3.5 py-3">
        <Info className="mt-px size-[15px] shrink-0 text-(--text-muted)" />
        <p className="text-[14px] leading-[1.5] text-(--text-muted)">
          Babalik ang refund sa parehong GCash number sa loob ng 3–5 araw.
        </p>
      </div>

      <BrandButton full size="sm" variant="outline" className="mt-3.5">
        Panatilihin ang booking
      </BrandButton>
    </SheetShell>
  );
}

function OptionRow({
  selected,
  icon,
  iconTone,
  title,
  subtitle,
  className,
}: {
  selected?: boolean;
  icon: ReactNode;
  iconTone: "teal" | "red";
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[14px] bg-(--surface-card) p-3.5",
        selected
          ? "border-2 border-(--action-primary) shadow-(--shadow-sm)"
          : "border border-(--border-default)",
        className,
      )}
    >
      <IconBadge tone={iconTone}>{icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-(--text-heading)">{title}</p>
        <p className="mt-0.5 text-[14px] leading-[1.45] text-(--text-muted)">
          {subtitle}
        </p>
      </div>
      <ChevronRight className="size-[18px] shrink-0 text-(--text-subtle)" />
    </div>
  );
}
