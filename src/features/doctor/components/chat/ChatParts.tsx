"use client";

import { useEffect, useRef } from "react";
import { SendHorizonal } from "lucide-react";

import { Illustration } from "@/components/primitives/Illustration";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { DisplayMessage } from "@/features/consultation/hooks/useConsultationChat";
import { formatDateGroup, formatMessageClock } from "./chatDateUtils";

/**
 * The doctor's message list and composer, shared by the full-page chat room
 * (`DoctorChatRoom`) and the post-consult follow-up popup
 * (`postConsultation/ConversationPopup`).
 */

export function MessageList({
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

export function Composer({
  input,
  setInput,
  send,
  validationError,
  placeholder = "Type a clinical message… (Enter to send, Shift+Enter for new line)",
  inputClassName,
  inputRef,
}: {
  input: string;
  setInput: (value: string) => void;
  send: () => Promise<boolean>;
  validationError: string | null;
  placeholder?: string;
  /** Overrides on the textarea, e.g. 16px text on a phone. */
  inputClassName?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}) {
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await send();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
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
          placeholder={placeholder}
          aria-label="Message"
          aria-invalid={validationError ? true : undefined}
          className={cn(
            "max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-(--border-subtle) bg-(--surface-page) px-3.5 py-2.5 text-xs text-(--text-heading) placeholder:text-(--text-muted) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)",
            inputClassName,
          )}
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
