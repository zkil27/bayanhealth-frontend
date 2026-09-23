"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { validateChatMessage } from "@/lib/chat";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  ApiError,
  type ChatMessage,
  issueWsToken,
  listBookingMessages,
  sendBookingMessage,
} from "../lib/api/chatMessages";
import {
  buildChatSocketUrl,
  buildSendMessageFrame,
  type ChatSocketFactory,
  defaultChatSocketFactory,
  getWebSocketBaseUrl,
  parseInboundEvent,
  type WebSocketLike,
} from "../lib/chatSocket";

/**
 * How often the HTTP transport re-reads the conversation.
 *
 * The HTTP fallback used to hydrate exactly once, which meant a participant on it
 * saw their own messages and never the other side's — the conversation looked
 * one-sided until the page was reloaded. That was already a defect whenever the
 * WebSocket failed, and it became a blocker once chat opened before the
 * consultation starts (ADR-20260809-05): the realtime channel is session-keyed, so
 * the pre-consult phase is HTTP-only by construction.
 *
 * 3s is chosen to feel conversational without being chatty; the read is a single
 * bounded query on one booking.
 */
const HTTP_POLL_INTERVAL_MS = 3000;

/** Default WebSocket connect window (Requirement 11.3 / 11.6): 10 seconds. */
export const CHAT_CONNECT_TIMEOUT_MS = 10_000;

/**
 * Active transport for the conversation.
 * - `connecting` — attempting the realtime WebSocket; not yet open.
 * - `ws`         — realtime WebSocket is open (Requirement 11.3, 11.4).
 * - `http`       — fell back to the HTTP chat endpoints (Requirement 11.6).
 */
export type ChatTransport = "connecting" | "ws" | "http";

/** A message as shown in the conversation; `pending` marks an unconfirmed send. */
export interface DisplayMessage extends ChatMessage {
  /** True for an optimistically-rendered local send not yet confirmed. */
  pending?: boolean;
  /** True when this message was sent by the current user. */
  isOwn?: boolean;
}

export interface UseConsultationChat {
  /** Conversation messages in chronological send order (Requirement 11.4). */
  messages: DisplayMessage[];
  /** Current transport. */
  transport: ChatTransport;
  /** Current input text (retained across rejected sends, Requirement 11.5). */
  input: string;
  /** Update the input text; clears any prior length error. */
  setInput: (value: string) => void;
  /** Validate then send the current input. Returns `true` if sent. */
  send: () => Promise<boolean>;
  /** Length error to display when a send is rejected (Requirement 11.5). */
  validationError: string | null;
  /** Transient send/transport error indication (non-length failures). */
  sendError: string | null;
  /** True while the initial conversation state is being loaded. */
  isLoading: boolean;
  /**
   * True when this conversation is history-only (ADR-20260909-01): the
   * caller passed `readOnly`, so `send()` always resolves `false` without a
   * network call. Exposed so a composer can hide itself instead of offering
   * a control the hook will refuse.
   */
  readOnly: boolean;
}

/** Test seam: override transport primitives without touching globals. */
export interface ChatDeps {
  socketFactory?: ChatSocketFactory;
  connectTimeoutMs?: number;
}

interface UseConsultationChatArgs {
  bookingId: string;
  /** Optional: present once the OTL session is known; unused for transport. */
  sessionId?: string;
  deps?: ChatDeps;
  /**
   * Read-only history mode (ADR-20260909-01).
   *
   * For a `completed`/`cancelled` booking: the backend's write route stays
   * closed for those statuses, and a live session — the only thing the
   * WebSocket has anything to attach to — cannot exist on a terminal
   * booking. Attempting the realtime connect anyway would cost a real
   * `ws-token` call and the full 10s connect window before falling back, for
   * a socket that will never open. Skipped instead: transport goes straight
   * to `http`, history is fetched once, and polling is skipped too since a
   * closed conversation has nothing left to arrive.
   */
  readOnly?: boolean;
  /** Whether the chat transport should connect. Defaults to true. */
  enabled?: boolean;
}

