"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Clock, Info, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";
import { fetchConversationPage } from "@/features/consultation/lib/api/conversations";
import { useConsultationChat } from "@/features/consultation/hooks/useConsultationChat";
import { isHistoryOnlyConversation } from "@/features/consultation/lib/conversationStatus";
import {
  formatRemaining,
  isDemoChatBooking,
  readFollowUpWindow,
} from "@/features/consultation/lib/followUpChat";
import { Composer, MessageList } from "@/features/doctor/components/chat/ChatParts";
import type { FollowUpPhase } from "./useFollowUpCountdown";

/** Questions doctors most often come back for; a tap fills the composer. */
const QUICK_QUESTIONS = [
  "Any medicine allergies?",
  "Taking any other medicines?",
  "Pregnant or breastfeeding?",
] as const;

/**
 * The conversation with the patient, opened in place from the post-consult
 * workspace so the note in progress stays on screen (2026-11-23).
 *
 * Its job is the question the doctor forgot. The doctor starts a 3-minute
 * follow-up, and the patient can reply until it closes. One window per
 * consultation. The window itself is a backend dependency: see
 * `lib/followUpChat.ts`.
 *
 * Desktop: a docked, non-modal panel, so the documentation stays editable
 * while waiting for a reply. Phone: a bottom sheet.
 *
 * Stays mounted after the first open, so messages and the clock survive
 * closing and reopening it. The follow-up state lives in the trigger
 * (`ConversationLink`), which also shows the time left.
 */
export function ConversationPopup({
  open,
  onOpenChange,
  bookingId,
  phase,
  remainingMs,
  starting,
  onStart,
  onServerWindow,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  phase: FollowUpPhase;
  remainingMs: number;
  starting: boolean;
  onStart: (opts: { chatStillOpen: boolean }) => void;
  /** Reports a window the server already has open (e.g. after a reload). */
  onServerWindow: (writableUntil: string | null) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const idToken = useIdToken();
  const isPhone = useIsBreakpoint("max", 1024);
  const isDemo = isDemoChatBooking(bookingId);

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken && !isDemo,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });
  const convQuery = useQuery({
    queryKey: ["doctor-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken && !isDemo,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const serverWindow = readFollowUpWindow(bookingQuery.data);
  useEffect(() => {
    onServerWindow(serverWindow);
  }, [serverWindow, onServerWindow]);

  // The server accepts messages on a booking that is not yet completed, so a
  // follow-up can run there today; on a completed one only with the backend window.
  const bookingStillOpen = !isHistoryOnlyConversation(bookingQuery.data?.status);
  const canStart = isDemo || bookingStillOpen || serverWindow !== null;

  const writable = phase === "active" || phase === "ending";
  const chat = useConsultationChat({
    bookingId,
    readOnly: !writable,
    enabled: isDemo || !bookingQuery.isLoading,
  });

  useEffect(() => {
    if (chat.sendError) toast.error(chat.sendError);
  }, [chat.sendError]);

  const patientName = isDemo
    ? "Maria Santos"
    : convQuery.data?.conversations?.find((c) => c.booking.bookingId === bookingId)?.patientName;
  const ref = bookingId.slice(-6).toUpperCase();
  const initials = patientName
    ? patientName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : ref.slice(0, 2);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  // A started window puts the cursor straight in the composer.
  const wasWritable = useRef(writable);
  useEffect(() => {
    if (writable && !wasWritable.current) inputRef.current?.focus();
    wasWritable.current = writable;
  }, [writable]);

  const body = (
    <>
      <div className="flex min-h-0 flex-1 flex-col bg-(--surface-page)">
        <MessageList
          messages={chat.messages}
          isLoading={chat.isLoading}
          readOnly={!writable}
          patientInitials={initials}
        />
      </div>
      <Footer
        phase={phase}
        remainingMs={remainingMs}
        canStart={canStart}
        starting={starting}
        onStart={() => onStart({ chatStillOpen: bookingStillOpen })}
        startRef={startRef}
        isPhone={isPhone}
      >
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                chat.setInput(q);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-(--border-default) bg-(--surface-card) px-3 text-xs font-medium text-(--text-body) transition-colors hover:border-(--teal-700) hover:text-(--teal-700) focus-visible:outline-2 focus-visible:outline-(--focus-ring) max-lg:h-11 max-lg:text-sm lg:h-8"
            >
              {q}
            </button>
          ))}
        </div>
        <Composer
          input={chat.input}
          setInput={chat.setInput}
          send={chat.send}
          validationError={chat.validationError}
          inputRef={inputRef}
          placeholder="Type your question for the patient…"
          inputClassName="max-lg:min-h-12 max-lg:text-base"
        />
      </Footer>
    </>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[92dvh] max-h-[92dvh] bg-(--surface-card)">
          <DrawerHeader className="gap-1 border-b border-(--border-subtle) px-4 pt-2 pb-3 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
            <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-(--text-heading)">
              <MessageSquare className="size-5 shrink-0 text-(--navy-700) dark:text-(--navy-300)" aria-hidden />
              <span className="truncate">{patientName ?? `Ref ${ref}`}</span>
            </DrawerTitle>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DockedPanel
      open={open}
      onClose={() => onOpenChange(false)}
      returnFocusRef={returnFocusRef}
      initialFocusRef={writable ? inputRef : startRef}
      title={patientName ?? `Ref ${ref}`}
      refLabel={patientName ? ref : null}
    >
      {body}
    </DockedPanel>
  );
}

