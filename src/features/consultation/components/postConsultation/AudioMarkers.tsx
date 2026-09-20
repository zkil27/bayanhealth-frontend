import AppButton from "@/components/primitives/AppButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bookmark } from "lucide-react";

interface TimestampMarker {
  id: string;
  time: number; // in seconds
  speaker: "Doctor" | "Patient";
  transcript: string;
  annotation?: string;
}

/**
 * No fabricated transcript.
 *
 * This was a five-entry scripted consultation — "I have this pain in my chest...
 * on a left side.", "I've felt a little bit of shorter breathe, having difficulty
 * breathing since yesterday", annotated "Diagnostic plan initiated" — rendered as
 * if it were the recorded exchange for whichever consultation was open. The
 * platform performs no transcription (ADR-20260819-01 ships the consultation
 * media layer with no recording, transcription, or provider add-on in this
 * phase), so there is no source for this and it must come from the caller.
 */
const NO_MARKERS: TimestampMarker[] = [];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEAKER_STYLES: Record<
  TimestampMarker["speaker"],
  { dot: string; badge: string }
> = {
  Doctor: {
    dot: "bg-primary",
    badge: "bg-primary/40 text-primary dark:bg-blue-900 dark:text-blue-300",
  },
  Patient: {
    dot: "bg-secondary",
    badge:
      "bg-secondary/40 text-secondary dark:bg-amber-900 dark:text-amber-300",
  },
};

export function MarkerStrip({
  duration,
  markers = NO_MARKERS,
}: {
  duration: number;
  /** Real transcript markers. Empty until a transcription source exists. */
  markers?: TimestampMarker[];
}) {
  if (!duration || markers.length === 0) return <div className="h-4" />;

  return (
    <div className="relative h-4 w-full">
      {markers.map((marker) => {
        const pct = (marker.time / duration) * 100;
        const styles = SPEAKER_STYLES[marker.speaker];

        return (
          <Popover key={marker.id}>
            <PopoverTrigger
              render={
                <AppButton
                  size="icon-xs"
                  variant="ghost"
                  className="group absolute -top-1 -translate-x-1/2 focus:outline-none"
                  style={{ left: `${pct}%` }}
                  aria-label={`Marker at ${formatTime(marker.time)}`}
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ring-2 ring-background transition-transform duration-150 group-hover:scale-150 ${styles.dot} `}
                  />
                </AppButton>
              }
            />

            <PopoverContent
              side="bottom"
              align="center"
              className="w-72 space-y-2 border border-border bg-popover p-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
                >
                  {marker.speaker}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatTime(marker.time)}
                </span>
              </div>

              <p className="border-l-2 border-muted pl-2 text-sm leading-snug text-foreground italic">
                {`"${marker.transcript}"`}
              </p>

              {marker.annotation && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bookmark /> {marker.annotation}
                </p>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
