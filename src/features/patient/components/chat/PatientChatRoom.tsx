"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Paperclip,
  SendHorizonal,
  Stethoscope,
  Video,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_CHAT_MESSAGE_LENGTH, isChatWritable } from "@/lib/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn, initialsOf } from "@/lib/utils";
import { Avatar, IconBadge } from "@/features/patient/components/redesign/primitives";
import {
  useConsultationChat,
  type ChatTransport,
  type DisplayMessage,
} from "@/features/consultation/hooks/useConsultationChat";
import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import {
  DOCTOR_RESOLVING_LABEL,
  assignedDoctorLabel,
} from "@/features/booking/lib/doctorLabels";

/**
 * `/patient/chat/{bookingId}` — the patient's conversation with the assigned
 * doctor (Figma V9).
 *
 * The transport is the existing, contract-backed {@link useConsultationChat}
 * (WebSocket via `/v1/ws-token`, HTTP fallback over
 * `/v1/bookings/{bookingId}/messages`); this component is the patient-facing
 * shell around it. `ConsultationChatPanel` stays as-is for the doctor-and-patient
 * consultation room — this is not a replacement for it, it is the door the
 * patient nav never had.
 *
 * Two deliberate departures from the design:
 *
 * - **The nav bar stays.** V9 is a full-bleed screen with no tab bar, but
 *   `PatientShell` exists precisely so the patient nav does not vanish mid-flow,
 *   and chat is now one of its five tabs. The back arrow returns to the
 *   conversation list, so both routes out are present.
 * - **No presence or typing indicator yet.** V9 shows "Online · typing…". An
 *   earlier version of this comment claimed neither was available; that was
 *   wrong. `GET /v1/bookings/{bookingId}/presence` and
 *   `POST /v1/bookings/{bookingId}/typing` both exist and both admit the patient
 *   (booking owner). They are session-keyed, though — both go through
 *   `requireLiveChatBookingContext`, so they answer only while the consultation
 *   is `in_progress`, and the pre-consult `confirmed` phase genuinely has no
 *   presence to report. Until they are wired, the header states the real
 *   connection status rather than asserting the doctor is watching the screen.
 */
