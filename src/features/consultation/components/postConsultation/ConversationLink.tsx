"use client";

import { useCallback, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRemaining, startFollowUpWindow } from "@/features/consultation/lib/followUpChat";
import { ConversationPopup } from "./ConversationPopup";
import { useFollowUpCountdown } from "./useFollowUpCountdown";

/**
 * The conversation with the patient, from the post-consult workspace
 * (clinical remarks Nov 16; popup and 3-minute follow-up 2026-11-23).
 *
 * Opens in place: a docked panel on desktop, a bottom sheet on a phone. The
 * note in progress stays on screen. The doctor uses it to ask what they
 * forgot during the consult, so the doctor can start one 3-minute follow-up
 * window. While it runs, this button carries the time left, so closing the
 * panel never hides the clock.
 *
 * `consultationId` is kept for call-site compatibility; the thread is keyed
 * by booking.
 */
export function ConversationLink({
  bookingId,
  compact = false,
  className,
}: {
  bookingId: string;
  consultationId?: string;
  /** Icon-first on a phone header, where width is tight. */
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localWindow, setLocalWindow] = useState<string | null>(null);
  const [serverWindow, setServerWindow] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const writableUntil = serverWindow ?? localWindow;
  const { remainingMs, phase } = useFollowUpCountdown(writableUntil);
  const running = phase === "active" || phase === "ending";

  const onStart = useCallback(
    async (opts: { chatStillOpen: boolean }) => {
      setStarting(true);
      try {
        const result = await startFollowUpWindow(bookingId, opts);
        if (result.kind === "open") setLocalWindow(result.writableUntil);
        else toast.error("Couldn't start the follow-up. You can still read the conversation.");
      } finally {
        setStarting(false);
      }
    },
    [bookingId],
  );

  const label = running
    ? `Conversation, follow-up open, ${formatRemaining(remainingMs)} left`
    : "Conversation with the patient";

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        shape="pill"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        onClick={() => {
          setMounted(true);
          setOpen((v) => !v);
        }}
        className={cn(
          "gap-1.5 border-(--border-default) px-3",
          compact ? "h-11" : "h-9",
          running && phase === "ending" && "border-(--attention-border) text-(--attention-fg)",
          open && !compact && "bg-(--surface-warm)",
          className,
        )}
      >
        <MessageSquare className="size-4 shrink-0" aria-hidden />
        <span className={cn(compact && "max-[419px]:sr-only")}>Conversation</span>
        {running ? (
          <span className="tabular-nums text-xs font-semibold" aria-hidden>
            {formatRemaining(remainingMs)}
          </span>
        ) : null}
      </Button>
      {mounted ? (
        <ConversationPopup
          open={open}
          onOpenChange={setOpen}
          bookingId={bookingId}
          phase={phase}
          remainingMs={remainingMs}
          starting={starting}
          onStart={(opts) => void onStart(opts)}
          onServerWindow={setServerWindow}
          returnFocusRef={triggerRef}
        />
      ) : null}
    </>
  );
}
