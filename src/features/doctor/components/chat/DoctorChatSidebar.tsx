"use client";

import { Illustration } from "@/components/primitives/Illustration";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, CalendarClock, Search, Video, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  fetchConversationPage,
  type ConversationEntry,
} from "@/features/consultation/lib/api/conversations";
import { isHistoryOnlyConversation } from "@/features/consultation/lib/conversationStatus";
import { useIdToken } from "@/stores/useAuthStore";
import { formatChatTimestamp } from "./chatDateUtils";

function shortRef(bookingId: string): string {
  return bookingId.slice(-6).toUpperCase();
}

interface DoctorChatSidebarProps {
  activeBookingId?: string;
  className?: string;
}

export function DoctorChatSidebar({
  activeBookingId,
  className,
}: DoctorChatSidebarProps) {
  const idToken = useIdToken();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "live" | "history">("all");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["doctor-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const allConversations: ConversationEntry[] = useMemo(
    () => data?.conversations ?? [],
    [data?.conversations],
  );

  const liveCount = useMemo(
    () => allConversations.filter((c) => c.booking.status === "in_progress").length,
    [allConversations],
  );

  const historyCount = useMemo(
    () => allConversations.filter((c) => isHistoryOnlyConversation(c.booking.status)).length,
    [allConversations],
  );

  const filteredConversations = useMemo(() => {
    let list = allConversations;

    if (filterMode === "live") {
      list = list.filter((c) => c.booking.status === "in_progress");
    } else if (filterMode === "history") {
      list = list.filter((c) => isHistoryOnlyConversation(c.booking.status));
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((entry) => {
      const name = entry.patientName?.toLowerCase() ?? "";
      const ref = shortRef(entry.booking.bookingId).toLowerCase();
      const lastMsg = entry.lastMessage?.preview.toLowerCase() ?? "";
      return name.includes(query) || ref.includes(query) || lastMsg.includes(query);
    });
  }, [allConversations, filterMode, searchQuery]);

  return (
    <div
      data-slot="doctor-chat-sidebar"
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
    >
      {/* Top Header */}
      <div className="shrink-0 border-b border-(--border-subtle) p-3.5 md:p-4">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-tight text-(--text-heading)">
              Messages
            </h1>
            {allConversations.length > 0 ? (
              <span className="rounded-full bg-(--surface-warm) px-2 py-0.5 text-[11px] font-semibold text-(--text-muted)">
                {allConversations.length}
              </span>
            ) : null}
          </div>
          {liveCount > 0 ? (
            <Badge className="h-5 rounded-full border-transparent bg-(--status-available-bg) px-2 text-[10.5px] font-bold text-(--status-available-fg)">
              <span className="mr-1 size-1.5 rounded-full bg-(--status-available-fg)" />
              {liveCount} Live
            </Badge>
          ) : null}
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-(--text-subtle)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient or message…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-xl border border-(--border-subtle) bg-(--surface-page) pr-8 pl-9 text-xs text-(--text-heading) placeholder:text-(--text-muted) transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 flex size-4 items-center justify-center rounded-full text-(--text-muted) hover:text-(--text-heading)"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Filter Tabs */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterMode === "all"
                ? "bg-(--action-primary) font-semibold text-white"
                : "bg-(--surface-warm) text-(--text-muted) hover:text-(--text-heading)",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("live")}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterMode === "live"
                ? "bg-(--action-primary) font-semibold text-white"
                : "bg-(--surface-warm) text-(--text-muted) hover:text-(--text-heading)",
            )}
          >
            Live {liveCount > 0 && `(${liveCount})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("history")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filterMode === "history"
                ? "bg-(--action-primary) font-semibold text-white"
                : "bg-(--surface-warm) text-(--text-muted) hover:text-(--text-heading)",
            )}
          >
            History {historyCount > 0 && `(${historyCount})`}
          </button>
        </div>
      </div>

      {/* Conversation Thread List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {isLoading ? (
          <DoctorChatSidebarSkeleton />
        ) : error ? (
          <DoctorChatSidebarError
            error={error}
            onRetry={() => void refetch()}
            isFetching={isFetching}
          />
        ) : allConversations.length === 0 ? (
          <DoctorChatSidebarEmpty />
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-medium text-(--text-muted)">
              No conversations match your filter
            </p>
            {searchQuery ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2 h-7 text-xs text-(--action-primary)"
              >
                Clear search query
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {filteredConversations.map((entry) => (
              <SidebarConversationItem
                key={entry.booking.bookingId}
                entry={entry}
                isActive={entry.booking.bookingId === activeBookingId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SidebarConversationItem({
  entry,
  isActive,
}: {
  entry: ConversationEntry;
  isActive: boolean;
}) {
  const { booking, patientName } = entry;
  const ref = shortRef(booking.bookingId);
  const label = patientName ?? `Ref ${ref}`;
  const isLive = booking.status === "in_progress";
  const isHistory = isHistoryOnlyConversation(booking.status);

  const timestamp = formatChatTimestamp(
    entry.lastMessage?.createdAt ?? booking.scheduledAt,
  );

  return (
    <li data-slot="doctor-chat-sidebar-item">
      <Link
        href={`/doctor/chat/${encodeURIComponent(booking.bookingId)}`}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-(--focus-ring)",
          isActive
            ? "bg-(--surface-warm-soft) ring-1 ring-(--border-default) shadow-2xs"
            : "hover:bg-(--surface-warm-soft)/70",
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="size-10 border border-(--border-subtle)">
            <AvatarFallback
              className={cn(
                "text-xs font-bold",
                isActive
                  ? "bg-(--action-primary) text-white"
                  : "bg-(--surface-warm) text-(--text-heading)",
              )}
            >
              {patientName
                ? patientName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : ref.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {isLive ? (
            <span
              className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-(--status-available-fg) ring-2 ring-(--surface-card)"
              title="Live Consultation"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p
              className={cn(
                "truncate text-[13.5px] leading-tight font-semibold",
                isActive ? "text-(--action-primary)" : "text-(--text-heading)",
              )}
            >
              {label}
            </p>
            {timestamp ? (
              <span className="shrink-0 text-[11px] text-(--text-subtle)">
                {timestamp}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              {entry.lastMessage ? (
                <p className="truncate text-xs text-(--text-muted)">
                  {entry.lastMessage.preview}
                </p>
              ) : (
                <p className="flex items-center gap-1 truncate text-xs text-(--text-subtle)">
                  <CalendarClock className="size-3 shrink-0" />
                  <span>Scheduled appointment</span>
                </p>
              )}
            </div>

            {isLive ? (
              <Badge className="h-4.5 shrink-0 rounded-full border-transparent bg-(--status-available-bg) px-1.5 text-[10px] font-bold text-(--status-available-fg)">
                <Video className="mr-0.5 size-2.5" />
                Live
              </Badge>
            ) : isHistory ? (
              <Badge
                variant="outline"
                className="h-4.5 shrink-0 rounded-full border-(--border-subtle) px-1.5 text-[10px] text-(--text-subtle)"
              >
                History
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}

function DoctorChatSidebarSkeleton() {
  return (
    <ul className="flex flex-col gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl p-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DoctorChatSidebarEmpty() {
  return (
    <Empty data-slot="doctor-chat-empty" className="p-4">
      <EmptyHeader>
        <EmptyMedia variant="illustration">
          <Illustration name="shared/no-conversations" size="sm" />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-bold">No conversations yet</EmptyTitle>
        <EmptyDescription className="text-xs">
          Assigned patient bookings and consultations will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function DoctorChatSidebarError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const message = error instanceof Error ? error.message : "Failed to load";
  return (
    <div className="flex flex-col items-center gap-2 p-4 text-center">
      <Alert variant="destructive" className="py-2 text-xs">
        <AlertCircleIcon className="size-3.5" />
        <AlertTitle className="text-xs">Failed to load</AlertTitle>
        <AlertDescription className="text-[11px]">{message}</AlertDescription>
      </Alert>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isFetching}
        className="h-7 text-xs"
      >
        {isFetching ? (
          <>
            <Spinner className="mr-1.5 size-3" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </div>
  );
}