/** Desktop shell: fixed bottom-right, non-modal; Esc or X closes and focus goes back to the trigger. */
function DockedPanel({
  open,
  onClose,
  returnFocusRef,
  initialFocusRef,
  title,
  refLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  title: string;
  refLabel: string | null;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      (initialFocusRef.current ?? panelRef.current)?.focus();
    } else if (!open && wasOpen.current) {
      returnFocusRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open, initialFocusRef, returnFocusRef]);

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="conversation-popup-title"
      tabIndex={-1}
      hidden={!open}
      data-slot="conversation-popup"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="fixed right-5 bottom-5 z-40 flex h-[min(560px,calc(100dvh-7rem))] w-[380px] flex-col overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-card) shadow-[0_16px_40px_-12px_rgb(7_73_114/0.28)] outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-(--border-subtle) px-4 pt-3.5 pb-3">
        <MessageSquare className="size-5 shrink-0 text-(--navy-700) dark:text-(--navy-300)" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id="conversation-popup-title" className="truncate text-[15px] font-bold text-(--text-heading)">
              {title}
            </h2>
            {refLabel ? (
              <span className="shrink-0 rounded-md bg-(--surface-warm) px-1.5 py-0.5 font-mono text-[10.5px] text-(--text-subtle)">
                {refLabel}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation"
          className="-my-1.5 -mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--surface-warm) hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          <X className="size-4.5" aria-hidden />
        </button>
      </header>
      {children}
    </section>
  );
}

function Footer({
  phase,
  remainingMs,
  canStart,
  starting,
  onStart,
  startRef,
  isPhone,
  children,
}: {
  phase: FollowUpPhase;
  remainingMs: number;
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
  startRef: RefObject<HTMLButtonElement | null>;
  isPhone: boolean;
  children: ReactNode;
}) {
  const pad = cn(
    "shrink-0 border-t border-(--border-subtle) bg-(--surface-card) px-4 pt-3",
    isPhone ? "pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" : "pb-3.5",
  );

  // Announced only when the wording changes: start, 1 minute, 30 seconds, close.
  const announcement =
    phase === "closed"
      ? "Follow-up closed."
      : phase === "ending"
        ? "30 seconds left in the follow-up."
        : phase === "active"
          ? remainingMs <= 60_000
            ? "1 minute left in the follow-up."
            : "Follow-up open. The patient can reply for 3 minutes."
          : "";
  const live = (
    <span className="sr-only" aria-live="polite" role="status">
      {announcement}
    </span>
  );

  if (phase === "closed") {
    return (
      <div className={pad}>
        {live}
        <p className="flex items-start gap-2 text-sm leading-snug text-(--text-muted)">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-(--teal-700)" aria-hidden />
          <span>
            <span className="font-semibold text-(--text-heading)">Follow-up closed.</span> The conversation is saved
            to the record.
          </span>
        </p>
      </div>
    );
  }

  if (phase === "active" || phase === "ending") {
    const ending = phase === "ending";
    return (
      <div className={cn(pad, "flex flex-col gap-2.5")}>
        {live}
        <div
          data-slot="follow-up-countdown"
          data-phase={phase}
          className={cn(
            "flex items-center gap-2 self-start rounded-full border px-2.5 py-1 text-xs font-semibold",
            ending
              ? "border-(--attention-border) bg-(--attention-bg) text-(--attention-fg)"
              : "border-(--border-subtle) bg-(--surface-warm) text-(--text-heading)",
          )}
        >
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span>{ending ? "Closing soon" : "Patient can reply"}</span>
          <span className="tabular-nums">{formatRemaining(remainingMs)}</span>
        </div>
        {children}
      </div>
    );
  }

  if (!canStart) {
    return (
      <div className={pad}>
        <p className="flex items-start gap-2 text-sm leading-snug text-(--text-muted)">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Follow-up messages need a server update. You can still read the conversation.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(pad, "flex flex-col gap-1.5")}>
      <Button
        ref={startRef}
        type="button"
        shape="pill"
        disabled={starting}
        onClick={onStart}
        className="h-12 w-full gap-2 bg-(--action-primary) text-[15px] font-semibold text-white hover:bg-(--action-primary-hover)"
      >
        {starting ? <Spinner className="size-4" /> : <Clock className="size-4" aria-hidden />}
        Start 3-minute follow-up
      </Button>
      <p className="text-center text-xs text-(--text-muted)">The timer starts when you press this.</p>
    </div>
  );
}
