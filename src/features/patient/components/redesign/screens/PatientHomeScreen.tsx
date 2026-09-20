import {
  Ambulance,
  Bell,
  BriefcaseMedical,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  GraduationCap,
  HeartPulse,
  LayoutGrid,
  Stethoscope,
  Video,
} from "lucide-react";

import {
  Avatar,
  BottomNav,
  BrandButton,
  Card,
  Chip,
  IconBadge,
  Screen,
} from "../primitives";

/** Figma S1 — Tagalog patient home ("Kumusta, Maria D."). */
export function PatientHomeScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col gap-5 px-5 pt-2 pb-28">
        {/* Greeting */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Avatar>MD</Avatar>
            <div className="leading-tight">
              <p className="text-[16px] text-(--text-muted)">Kumusta,</p>
              <p className="text-[17px] font-bold text-(--text-heading)">
                Maria D.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-11 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
          >
            <Bell className="size-5" />
          </button>
        </div>

        {/* Hero */}
        <div className="rounded-[22px] bg-(--text-heading) p-5 text-white">
          <h2 className="font-display max-w-[15rem] text-[22px] leading-[1.12] tracking-[-0.01em]">
            Kailangan mo ng doktor ngayon?
          </h2>
          <p className="mt-1.5 text-[16px] leading-[1.5] text-white/80">
            Kumonsulta sa PRC-licensed na doktor, tapos kunin ang care summary
            mo.
          </p>
          <BrandButton
            size="sm"
            className="mt-4 bg-(--teal-500) text-(--navy-900) hover:bg-(--teal-400)"
            iconLeft={<Stethoscope />}
          >
            Consult a doctor
          </BrandButton>
        </div>

        {/* Emergency notice */}
        <div className="flex gap-3 rounded-[18px] border border-(--red-600) bg-(--red-100) px-4 py-3.5">
          <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[12px] bg-(--red-600) text-white">
            <Ambulance className="size-6" />
          </span>
          <div>
            <p className="text-[16px] font-bold text-(--red-700)">
              Hindi para sa emergency
            </p>
            <p className="mt-0.5 text-[15px] leading-[1.45] text-(--red-700)">
              Kung life-threatening, tumawag sa 911 o pumunta sa pinakamalapit na
              ospital.
            </p>
          </div>
        </div>

        {/* Para sa'yo */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
              Para sa&apos;yo
            </h3>
            <span className="text-[15px] font-semibold text-(--text-muted)">
              1 ng 3
            </span>
          </div>

          <Card className="relative mt-3">
            <div className="flex h-40 items-center justify-center rounded-[12px] border border-dashed border-(--border-default) bg-(--cream-200) p-3 text-center text-[12px] text-(--text-subtle)">
              Partner ad creative · 320×160
            </div>
            <span className="absolute top-2.5 left-2.5 rounded-full bg-(--text-heading) px-2 py-0.5 text-[14px] font-bold tracking-wider text-white">
              Ad
            </span>
            <div className="flex items-center justify-between px-3.5 py-3">
              <p className="text-[16px] font-bold text-(--text-heading)">
                Partner promo
              </p>
              <ChevronRight className="size-[18px] text-(--text-subtle)" />
            </div>
            <button
              type="button"
              aria-label="Previous"
              className="absolute top-[74px] left-2 flex size-11 items-center justify-center rounded-full border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-sm)"
            >
              <ChevronLeft className="size-5 text-(--text-heading)" />
            </button>
            <button
              type="button"
              aria-label="Next"
              className="absolute top-[74px] right-2 flex size-11 items-center justify-center rounded-full border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-sm)"
            >
              <ChevronRight className="size-5 text-(--text-heading)" />
            </button>
          </Card>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-(--action-primary)" />
            <span className="size-1.5 rounded-full bg-(--border-default)" />
            <span className="size-1.5 rounded-full bg-(--border-default)" />
          </div>
        </div>

        {/* Mga serbisyo */}
        <div>
          <h3 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
            Mga serbisyo
          </h3>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <ServiceTile icon={<Stethoscope />} label="Konsulta" />
            <ServiceTile icon={<HeartPulse />} label="My Health" />
            <ServiceTile icon={<GraduationCap />} label="Med Ed" soon />
            <ServiceTile icon={<LayoutGrid />} label="Higit pa" soon />
          </div>
        </div>

        {/* Mga konsulta mo */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
              Mga konsulta mo
            </h3>
            <span className="text-[16px] font-semibold text-(--text-heading)">
              See all
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            <ConsultRow
              icon={<Video />}
              iconTone="teal"
              title="Teleconsult"
              when="Ngayon · 2:30 PM"
              status={
                <Chip tone="safe" icon={<CircleCheck />}>
                  Confirmed
                </Chip>
              }
            />
            <ConsultRow
              icon={<BriefcaseMedical />}
              iconTone="navy"
              title="Fit for Work"
              when="Hul 28 · 10:00 AM"
              status={
                <Chip tone="pending" icon={<Clock />}>
                  Pending
                </Chip>
              }
            />
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </Screen>
  );
}

function ServiceTile({
  icon,
  label,
  soon,
}: {
  icon: React.ReactNode;
  label: string;
  soon?: boolean;
}) {
  return (
    <div className={soon ? "opacity-85" : undefined}>
      <div className="relative flex size-[72px] items-center justify-center rounded-[18px] border border-(--border-subtle) bg-(--surface-card) text-(--teal-800) shadow-(--shadow-sm) [&_svg]:size-6">
        {icon}
        {soon && (
          <span className="absolute -top-1.5 right-2 inline-flex items-center gap-0.5 rounded-full bg-(--gold-100) px-1.5 py-0.5 text-[12px] font-bold text-(--gold-700)">
            <Clock className="size-[9px]" />
            Soon
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 text-center text-[14px] font-semibold ${
          soon ? "text-(--text-subtle)" : "text-(--text-body)"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function ConsultRow({
  icon,
  iconTone,
  title,
  when,
  status,
}: {
  icon: React.ReactNode;
  iconTone: "teal" | "navy";
  title: string;
  when: string;
  status: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3 rounded-[14px] p-3.5">
      <IconBadge tone={iconTone}>{icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-(--text-heading)">{title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[15px] text-(--text-muted)">
          <Clock className="size-3.5 shrink-0" />
          {when}
        </p>
      </div>
      {status}
    </Card>
  );
}
