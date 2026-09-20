import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Download,
  FileText,
  FlaskConical,
  Stethoscope,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, Chip, Screen, SegTabs } from "../primitives";

/** Figma P1 — "My Health" clinical timeline. */
export function HealthTimelineScreen() {
  return (
    <Screen className="min-h-[720px]">
      <div className="flex flex-col px-5 pt-2">
        <div className="flex items-center gap-3 pt-2 pb-3.5">
          <button
            type="button"
            aria-label="Back"
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display flex-1 text-[24px] tracking-[-0.01em] text-(--text-heading)">
            My Health
          </h1>
          <button
            type="button"
            aria-label="Download"
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-(--border-default) bg-(--surface-card) text-(--text-heading)"
          >
            <Download className="size-[19px]" />
          </button>
        </div>
        <SegTabs tabs={["Timeline", "Records"]} active="Timeline" />
      </div>

      <div className="relative flex flex-col gap-3.5 px-5 pt-4 pb-6">
        <span className="absolute top-6 bottom-10 left-[36px] w-0.5 bg-(--border-default)" />

        <TimelineItem
          node={<FlaskConical />}
          nodeTone="teal"
          chips={
            <>
              <Chip tone="safe">Lab result</Chip>
              <Chip tone="neutral">Reviewed</Chip>
            </>
          }
          title="CBC panel — normal"
          body="Hiniling ni Dr. Santos; walang nakitang abnormal values."
          when="Hul 22, 2026 · 4:10 PM"
        />
        <TimelineItem
          node={<FileText />}
          nodeTone="navy"
          chips={<Chip tone="info">Document</Chip>}
          title="e-Prescription — Amoxicillin"
          body="500mg, 3× araw, 7 araw. May QR verification code."
          when="Hul 22, 2026 · 3:05 PM"
        />
        <TimelineItem
          node={<Stethoscope />}
          nodeTone="tealDark"
          chips={
            <>
              <Chip tone="safe">Consultation</Chip>
              <Chip tone="neutral">Completed</Chip>
            </>
          }
          title="Teleconsult kay Dr. Jose Santos"
          body="Ubo at lagnat; may care summary at follow-up."
          when="Hul 22, 2026 · 2:30 PM"
        />

        <div className="relative flex items-center gap-3.5">
          <span className="z-10 flex size-[34px] shrink-0 items-center justify-center rounded-[17px] border border-(--border-default) bg-(--surface-card) text-(--text-subtle)">
            <CalendarClock className="size-[17px]" />
          </span>
          <p className="flex items-center gap-1.5 text-[14px] text-(--text-muted)">
            <CalendarClock className="size-3 shrink-0 text-(--text-subtle)" />
            Booking na-request · Hul 21
          </p>
        </div>
      </div>
    </Screen>
  );
}

const NODE_TONE = {
  teal: "bg-(--action-primary) text-white",
  navy: "bg-(--text-heading) text-white",
  tealDark: "bg-(--teal-800) text-white",
} as const;

function TimelineItem({
  node,
  nodeTone,
  chips,
  title,
  body,
  when,
}: {
  node: ReactNode;
  nodeTone: keyof typeof NODE_TONE;
  chips: ReactNode;
  title: string;
  body: string;
  when: string;
}) {
  return (
    <div className="relative flex gap-3.5">
      <span
        className={cn(
          "z-10 flex size-[34px] shrink-0 items-center justify-center rounded-[17px] [&_svg]:size-[17px]",
          NODE_TONE[nodeTone],
        )}
      >
        {node}
      </span>
      <Card className="flex-1 rounded-[14px] px-3.5 py-3">
        <div className="flex flex-wrap gap-1.5">{chips}</div>
        <p className="mt-1.5 text-[16px] font-bold text-(--text-heading)">
          {title}
        </p>
        <p className="mt-0.5 text-[16px] leading-[1.45] text-(--text-muted)">
          {body}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[14px] text-(--text-subtle)">
          <Clock className="size-3 shrink-0" />
          {when}
        </p>
      </Card>
    </div>
  );
}
