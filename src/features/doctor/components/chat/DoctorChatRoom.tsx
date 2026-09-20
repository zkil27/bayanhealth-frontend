"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SendHorizonal, Video } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useIdToken } from "@/stores/useAuthStore";
import {
  useConsultationChat,
  type ChatTransport,
  type DisplayMessage,
} from "@/features/consultation/hooks/useConsultationChat";
import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";

/**
 * `/doctor/chat/{bookingId}` — the doctor's side of one conversation
 * (Task 9, mirrors `PatientChatRoom.tsx`).
 *
 * Same transport (`useConsultationChat`), same read-only-once-terminal rule
 * (ADR-20260909-01) as the patient room. The one real asymmetry: the patient
 * room resolves the counterpart's name via `GET /v1/doctors/{doctorId}`
 * (a public, PHI-free directory read), and there is no equivalent for a
 * doctor to resolve an arbitrary patient's name — `resolvePatientDisplayName`
 * only ever runs server-side, inside `GET /v1/conversations`. A doctor who
 * reaches this room directly (a refresh, a bookmark, a shared link) rather
 * than by clicking through `DoctorChatList` therefore sees the same `Ref
 * XXXXXX` reference every other doctor surface already falls back to
 * (`IntakeQueueEntry`/`ScheduledRequestEntry`/`ReadyToStartCard`) — not a
 * gap this component introduces, but a real, standing platform limitation.
 */
export function DoctorChatRoom({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  // Read-only once the booking is terminal (ADR-20260909-01) — same rule and
  // same "undefined reads as not-yet-read-only" tolerance `PatientChatRoom`
  // applies while the booking read is still in flight.
  const bookingStatus = bookingQuery.data?.status;
  const isReadOnly = bookingStatus === "completed" || bookingStatus === "cancelled";

  const chat = useConsultationChat({ bookingId, readOnly: isReadOnly });

  const patientRef = shortRef(bookingId);
  const patientLabel = `Ref ${patientRef}`;

  return (
    <section
      data-slot="doctor-chat-room"
      className="mx-auto flex h-[calc(100dvh-6rem)] min-h-[24rem] w-full max-w-3xl flex-col px-2 pt-2 md:px-4"
    >
      <header className="flex shrink-0 items-center gap-3 pb-3">
        <Link
          href="/doctor/chat"
          aria-label="Back to conversations"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-card-foreground transition-transform duration-300 md:hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>

        <Avatar className="size-10">
          <AvatarFallback>{patientRef.slice(0, 2)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] leading-tight font-bold text-(--text-heading)">
            {patientLabel}
          </p>
          {isReadOnly ? (
            <p className="mt-0.5 truncate text-[13.5px] text-(--text-muted)">History</p>
          ) : (
            <TransportLine transport={chat.transport} />
          )}
        </div>

        {isReadOnly ? null : (
          <Link
            href={`/consultation/room/${encodeURIComponent(bookingId)}`}
            aria-label="Switch to video consultation"
            title="Switch to video"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-card-foreground transition-colors hover:bg-(--surface-warm-soft)"
          >
            <Video className="size-5" strokeWidth={1.75} />
          </Link>
        )}
      </header>

      {isReadOnly ? (
        <p
          data-slot="doctor-chat-read-only-banner"
          className="mb-3 shrink-0 rounded-lg border bg-(--surface-warm) px-3.5 py-2.5 text-[14px] leading-[1.45] text-(--text-muted)"
        >
          <span className="font-bold text-(--text-heading)">
            {bookingStatus === "cancelled"
              ? "This booking was cancelled."
              : "This consultation has ended."}
          </span>{" "}
          You can read the conversation below, but it&apos;s closed to new
          messages.
        </p>
      ) : null}

      {bookingQuery.error ? (
        <Alert variant="destructive" className="mb-3 shrink-0">
          <AlertTitle>Couldn&apos;t load this consultation</AlertTitle>
          <AlertDescription>
            {bookingQuery.error instanceof Error
              ? bookingQuery.error.message
              : "Something went wrong."}
          </AlertDescription>
        </Alert>
      ) : null}

      <MessageList messages={chat.messages} isLoading={chat.isLoading} readOnly={isReadOnly} />

      {chat.sendError ? (
        <Alert variant="destructive" className="mt-2 shrink-0" data-slot="doctor-chat-send-error">
          <AlertDescription>{chat.sendError}</AlertDescription>
        </Alert>
      ) : null}

      {isReadOnly ? null : (
        <Composer
          input={chat.input}
          setInput={chat.setInput}
          send={chat.send}
          validationError={chat.validationError}
        />
      )}
    </section>
  );
}

function TransportLine({ transport }: { transport: ChatTransport }) {
  const label =
    transport === "ws"
      ? "Connected"
      : transport === "http"
        ? "Connected · no live updates"
        : "Connecting…";
  return (
    <p
      data-slot="doctor-chat-transport"
      data-transport={transport}
      className="mt-0.5 flex items-center gap-1.5 truncate text-[13.5px] text-(--text-muted)"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          transport === "ws"
            ? "bg-primary"
            : transport === "http"
              ? "bg-(--status-soon-fg)"
              : "bg-border",
        )}
      />
      {label}
    </p>
  );
}

function MessageList({
  messages,
  isLoading,
  readOnly,
}: {
  messages: DisplayMessage[];
  isLoading: boolean;
  readOnly: boolean;
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
        className="flex flex-1 items-center justify-center gap-2 text-[14px] text-muted-foreground"
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
        className="flex flex-1 items-center justify-center px-6 text-center text-[14.5px] text-muted-foreground"
      >
        {readOnly
          ? "No messages were sent in this conversation."
          : "No messages yet. Send the first one — your patient will see it here."}
      </div>
    );
  }

  return (
    <ol
      data-slot="doctor-chat-messages"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-1"
    >
      {messages.map((message) => (
        <li
          key={message.messageId}
          data-slot="doctor-chat-message"
          data-own={message.isOwn ? "true" : "false"}
          data-pending={message.pending ? "true" : "false"}
          className={cn(
            "max-w-[82%] rounded-lg px-3.5 py-2.5 text-[15px] leading-[1.45]",
            message.isOwn
              ? "self-end bg-primary text-primary-foreground"
              : "self-start border bg-card text-card-foreground shadow-xs",
            message.pending && "opacity-70",
          )}
        >
          <span className="break-words whitespace-pre-wrap">{message.content}</span>
        </li>
      ))}
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
    <form onSubmit={onSubmit} className="shrink-0 pt-2 pb-1">
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
          placeholder="Type a message…"
          aria-label="Message"
          aria-invalid={validationError ? true : undefined}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-full border bg-card px-4 py-3 text-[15px] text-card-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <SendHorizonal className="size-[18px]" />
        </button>
      </div>

      {validationError ? (
        <p
          data-slot="doctor-chat-length-error"
          role="alert"
          className="mt-1.5 text-[13px] text-destructive"
        >
          {validationError}
        </p>
      ) : input.length > MAX_CHAT_MESSAGE_LENGTH * 0.8 ? (
        <p className="mt-1.5 text-right text-[12px] text-muted-foreground">
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
