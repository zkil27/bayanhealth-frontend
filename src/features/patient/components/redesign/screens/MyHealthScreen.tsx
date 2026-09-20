import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  FileText,
  Pill,
  QrCode,
  Search,
} from "lucide-react";

import {
  Avatar,
  BottomNav,
  Card,
  Chip,
  IconBadge,
  Screen,
  SectionLabel,
  SegTabs,
} from "../primitives";

/** Figma S2 — "My Health" with Konsulta / Dokumento / Gamot tabs. */
export function MyHealthScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col gap-4 px-5 pt-2 pb-28">
        <div className="flex items-center justify-between pt-2">
          <h1 className="font-display text-[24px] tracking-[-0.01em] text-(--text-heading)">
            My Health
          </h1>
          <button
            type="button"
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
          >
            <Search className="size-[19px]" />
          </button>
        </div>

        <SegTabs tabs={["Konsulta", "Dokumento", "Gamot"]} active="Konsulta" />

        <div className="flex flex-col gap-2.5">
          <SectionLabel className="pt-2">Hulyo 2026</SectionLabel>

          <Card className="p-4 shadow-(--shadow-card)">
            <div className="flex items-center gap-3">
              <Avatar>JS</Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-(--text-heading)">
                  Dr. Jose Santos
                </p>
                <p className="text-[14px] text-(--text-muted)">
                  Teleconsult · Hul 24, 2:30 PM
                </p>
              </div>
              <Chip tone="safe" icon={<CircleCheck />}>
                Tapos
              </Chip>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="safe" icon={<FileText />}>
                Care summary
              </Chip>
              <Chip tone="safe" icon={<Pill />}>
                e-Rx
              </Chip>
              <Chip tone="pending" icon={<CalendarClock />}>
                Follow-up Hul 27
              </Chip>
            </div>
          </Card>

          <Card className="flex items-center gap-3 p-4">
            <Avatar className="bg-(--teal-800)">AR</Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-(--text-heading)">
                Dr. Ana Reyes
              </p>
              <p className="text-[14px] text-(--text-muted)">
                Sick leave cert · Hul 8
              </p>
            </div>
            <ChevronRight className="size-[18px] text-(--text-subtle)" />
          </Card>
        </div>

        <div className="flex flex-col gap-2.5">
          <SectionLabel className="pt-1">Mga dokumento</SectionLabel>

          <DocumentRow
            icon={<Pill />}
            iconTone="teal"
            title="e-Prescription"
            meta="Hul 24 · Dr. Santos"
          />
          <DocumentRow
            icon={<FileText />}
            iconTone="navy"
            title="Medical certificate"
            meta="Hul 8 · Dr. Reyes"
          />
        </div>
      </div>

      <BottomNav active="health" />
    </Screen>
  );
}

function DocumentRow({
  icon,
  iconTone,
  title,
  meta,
}: {
  icon: React.ReactNode;
  iconTone: "teal" | "navy";
  title: string;
  meta: string;
}) {
  return (
    <Card className="flex items-center gap-3 rounded-[14px] px-3.5 py-3">
      <IconBadge tone={iconTone}>{icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-(--text-heading)">{title}</p>
        <p className="text-[14px] text-(--text-muted)">{meta}</p>
      </div>
      <Chip tone="safe" icon={<QrCode />}>
        QR verified
      </Chip>
    </Card>
  );
}
