"use client";

import { Illustration } from "@/components/primitives/Illustration";
import { useEffect, useRef } from "react";
import { AlertCircleIcon, SendHorizonal, Wifi, WifiOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat";

import {
  type DisplayMessage,
  useConsultationChat,
  type ChatDeps,
} from "../../hooks/useConsultationChat";

/**
 * Realtime consultation chat panel (Slice 6, task 12.4, Requirements 11.3–11.6).
 *
 * Renders the active conversation, an input gated by the 1–4096 character rule
 * (Requirements 11.4, 11.5), and a transport indicator showing whether the
 * realtime socket is in use or the HTTP fallback is active (Requirement 11.6).
 *
 * All transport behaviour lives in {@link useConsultationChat}; this component
 * is presentational. `deps` is a test seam forwarded to the hook.
 */
export function ConsultationChatPanel({
  bookingId,
  sessionId,
  deps,
  embedded = false,
  onFocusChange,
  placeholder = "Type a message to your doctor…",
}: {
  bookingId: string;
  sessionId?: string;
  deps?: ChatDeps;
  /**
   * Drop the panel's own bordered card frame when a parent (the consultation
   * room's dual-pane companion suites) already provides one — otherwise the
   * chat rendered as a card inside a card.
   */
  embedded?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** Composer placeholder. Defaults to the patient's wording; the doctor's suite passes its own. */
  placeholder?: string;
}) {
  const {
    messages,
    transport,
    input,
    setInput,
    send,
    validationError,
    sendError,
    isLoading,
  } = useConsultationChat({ bookingId, sessionId, deps });

  useEffect(() => {
    if (sendError) {
      toast.error(sendError);
    }
  }, [sendError]);

  return (
    <section
      data-slot="consultation-chat"
      data-transport={transport}
      className={
        embedded
          ? // No floor height when embedded: the room's right pane is ~300px
            // tall on a phone, and a 288px minimum pushed the composer out
            // through the pane's overflow-hidden. The message list shrinks
            // instead, so the composer is always reachable.
            "flex h-full min-h-0 flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4"
          : "flex h-full min-h-72 flex-col gap-3 rounded-2xl border border-slate-200/70 bg-(--surface-card) p-4"
      }
      aria-label="Consultation chat"
    >
      <header className="flex shrink-0 items-center justify-between gap-2">
        {embedded ? <span /> : <span className="text-sm font-semibold text-slate-900">Conversation</span>}
        <TransportBadge transport={transport} />
      </header>

      <MessageList messages={messages} isLoading={isLoading} />

      {sendError ? (
        <span data-slot="chat-send-error" className="sr-only">
          {sendError}
        </span>
      ) : null}

      <ChatComposer
        input={input}
        setInput={setInput}
        send={send}
        validationError={validationError}
        onFocusChange={onFocusChange}
        placeholder={placeholder}
      />
    </section>
  );
}

function TransportBadge({
  transport,
}: {
  transport: "connecting" | "ws" | "http";
}) {
  if (transport === "ws") {
    return (
      <span
        data-slot="chat-transport"
        data-tone="success"
        className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-teal-200/60 bg-teal-50 px-2 text-xs font-medium text-teal-800"
      >
        <Wifi className="h-3.5 w-3.5" />
        Realtime
      </span>
    );
  }
  if (transport === "http") {
    return (
      <span
        data-slot="chat-transport"
        data-tone="warning"
        className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 text-xs font-medium text-amber-900"
      >
        <WifiOff className="h-3.5 w-3.5" />
        Offline mode
      </span>
    );
  }
  return (
    <span
      data-slot="chat-transport"
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-500"
    >
      <Spinner className="size-3.5" />
      Connecting…
    </span>
  );
}

function MessageList({
  messages,
  isLoading,
}: {
  messages: DisplayMessage[];
  isLoading: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div
        data-slot="chat-loading"
        className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-slate-500"
        role="status"
        aria-live="polite"
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
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-500"
      >
        <Illustration name="shared/no-conversations" size="sm" />
        <p>No messages yet. Say hello to start the consultation.</p>
      </div>
    );
  }

  return (
    <ol
      data-slot="chat-messages"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
    >
      {messages.map((m) => (
        <li
          key={m.messageId}
          data-slot="chat-message"
          data-own={m.isOwn ? "true" : "false"}
          data-pending={m.pending ? "true" : "false"}
          className={
            m.isOwn
              ? "max-w-[80%] self-end rounded-2xl rounded-br-md bg-(--surface-nav) px-3 py-2 text-sm text-white"
              : "max-w-[80%] self-start rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-sm text-slate-900"
          }
        >
          <span className="whitespace-pre-wrap break-words">{m.content}</span>
        </li>
      ))}
      <div ref={endRef} />
    </ol>
  );
}

function ChatComposer({
  input,
  setInput,
  send,
  validationError,
  onFocusChange,
  placeholder,
}: {
  input: string;
  setInput: (v: string) => void;
  send: () => Promise<boolean>;
  validationError: string | null;
  onFocusChange?: (focused: boolean) => void;
  placeholder: string;
}) {
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send();
    onFocusChange?.(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex shrink-0 flex-col gap-2">
      <div className="flex items-end gap-2.5">
        <Textarea
          data-slot="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send().then(() => onFocusChange?.(false));
            }
          }}
          placeholder={placeholder}
          aria-label="Message to doctor"
          aria-invalid={validationError ? true : undefined}
          rows={2}
          className="min-h-12 flex-1 resize-none rounded-2xl border-slate-200 bg-(--surface-card) text-base text-(--text-heading) placeholder:text-(--text-muted) focus-visible:border-(--surface-nav-accent) focus-visible:ring-(--surface-nav-accent)/30"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          className="size-12 shrink-0 rounded-2xl bg-(--action-primary) text-(--action-primary-text) hover:bg-(--action-primary-hover) shadow-sm"
        >
          <SendHorizonal className="h-5 w-5" />
        </Button>
      </div>
      {validationError ? (
        <p
          data-slot="chat-length-error"
          role="alert"
          className="text-xs text-destructive"
        >
          {validationError}
        </p>
      ) : input.length > MAX_CHAT_MESSAGE_LENGTH * 0.8 ? (
        // Only near the limit, as in `PatientChatRoom`: a permanent "0/4096"
        // row cost the composer a line it could not spare on a phone.
        <p className="text-right text-xs text-slate-400">
          {input.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </p>
      ) : null}
    </form>
  );
}
