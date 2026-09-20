"use client";

import { useId, useMemo } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { JourneyStep, JourneyViewModel } from "@/lib/patient/careJourney";

import { buildEcgPath, labelSide } from "./ecgGeometry";
import { NodeIcon, nodeClass, STATUS_TEXT } from "./JourneyNode";
import { StepDetails } from "./StepDetails";

/**
 * Desktop ECG journey chart, built as three layers over one coordinate space.
 *
 * 1. Geometry — `d`, guide lines and node positions come from `ecgGeometry`
 *    and depend only on each step's `xPosition` and `yPosition`. They never
 *    change on interaction or when the current step moves.
 * 2. Stroke — the same `d` drawn again: gray with an idle breathing opacity,
 *    and teal clipped at the current node's x with a sweeping heartbeat mask.
 *    Animations touch opacity and a mask transform, never coordinates.
 * 3. Nodes — per-status style with an independent pulse on the active one.
 *
 * The teal boundary, the active node, and the CTA bar all read
 * `vm.activeStepIndex`; this component holds no state of its own about it.
 */
export function EcgJourneyChart({ vm }: { vm: JourneyViewModel }) {
  const { steps, activeStepIndex, phase } = vm;
  const xs = steps.map((step) => step.xPosition);
  // Keyed by the coordinates' values, not the array identity, so a new view
  // model with the same layout reuses the same `d`.
  const coordKey = steps.map((step) => `${step.xPosition}:${step.yPosition}`).join(",");
  const d = useMemo(
    () =>
      buildEcgPath(
        coordKey.split(",").map((pair) => {
          const [x, y] = pair.split(":").map(Number);
          return { x, y };
        }),
      ),
    [coordKey],
  );

  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `ecg-clip-${rawId}`;
  const maskId = `ecg-mask-${rawId}`;
  const gradientId = `ecg-grad-${rawId}`;

  // The one place the colour boundary is computed.
  const progressWidth =
    phase === "complete" ? 100 : phase === "not-started" ? 0 : xs[activeStepIndex] ?? 0;
  const hasProgress = phase !== "not-started";

  return (
    <div
      data-slot="ecg-journey-chart"
      data-phase={phase}
      data-active-index={activeStepIndex}
      className="px-2"
    >
      {/*
        Height scales with width (clamped), so the up/down rhythm keeps its
        proportions instead of flattening on wide screens. Labels live inside
        this same box, positioned from each node's own `yPosition`.
      */}
      <div className="relative h-[clamp(8.5rem,14vw,11rem)]">
        {/* Layer 1: guide lines */}
        {xs.map((x, i) => (
          <span
            key={`guide-${steps[i].id}`}
            aria-hidden
            data-slot="ecg-guide"
            className="absolute inset-y-1 border-l border-dashed border-(--ink-500) opacity-25"
            style={{ left: `${x}%` }}
          />
        ))}

        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          fill="none"
        >
          <defs>
            <clipPath id={clipId}>
              <rect data-slot="ecg-progress-clip" x={0} y={-10} width={progressWidth} height={120} />
            </clipPath>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.5" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id={maskId} maskUnits="userSpaceOnUse" x={-30} y={-10} width={160} height={120}>
              <rect className="ecg-sweep" x={-24} y={-10} width={24} height={120} fill={`url(#${gradientId})`} />
            </mask>
          </defs>

          {/* Layer 2: base stroke, idle breathing */}
          <path
            data-slot="ecg-path-base"
            d={d}
            className="ecg-idle"
            style={{ stroke: "var(--ink-500)" }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {hasProgress ? (
            <g clipPath={`url(#${clipId})`} data-slot="ecg-progress">
              <path
                data-slot="ecg-path-progress"
                d={d}
                style={{ stroke: "var(--surface-nav-accent)" }}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                data-slot="ecg-path-pulse"
                d={d}
                mask={`url(#${maskId})`}
                style={{ stroke: "var(--highlight)" }}
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}
        </svg>

        {/* Layer 3: nodes, at the same coordinates the path passes through */}
        {steps.map((step, i) => (
          <ChartNode key={step.id} step={step} x={xs[i]} />
        ))}

        {steps.map((step, i) => {
          const side = labelSide(step.yPosition);
          return (
            <span
              key={`label-${step.id}`}
              data-slot="ecg-label"
              data-label-side={side}
              className={cn(
                // Centred on the node; the inner track leaves room at both edges.
                "pointer-events-none absolute -translate-x-1/2 text-[11px] leading-tight font-bold whitespace-nowrap text-(--text-heading)",
                // Clear of the node (radius 0.875rem) plus a small gap.
                side === "below" ? "translate-y-[1.25rem]" : "translate-y-[calc(-100%-1.25rem)]",
                step.status === "locked" && "text-(--text-muted)",
              )}
              style={{ left: `${xs[i]}%`, top: `${step.yPosition}%` }}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ChartNode({ step, x }: { step: JourneyStep; x: number }) {
  // Open away from the label: a peak node (label below) prefers above, a low
  // node (label above) prefers below. The popover anchors to the trigger's own
  // rect, so it follows the node wherever it sits, and Base UI still flips or
  // shifts it when the preferred side would clip.
  const preferredSide = labelSide(step.yPosition) === "below" ? "top" : "bottom";
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={80}
        closeDelay={80}
        data-slot={`patient-home-care-plan-step-${step.id}`}
        data-status={step.status}
        aria-label={`${step.label}: ${STATUS_TEXT[step.status]}`}
        className={cn(
          "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent) focus-visible:ring-offset-2",
          nodeClass(step.status),
        )}
        style={{ left: `${x}%`, top: `${step.yPosition}%` }}
      >
        <NodeIcon status={step.status} />
      </PopoverTrigger>
      <PopoverContent
        side={preferredSide}
        sideOffset={10}
        data-slot="patient-home-care-plan-popover"
        className="w-64 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <PopoverTitle className="text-[13px] font-bold text-(--text-heading)">
            {step.label}
          </PopoverTitle>
          <span className="text-[10px] font-bold tracking-(--tracking-overline) text-(--text-muted) uppercase">
            {STATUS_TEXT[step.status]}
          </span>
        </div>
        <StepDetails details={step.content.details} status={step.status} />
      </PopoverContent>
    </Popover>
  );
}
