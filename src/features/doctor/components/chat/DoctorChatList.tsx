"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CalendarClock,
  MessageSquareText,
  Video,
} from "lucide-react";

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
import {
  fetchConversationPage,
  type ConversationEntry,
} from "@/features/consultation/lib/api/conversations";
import { isHistoryOnlyConversation } from "@/features/consultation/lib/conversationStatus";
import { useIdToken } from "@/stores/useAuthStore";

/**
 * `/doctor/chat` — the doctor's conversation list (Task 9).
 *
 * Backed by the same `GET /v1/conversations` endpoint as the patient's
 * `PatientChatList` — the backend resolves the caller's role from the JWT
 * and returns `patientName` in place of `doctor` for a doctor caller. Every
 * existing doctor surface into chat was scoped to one booking at a time
 * (`DoctorConsultationAccess` inside a `ReadyToStartCard` drawer, or the
 * consultation room itself); this is the doctor's first cross-booking view
 * of their own conversations.
 *
 * Patient names follow the same "absent, never a placeholder" rule every
 * other doctor surface already applies (`IntakeQueueEntry.patientName`,
 * `ScheduledRequestEntry.patientName`): shown when the patient has saved
 * one, and the last six characters of the booking id otherwise — there is no
 * backend route for a doctor to look up an arbitrary patient's name outside
 * this list, so that reference is genuinely what the platform can offer.
 */

/** Last six characters of a booking id, uppercased — the platform's standing "no name" reference. */
function shortRef(bookingId: string): string {
  return bookingId.slice(-6).toUpperCase();
}

export function DoctorChatList() {
  const idToken = useIdToken();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["doctor-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken,
    // Short: a patient's first message, or a consultation starting, is what
    // this list exists to surface promptly.
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const conversations = data?.conversations ?? [];

  return (
    <section
      data-slot="doctor-chat-list"
      className="flex h-full w-full flex-col items-center p-2 md:p-4"
    >
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-(--text-heading)">
            Chat
          </h1>
          <p className="text-sm text-(--text-muted)">
            Message a patient on an active consultation, or read past
            conversations.
          </p>
        </div>

        {isLoading ? (
          <DoctorChatListSkeleton />
        ) : error ? (
          <DoctorChatListError
            error={error}
            onRetry={() => void refetch()}
            isFetching={isFetching}
          />
        ) : conversations.length === 0 ? (
          <DoctorChatListEmpty />
        ) : (
          <ul className="flex flex-col gap-3">
            {conversations.map((entry) => (
              <ConversationRow key={entry.booking.bookingId} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ConversationRow({ entry }: { entry: ConversationEntry }) {
  const { booking, patientName } = entry;
  const ref = shortRef(booking.bookingId);
  const label = patientName ?? `Ref ${ref}`;
  const isLive = booking.status === "in_progress";
  const isHistory = isHistoryOnlyConversation(booking.status);

  return (
    <li data-slot="doctor-chat-conversation">
      <Link
        href={`/doctor/chat/${encodeURIComponent(booking.bookingId)}`}
        className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-(--surface-warm-soft)">
          <Avatar className="size-9">
            <AvatarFallback>{ref.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{label}</p>
            {entry.lastMessage ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {entry.lastMessage.preview}
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3 shrink-0" />
                {formatScheduledAt(booking.scheduledAt)}
              </p>
            )}
          </div>
          {/*
            States a fact from the booking status, not an unread count — the
            same boundary the patient list already holds to, since the
            endpoint returns no per-conversation unread state.
          */}
          {isLive ? (
            <Badge className="h-6 shrink-0 bg-(--status-available-bg) text-(--status-available-fg)">
              <Video className="mr-1 size-3" />
              Live
            </Badge>
          ) : isHistory ? (
            <Badge variant="outline" className="h-6 shrink-0">
              History
            </Badge>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function DoctorChatListSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl border p-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DoctorChatListEmpty() {
  return (
    <Empty data-slot="doctor-chat-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquareText />
        </EmptyMedia>
        <EmptyTitle>No conversations yet</EmptyTitle>
        <EmptyDescription>
          Once a patient booking is confirmed and assigned to you, your
          conversation with them appears here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function DoctorChatListError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div data-slot="doctor-chat-list-error" className="flex flex-col items-center gap-3 py-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon className="size-4" />
        <AlertTitle>Couldn&apos;t load your conversations</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
        {isFetching ? (
          <>
            <Spinner className="mr-2 size-3" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </div>
  );
}

/** Present an ISO timestamp as a readable date-time, falling back gracefully. */
function formatScheduledAt(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return scheduledAt;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