/**
 * Wire consultation chat over a realtime WebSocket with an HTTP fallback
 * (Requirements 11.3–11.6).
 *
 * On an active consultation the hook:
 * 1. Exchanges the Cognito IdToken for a single-use WebSocket token
 *    (`POST /v1/ws-token`) and opens the socket as
 *    `?wsToken=<token>&bookingId=<bookingId>`, allowing up to a 10s connect
 *    window (Requirement 11.3).
 * 2. Sends only messages that pass {@link validateChatMessage} (1–4096 chars);
 *    an empty or oversized message is rejected with the entered text retained
 *    and a length error surfaced (Requirements 11.4, 11.5).
 * 3. Displays delivered and received messages in chronological send order
 *    (Requirement 11.4).
 * 4. If the socket cannot be established within the connect window (or fails),
 *    falls back to `GET/POST /v1/bookings/{bookingId}/messages` and shows the
 *    current conversation state (Requirement 11.6).
 */
export function useConsultationChat({
  bookingId,
  deps,
  readOnly = false,
  enabled = true,
}: UseConsultationChatArgs): UseConsultationChat {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const myUserId = useAuthStore((s) => s.session?.userId ?? null);
  // Only ever `"patient"` or `"doctor"` in practice: this hook is reachable
  // exclusively from those two roles' own chat surfaces, and Cognito group
  // assignment is single-role (ADR-20260416-13). Used solely to label this
  // caller's own optimistic sends correctly below — the server's real
  // `senderRole` on every other message always wins once it arrives.
  const myRole = useAuthStore((s) =>
    s.session?.roles.includes("doctor") ? "doctor" : "patient",
  );

  const [transport, setTransport] = useState<ChatTransport>("connecting");
  const [input, setInputState] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ordered, de-duplicated message store (by messageId), projected to state.
  const storeRef = useRef<Map<string, DisplayMessage>>(new Map());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  const socketRef = useRef<WebSocketLike | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const localSeqRef = useRef(0);
  const transportRef = useRef<ChatTransport>("connecting");
  const sendKeyManager = useRef(createIdempotencyKeyManager());

  const setTransportSafe = useCallback((next: ChatTransport) => {
    transportRef.current = next;
    setTransport(next);
  }, []);

  /** Merge messages into the ordered store and republish chronological state. */
  const upsertMessages = useCallback((incoming: DisplayMessage[]) => {
    const store = storeRef.current;
    for (const msg of incoming) {
      store.set(msg.messageId, { ...store.get(msg.messageId), ...msg });
    }
    const ordered = Array.from(store.values()).sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? -1 : 1;
      }
      return a.messageId < b.messageId ? -1 : a.messageId > b.messageId ? 1 : 0;
    });
    setMessages(ordered);
  }, []);

  const closeSocket = useCallback(() => {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    const sock = socketRef.current;
    socketRef.current = null;
    if (sock) {
      sock.onopen = null;
      sock.onmessage = null;
      sock.onerror = null;
      sock.onclose = null;
      try {
        sock.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  /** Read the current conversation state over HTTP (Requirement 11.6). */
  const hydrateFromHttp = useCallback(async () => {
    if (!idToken) return;
    try {
      const list = await listBookingMessages(bookingId, idToken);
      upsertMessages(
        (list?.messages ?? []).map((m) => ({ ...m, isOwn: m.senderId === myUserId })),
      );
    } catch (err) {
      // A hydrate failure must not crash the view; surface a soft indication.
      setSendError(
        err instanceof ApiError ? err.message : "Could not load the conversation.",
      );
    }
  }, [bookingId, idToken, myUserId, upsertMessages]);

  const fallbackToHttp = useCallback(async () => {
    if (transportRef.current === "http") return;
    setTransportSafe("http");
    closeSocket();
    setIsLoading(true);
    try {
      await hydrateFromHttp();
    } finally {
      setIsLoading(false);
    }
  }, [closeSocket, hydrateFromHttp, setTransportSafe]);

  const sendOverHttp = useCallback(
    async (text: string): Promise<boolean> => {
      if (!idToken) {
        setSendError("You must be signed in to send messages.");
        return false;
      }
      try {
        const created = await sendBookingMessage(
          bookingId,
          idToken,
          text,
          sendKeyManager.current.current(),
        );
        sendKeyManager.current.reset();
        upsertMessages([{ ...created, isOwn: created.senderId === myUserId }]);
        setInputState("");
        return true;
      } catch (err) {
        // Keep the key so a retry is treated as the same send; retain input.
        setSendError(
          err instanceof ApiError ? err.message : "Could not send your message.",
        );
        return false;
      }
    },
    [bookingId, idToken, myUserId, upsertMessages],
  );

  // Establish read-only history mode (ADR-20260909-01).
  //
  // For a `completed`/`cancelled` booking: the backend's write route stays
  // closed for those statuses, and a live session — the only thing the
  // WebSocket has anything to attach to — cannot exist on a terminal
  // booking. Skipped instead: transport goes straight to `http`, history is
  // fetched once, and polling is skipped too since a closed conversation
  // has nothing left to arrive.
  useEffect(() => {
    if (!enabled || !readOnly || bookingId === "demo" || bookingId === "preview") return;

    closeSocket();
    setTransportSafe("http");

    if (!idToken) return;

    let cancelled = false;
    setIsLoading(true);
    void hydrateFromHttp().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, readOnly, bookingId, idToken, closeSocket, setTransportSafe, hydrateFromHttp]);

  // Establish the realtime transport for live consultations.
  useEffect(() => {
    if (!enabled) return;

    if (bookingId === "demo" || bookingId === "preview") {
      if (startedRef.current) return;
      startedRef.current = true;
      setTransportSafe("ws");
      upsertMessages([
        {
          messageId: "demo-msg-1",
          sessionId: "demo",
          consultationId: "demo",
          bookingId,
          senderId: "patient-demo",
          senderRole: "patient",
          messageType: "text",
          content: "Good day, Doc! I have been having a slight headache since yesterday afternoon.",
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          isOwn: myRole === "patient",
        },
        {
          messageId: "demo-msg-2",
          sessionId: "demo",
          consultationId: "demo",
          bookingId,
          senderId: "doctor-demo",
          senderRole: "doctor",
          messageType: "text",
          content: "Hello Maria. Thank you for reaching out. Are you experiencing any nausea, fever, or visual sensitivity?",
          createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          isOwn: myRole === "doctor",
        },
        {
          messageId: "demo-msg-3",
          sessionId: "demo",
          consultationId: "demo",
          bookingId,
          senderId: "patient-demo",
          senderRole: "patient",
          messageType: "text",
          content: "No fever Doc, just feeling a bit fatigued and throbbing behind the eyes.",
          createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          isOwn: myRole === "patient",
        },
      ]);
      setIsLoading(false);
      return;
    }

    if (readOnly) {
      // Handled by the readOnly effect above.
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const connectTimeoutMs = deps?.connectTimeoutMs ?? CHAT_CONNECT_TIMEOUT_MS;
    const socketFactory = deps?.socketFactory ?? defaultChatSocketFactory;
    let cancelled = false;

    async function connect() {
      const baseUrl = getWebSocketBaseUrl();
      if (!baseUrl || !idToken) {
        // No realtime endpoint (or no auth) — go straight to HTTP fallback.
        await fallbackToHttp();
        return;
      }

      let wsToken: string;
      try {
        wsToken = await issueWsToken(idToken);
      } catch {
        await fallbackToHttp();
        return;
      }
      if (cancelled) return;

      let socket: WebSocketLike;
      try {
        socket = socketFactory(buildChatSocketUrl(baseUrl, { wsToken, bookingId }));
      } catch {
        await fallbackToHttp();
        return;
      }
      socketRef.current = socket;

      // 10s connect window: a socket that does not open in time falls back.
      connectTimerRef.current = setTimeout(() => {
        if (transportRef.current !== "ws" && transportRef.current !== "http") {
          void fallbackToHttp();
        }
      }, connectTimeoutMs);

      socket.onopen = () => {
        if (connectTimerRef.current) {
          clearTimeout(connectTimerRef.current);
          connectTimerRef.current = null;
        }
        if (transportRef.current === "http") {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
          return;
        }
        setTransportSafe("ws");
        // Hydrate existing history once; live messages arrive via the socket.
        void hydrateFromHttp().finally(() => setIsLoading(false));
      };

      socket.onmessage = (ev: { data: unknown }) => {
        const event = parseInboundEvent(ev.data);
        if (!event || event.type !== "message" || !event.data) return;
        const msg = event.data as ChatMessage;
        if (!msg.messageId) return;
        upsertMessages([{ ...msg, isOwn: msg.senderId === myUserId }]);
      };

      socket.onerror = () => {
        if (transportRef.current !== "ws" && transportRef.current !== "http") void fallbackToHttp();
      };
      socket.onclose = () => {
        if (transportRef.current !== "ws" && transportRef.current !== "http") void fallbackToHttp();
      };
    }

    void connect();

    return () => {
      cancelled = true;
      closeSocket();
    };
  }, [
    enabled,
    readOnly,
    bookingId,
    idToken,
    myRole,
    myUserId,
    deps?.connectTimeoutMs,
    deps?.socketFactory,
    closeSocket,
    fallbackToHttp,
    hydrateFromHttp,
    setTransportSafe,
    upsertMessages,
  ]);

  // Keep the HTTP transport current.
  //
  // Only while `transport === "http"`: on the WebSocket the server pushes, so
  // polling as well would double every message's arrival path for no benefit. This
  // is what makes the pre-consult phase usable at all — that phase has no realtime
  // channel, because the channel is keyed on a consultation session that does not
  // exist yet.
  //
  // Also skipped in read-only mode: a completed/cancelled booking's history is
  // fetched once on mount and cannot change again — the write route stays closed
  // for those statuses — so a recurring poll would only repeat the same read.
  useEffect(() => {
    if (transport !== "http" || readOnly || bookingId === "demo" || bookingId === "preview") return;
    const timer = setInterval(() => {
      void hydrateFromHttp();
    }, HTTP_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [transport, readOnly, bookingId, hydrateFromHttp]);

  const setInput = useCallback((value: string) => {
    setInputState(value);
    setValidationError(null);
  }, []);

  const send = useCallback(async (): Promise<boolean> => {
    if (readOnly) {
      // Defensive: the composer that would call this is not rendered in
      // read-only mode, but the backend's own write gate is the real
      // boundary — this just avoids a guaranteed-409 round trip.
      setSendError("This conversation is closed. You can read it, but not reply.");
      return false;
    }
    const text = input;
    const result = validateChatMessage(text);
    if (!result.valid) {
      // Reject: retain the entered text and show the length error (Req 11.5).
      setValidationError(result.error ?? "Invalid message length.");
      return false;
    }
    setValidationError(null);
    setSendError(null);

    if (bookingId === "demo" || bookingId === "preview") {
      const seq = ++localSeqRef.current;
      const demoMsg: DisplayMessage = {
        messageId: `demo-local-${seq}`,
        sessionId: "demo",
        consultationId: "demo",
        bookingId,
        senderId: myUserId ?? "demo-user",
        senderRole: myRole,
        messageType: "text",
        content: text,
        createdAt: new Date().toISOString(),
        isOwn: true,
      };
      upsertMessages([demoMsg]);
      setInputState("");
      return true;
    }

    if (transportRef.current === "ws" && socketRef.current) {
      // Optimistically render the sent message in chronological order; the
      // backend broadcast excludes the sender, so this is the sender's copy.
      const seq = ++localSeqRef.current;
      const optimistic: DisplayMessage = {
        messageId: `local-${seq}`,
        sessionId: "",
        consultationId: "",
        bookingId,
        senderId: myUserId ?? "",
        senderRole: myRole,
        messageType: "text",
        content: text,
        createdAt: new Date().toISOString(),
        pending: true,
        isOwn: true,
      };
      try {
        socketRef.current.send(buildSendMessageFrame(text));
      } catch {
        // Socket went away mid-send — fall back and retry over HTTP.
        await fallbackToHttp();
        return sendOverHttp(text);
      }
      upsertMessages([optimistic]);
      setInputState("");
      return true;
    }

    return sendOverHttp(text);
  }, [readOnly, input, bookingId, myUserId, myRole, fallbackToHttp, sendOverHttp, upsertMessages]);

  return {
    messages,
    transport,
    input,
    setInput,
    send,
    validationError,
    sendError,
    isLoading,
    readOnly,
  };
}
