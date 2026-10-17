"use client";

import { useCallback, useState } from "react";

/**
 * Tab state for a consultation companion suite that tracks chat messages
 * arriving while another tab is open. Opening the chat tab clears the count.
 */
export function useChatTabUnread(defaultTab: string, chatTab = "chat") {
  const [tab, setTabState] = useState(defaultTab);
  const [unread, setUnread] = useState(0);

  const setTab = useCallback(
    (next: string) => {
      setTabState(next);
      if (next === chatTab) setUnread(0);
    },
    [chatTab],
  );

  const onIncomingMessage = useCallback(
    (count: number) => {
      if (tab !== chatTab) setUnread((n) => n + count);
    },
    [tab, chatTab],
  );

  return { tab, setTab, chatActive: tab === chatTab, unread, onIncomingMessage };
}

/**
 * The count on the chat tab; renders nothing at zero. Uses the app's danger
 * tokens and a text count, so it never relies on color or motion alone.
 */
export function ChatUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      data-slot="chat-unread-badge"
      aria-label={`${count} new ${count === 1 ? "message" : "messages"}`}
      className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-(--danger-fg) px-1 text-[11px] leading-none font-bold text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
