"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeartbeatProgressProps {
  value: number;
  className?: string;
  height?: number;
  strokeWidth?: number;
  numberOfBeats?: number;
}

export const HeartbeatProgress = ({
  value,
  className = "",
  height = 50,
  strokeWidth = 3,
  numberOfBeats = 5,
}: HeartbeatProgressProps) => {
  const singleRelativeBeat =
    "l 15 0 l 5 -10 l 5 20 l 5 -30 l 5 40 l 5 -20 l 15 0";
  const totalWidth = numberOfBeats * 50;
  const heartbeatPath = `M -10 20 ${singleRelativeBeat.repeat(numberOfBeats)}`;

  const clampedValue = Math.max(0, Math.min(100, value));
  const strokeDashoffset = 100 - clampedValue;

  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="h-auto w-full overflow-visible"
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <path d={heartbeatPath} className="stroke-gray-200" pathLength="100" />

        <path
          d={heartbeatPath}
          className="stroke-primary transition-all duration-700 ease-out"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      <div className="sr-only" aria-live="polite">
        Progress: {Math.round(clampedValue)} percent
      </div>
    </div>
  );
};

interface BeatingHeartProps {
  className?: string;
  height?: number;
  strokeWidth?: number;
  speed?: "slow" | "normal" | "fast";
  text?: string;
}
interface BeatingHeartProps {
  className?: string;
  height?: number;
  strokeWidth?: number;
  speed?: "slow" | "normal" | "fast";
  text?: string;
}

export const BeatingHeart = ({
  className = "",
  height = 50,
  strokeWidth = 3,
  speed = "slow",
  text = "Waiting for doctor...",
}: BeatingHeartProps) => {
  const speedMap = {
    slow: "5s",
    normal: "2s",
    fast: "1.2s",
  };

  const singleRelativeBeat =
    "l 10 0 l 5 -10 l 5 20 l 5 -30 l 5 40 l 5 -20 l 15 0";
  const numberOfBeats = 4;
  const totalWidth = numberOfBeats * 50;
  const pathLengthValue = 1000;
  const pulseLength = 150;
  const gapLength = pathLengthValue;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <style>{`
        @keyframes snake-sweep {
          0% {
            stroke-dashoffset: ${pathLengthValue};
          }
          100% {
            stroke-dashoffset: -${pulseLength};
          }
        }
        .animate-snake-pulse {
          animation: snake-sweep ${speedMap[speed]} linear infinite;
        }
      `}</style>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          className="h-auto w-full overflow-visible"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={`M 0 25 ${singleRelativeBeat.repeat(numberOfBeats)}`}
            className="stroke-gray-300 dark:stroke-zinc-800"
          />

          <path
            d={`M 0 25 ${singleRelativeBeat.repeat(numberOfBeats)}`}
            className="animate-snake-pulse stroke-primary"
            pathLength={pathLengthValue}
            strokeDasharray={`${pulseLength} ${gapLength}`}
          />
        </svg>
      </div>

      {text && (
        <Badge className="text-xs font-medium text-white px-4 py-2">
          {text}
        </Badge>
      )}

      <div className="sr-only" aria-live="polite">
        {text}
      </div>
    </div>
  );
};