export function PatientChatRoom({ bookingId }: { bookingId: string }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const isDemo = bookingId === "demo" || bookingId === "preview";

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken && !isDemo,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const doctorId = bookingQuery.data?.doctorId ?? "";
  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0 && !isDemo,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  // Read-only once the booking is terminal (ADR-20260909-01): the backend
  // still allows the read on `completed`/`cancelled`, but never the write, so
  // the composer below is hidden rather than left to fail on submit.
  const bookingStatus = bookingQuery.data?.status;
  const isReadOnly = !isChatWritable(bookingStatus);

  const chat = useConsultationChat({
    bookingId,
    readOnly: isReadOnly,
    enabled: isDemo || !bookingQuery.isLoading,
  });

  // Seed the composer from a step-specific link (e.g. the Care Recovery
  // Roadmap's "Ask about this"), never sending on the patient's behalf. The
  // param is stripped immediately after so a refresh does not re-seed over
  // whatever the patient has since typed.
  const searchParams = useSearchParams();
  const router = useRouter();
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    const draft = searchParams.get("draft");
    if (!draft) return;
    seededRef.current = true;
    chat.setInput(draft.slice(0, MAX_CHAT_MESSAGE_LENGTH));
    router.replace(`/patient/chat/${encodeURIComponent(bookingId)}`, {
      scroll: false,
    });
  }, [searchParams, chat, router, bookingId]);

  const doctorName = doctorQuery.data?.fullName;
  const doctorLabel = doctorId
    ? doctorQuery.isPending
      ? DOCTOR_RESOLVING_LABEL
      : assignedDoctorLabel(doctorName, doctorId)
    : "Your doctor";
  const specialty = doctorQuery.data?.specialty;

  return (
    <section
      data-slot="patient-chat-room"
      /*
       * A bounded column rather than page flow: the message list scrolls inside
       * it while the header and composer stay put, which is what makes a chat
       * usable on a phone. The viewport subtraction clears the shell's own
       * chrome (breadcrumb on desktop, the floating nav bar on mobile).
       */
      className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[24rem] w-full max-w-lg flex-col px-4 pt-2 md:h-[calc(100dvh-8rem)] md:max-w-3xl md:px-8 lg:mx-0 lg:pl-[18rem] lg:pr-8 lg:max-w-[calc(48rem+18rem)]"
    >
      <header className="flex shrink-0 items-center gap-3 pb-3">
        <Link
          href="/patient/chat"
          aria-label="Back to conversations"
          className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) text-(--text-heading) transition-transform duration-300 md:hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>

        {doctorName ? (
          <Avatar size={40}>{initialsOf(doctorName)}</Avatar>
        ) : (
          <IconBadge tone="teal" className="size-10 rounded-(--radius-pill)">
            <Stethoscope />
          </IconBadge>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] leading-tight font-bold text-(--text-heading)">
            {doctorLabel}
          </p>
          {isReadOnly ? (
            <p className="mt-0.5 truncate text-[13.5px] text-(--text-muted)">
              History
            </p>
          ) : (
            <TransportLine transport={chat.transport} specialty={specialty} />
          )}
        </div>

        {/* The design's video control: the booking-keyed room is the same
            conversation in video form, so this is a switch, not a new call.
            Withheld once the conversation is read-only — the room this would
            switch to redirects straight back out for a completed booking, and
            offers nothing at all for a cancelled one. */}
        {isReadOnly ? null : (
          <Link
            href={`/consultation/room/${encodeURIComponent(bookingId)}`}
            aria-label="Switch to video consultation"
            title="Switch to video"
            className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface)"
          >
            <Video className="size-5" strokeWidth={1.75} />
          </Link>
        )}
      </header>

      {isReadOnly ? (
        <p
          data-slot="chat-read-only-banner"
          className="mb-3 shrink-0 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-warm) px-3.5 py-2.5 text-[14px] leading-[1.45] text-(--text-muted)"
        >
          <span className="font-bold text-(--text-heading)">
            {bookingStatus === "cancelled"
              ? "This booking was cancelled."
              : "This consultation has ended."}
          </span>{" "}
          You can read the conversation below, but it&apos;s closed to new
          messages.
        </p>
      ) : (
        <p className="mb-3 shrink-0 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-accent-soft) px-3.5 py-2.5 text-[14px] leading-[1.45] text-(--status-available-fg)">
          <span className="font-bold">Same doctor, same consultation.</span> You
          can switch to video at any time.
        </p>
      )}

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

      {/*
        Read-only mode never surfaces `chat.sendError` — the composer that
        would produce it is not rendered — so this alert is only ever the
        real HTTP hydration failure `hydrateFromHttp` reports, in both modes.
      */}
      {chat.sendError ? (
        <Alert variant="destructive" className="mt-2 shrink-0" data-slot="chat-send-error">
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

/** The header's second line: the real transport state, never fake presence. */
function TransportLine({
  transport,
  specialty,
}: {
  transport: ChatTransport;
  specialty?: string;
}) {
  const label =
    transport === "ws"
      ? "Connected"
      : transport === "http"
        ? "Connected · no live updates"
        : "Connecting…";
  return (
    <p
      data-slot="chat-transport"
      data-transport={transport}
      className="mt-0.5 flex items-center gap-1.5 truncate text-[13.5px] text-(--text-muted)"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          transport === "ws"
            ? "bg-(--action-primary)"
            : transport === "http"
              ? "bg-(--status-soon-fg)"
              : "bg-(--border-default)",
        )}
      />
      <span className="truncate">
        {label}
        {specialty ? ` · ${specialty}` : ""}
      </span>
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
        data-slot="chat-loading"
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center gap-2 text-[14px] text-(--text-muted)"
      >
        <Spinner className="size-4" />
        Loading conversation…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        data-slot="chat-empty"
        className="flex flex-1 items-center justify-center px-6 text-center text-[14.5px] text-(--text-muted)"
      >
        {readOnly
          ? "No messages were sent in this conversation."
          : "No messages yet. Send the first one — your doctor will see it here."}
      </div>
    );
  }

  return (
    <ol
      data-slot="chat-messages"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-1"
    >
      {messages.map((message) => (
        <li
          key={message.messageId}
          data-slot="chat-message"
          data-own={message.isOwn ? "true" : "false"}
          data-pending={message.pending ? "true" : "false"}
          className={cn(
            "max-w-[82%] rounded-(--radius-md) px-3.5 py-2.5 text-[15px] leading-[1.45]",
            message.isOwn
              ? "self-end bg-(--action-primary) text-(--action-primary-text)"
              : "self-start border border-(--border-subtle) bg-(--surface-card) text-(--text-body) shadow-(--shadow-xs)",
            message.pending && "opacity-70",
          )}
        >
          <span className="break-words whitespace-pre-wrap">
            {message.content}
          </span>
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
        {/*
          The design carries an attachment button. `messageType` is `text` only
          in the contract and chat has no upload endpoint (consultation media is
          a separate, consultation-scoped flow), so it is present and visibly
          disabled rather than wired to nothing.
        */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Attachments — coming soon"
          className="flex size-11 shrink-0 cursor-not-allowed items-center justify-center rounded-(--radius-pill) border border-(--border-subtle) bg-(--surface-card) text-(--text-subtle)/60"
        >
          <Paperclip className="size-[18px]" />
        </button>

        <textarea
          data-slot="chat-input"
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
          className="max-h-32 min-h-11 flex-1 resize-none rounded-(--radius-pill) border border-(--border-default) bg-(--surface-card) px-4 py-3 text-[15px] text-(--text-body) placeholder:text-(--text-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        />

        <button
          type="submit"
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <SendHorizonal className="size-[18px]" />
        </button>
      </div>

      {validationError ? (
        <p
          data-slot="chat-length-error"
          role="alert"
          className="mt-1.5 text-[13px] text-(--danger-fg)"
        >
          {validationError}
        </p>
      ) : input.length > MAX_CHAT_MESSAGE_LENGTH * 0.8 ? (
        <p className="mt-1.5 text-right text-[12px] text-(--text-subtle)">
          {input.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </p>
      ) : null}
    </form>
  );
}
