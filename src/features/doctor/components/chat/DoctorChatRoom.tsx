"use client";

import { Illustration } from "@/components/primitives/Illustration";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SendHorizonal, Video } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import {
  useConsultationChat,
  type ChatTransport,
  type DisplayMessage,
} from "@/features/consultation/hooks/useConsultationChat";
import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";
import {
  fetchConversationPage,
  type ConversationEntry,
} from "@/features/consultation/lib/api/conversations";
import { formatDateGroup, formatMessageClock } from "./chatDateUtils";

/**
 * `/doctor/chat/{bookingId}` — the doctor's side of one conversation
 * (Task 9, mirrors `PatientChatRoom.tsx`).
 */
export function DoctorChatRoom({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();

  const isDemo = bookingId === "demo" || bookingId === "preview";

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken && !isDemo,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  // Cached conversations lookup to resolve patient display name
  const convQuery = useQuery({
    queryKey: ["doctor-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const matchedConv: ConversationEntry | undefined = convQuery.data?.conversations?.find(
    (c) => c.booking.bookingId === bookingId,
  );

  const patientRef = shortRef(bookingId);
  const resolvedPatientName = matchedConv?.patientName;
  const displayName = resolvedPatientName ?? `Ref ${patientRef}`;
  const avatarInitials = resolvedPatientName
    ? resolvedPatientName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : patientRef.slice(0, 2);

  const bookingStatus = bookingQuery.data?.status;
  const isReadOnly = bookingStatus === "completed" || bookingStatus === "cancelled";
  const isLive = bookingStatus === "in_progress";

  const chat = useConsultationChat({
    bookingId,
    readOnly: isReadOnly,
    enabled: isDemo || !bookingQuery.isLoading,
  });

  useEffect(() => {
    if (chat.sendError) {
      toast.error(chat.sendError);
    }
  }, [chat.sendError]);

  return (
    <div
      data-slot="doctor-chat-room"
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-(--surface-page)"
    >
      {/* Messages App Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-(--border-subtle) bg-(--surface-card) px-3.5 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/doctor/chat"
            aria-label="Back to conversations"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-(--border-subtle) bg-(--surface-warm) text-(--text-heading) shadow-2xs md:hidden"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
          </Link>

          <Avatar className="size-10 shrink-0 border border-(--border-subtle)">
            <AvatarFallback className="bg-(--surface-warm) text-xs font-bold text-(--text-heading)">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-(--text-heading)">
                {displayName}
              </h2>
              {resolvedPatientName ? (
                <span className="shrink-0 rounded-md bg-(--surface-warm) px-1.5 py-0.5 font-mono text-[10.5px] text-(--text-subtle)">
                  {patientRef}
                </span>
              ) : null}
            </div>

            {isReadOnly ? (
              <p className="mt-0.5 truncate text-xs text-(--text-muted)">
                Consultation Ended · History (Read-only)
              </p>
            ) : (
              <TransportLine transport={chat.transport} isLive={isLive} />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isReadOnly ? (
            <Badge
              variant="outline"
              className="border-(--border-subtle) text-[11px] text-(--text-muted)"
            >
              Archived
            </Badge>
          ) : (
            <Link
              href={`/consultation/room/${encodeURIComponent(bookingId)}`}
              aria-label="Switch to video consultation"
              title="Switch to video consultation"
              className="flex items-center gap-1.5 rounded-xl bg-(--action-primary) px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
            >
              <Video className="size-3.5" />
              <span className="hidden sm:inline">Join Video</span>
            </Link>
          )}
        </div>
      </header>

      {/* Read-Only Status Banner */}
      {isReadOnly ? (
        <div
          data-slot="doctor-chat-read-only-banner"
          className="shrink-0 border-b border-(--border-subtle) bg-(--surface-warm) px-4 py-2.5 text-xs text-(--text-muted)"
        >
          <span className="font-semibold text-(--text-heading)">
            {bookingStatus === "cancelled"
              ? "This booking was cancelled."
              : "This consultation has ended."}
          </span>{" "}
          This conversation is read-only and preserved for the clinical record.
        </div>
      ) : null}

      {/* Booking query error */}
      {bookingQuery.error ? (
        <div className="shrink-0 p-3">
          <Alert variant="destructive">
            <AlertTitle className="text-xs font-semibold">
              Couldn&apos;t load consultation details
            </AlertTitle>
            <AlertDescription className="text-xs">
              {bookingQuery.error instanceof Error
                ? bookingQuery.error.message
                : "Something went wrong."}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {/* Messages Canvas */}
      <MessageList
        messages={chat.messages}
        isLoading={chat.isLoading}
        readOnly={isReadOnly}
        patientInitials={avatarInitials}
      />

      {chat.sendError ? (
        <span data-slot="doctor-chat-send-error" className="sr-only">
          {chat.sendError}
        </span>
      ) : null}

      {/* Message Composer (Bottom Pinned) */}
      {isReadOnly ? null : (
        <div className="shrink-0 border-t border-(--border-subtle) bg-(--surface-card) p-3 md:p-3.5">
          <Composer
            input={chat.input}
            setInput={chat.setInput}
            send={chat.send}
            validationError={chat.validationError}
          />
        </div>
      )}
    </div>
  );
}

function TransportLine({
  transport,
  isLive,
}: {
  transport: ChatTransport;
  isLive: boolean;
}) {
  const statusLabel = isLive
    ? "Live Consultation"
    : transport === "ws"
      ? "Connected"
      : transport === "http"
        ? "Connected · no live updates"
        : "Connecting…";

  return (
    <div
      data-slot="doctor-chat-transport"
      data-transport={transport}
      className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-(--text-muted)"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          isLive
            ? "bg-(--status-available-fg)"
            : transport === "ws"
              ? "bg-primary"
              : transport === "http"
                ? "bg-(--status-soon-fg)"
                : "bg-border",
        )}
      />
      <span>{statusLabel}</span>
    </div>
  );
}

function MessageList({
  messages,
  isLoading,
  readOnly,
  patientInitials,
}: {
  messages: DisplayMessage[];
  isLoading: boolean;
  readOnly: boolean;
  patientInitials: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div
        data-slot="doctor-chat-loading"
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground"
      >
        <Spinner className="size-4" />
        Loading conversation…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        data-slot="doctor-chat-empty"
        className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-(--text-muted)"
      >
        <Illustration name="shared/no-conversations" size="sm" className="mb-2" />
        <p className="max-w-xs leading-relaxed">
          {readOnly
            ? "No messages were recorded during this consultation."
            : "No messages yet. Send a clinical message to the patient below."}
        </p>
      </div>
    );
  }

  return (
    <ol
      data-slot="doctor-chat-messages"
      className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4 md:p-5"
    >
      {messages.map((message, index) => {
        const currentDateGroup = formatDateGroup(message.createdAt);
        const prevMessage = messages[index - 1];
        const prevDateGroup = prevMessage ? formatDateGroup(prevMessage.createdAt) : null;
        const showDateSeparator = currentDateGroup && currentDateGroup !== prevDateGroup;

        const clock = formatMessageClock(message.createdAt);

        return (
          <div key={message.messageId} className="flex flex-col gap-2.5">
            {showDateSeparator ? (
              <div className="my-2 flex justify-center">
                <span className="rounded-full border border-(--border-subtle) bg-(--surface-warm) px-3 py-0.5 text-[11px] font-medium text-(--text-muted)">
                  {currentDateGroup}
                </span>
              </div>
            ) : null}

            <li
              data-slot="doctor-chat-message"
              data-own={message.isOwn ? "true" : "false"}
              data-pending={message.pending ? "true" : "false"}
              className={cn(
                "flex flex-col",
                message.isOwn ? "items-end self-end" : "items-start self-start",
                message.pending && "opacity-70",
              )}
            >
              <div className="flex items-end gap-2 max-w-[85%] md:max-w-[75%]">
                {!message.isOwn ? (
                  <Avatar className="size-6 shrink-0 border border-(--border-subtle) mb-0.5">
                    <AvatarFallback className="bg-(--surface-warm) text-[9px] font-bold text-(--text-heading)">
                      {patientInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : null}

                <div
                  className={cn(
                    "px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-2xs",
                    message.isOwn
                      ? "rounded-2xl rounded-br-xs bg-(--action-primary) font-medium text-white"
                      : "rounded-2xl rounded-bl-xs border border-(--border-subtle) bg-(--surface-card) text-(--text-heading)",
                  )}
                >
                  <span className="break-words whitespace-pre-wrap">{message.content}</span>
                </div>
              </div>

              {clock ? (
                <span
                  className={cn(
                    "mt-1 text-[10px] text-(--text-subtle)",
                    message.isOwn ? "pr-1" : "pl-8",
                  )}
                >
                  {clock}
                </span>
              ) : null}
            </li>
          </div>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}

function Composer({
  input,
  setInput,
  send,
  validationError,
}: {
  input: string;
  setInput: (value: string) => void;
  send: () => Promise<boolean>;
  validationError: string | null;
}) {
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await send();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <textarea
          data-slot="doctor-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Type a clinical message… (Enter to send, Shift+Enter for new line)"
          aria-label="Message"
          aria-invalid={validationError ? true : undefined}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-(--border-subtle) bg-(--surface-page) px-3.5 py-2.5 text-xs text-(--text-heading) placeholder:text-(--text-muted) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--action-primary) text-white shadow-2xs transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          <SendHorizonal className="size-4" />
        </button>
      </div>

      {validationError ? (
        <p
          data-slot="doctor-chat-length-error"
          role="alert"
          className="text-[12px] text-destructive"
        >
          {validationError}
        </p>
      ) : input.length > MAX_CHAT_MESSAGE_LENGTH * 0.8 ? (
        <p className="text-right text-[11px] text-muted-foreground">
          {input.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </p>
      ) : null}
    </form>
  );
}

/** Last six characters of a booking id, uppercased — the platform's standing "no name" reference. */
function shortRef(bookingId: string): string {
  return bookingId.slice(-6).toUpperCase();
}
