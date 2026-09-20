"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  MessageSquareText,
  Stethoscope,
  Video,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { initialsOf } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import { patientPageClass } from "@/features/patient/components/PatientPage";
import {
  Avatar,
  BrandLinkButton,
  Card,
  Chip,
  IconBadge,
} from "@/features/patient/components/redesign/primitives";
import {
  fetchConversationPage,
  type ConversationEntry,
} from "@/features/consultation/lib/api/conversations";
import { isHistoryOnlyConversation } from "@/features/consultation/lib/conversationStatus";
import { assignedDoctorLabel } from "@/features/booking/lib/doctorLabels";

/**
 * `/patient/chat` — the conversation list behind the Chat nav tab.
 *
 * Chat was fully built and fully backed (`useConsultationChat` over
 * `/v1/bookings/{bookingId}/messages` with a `/v1/ws-token` socket) but reachable
 * only from inside `/consultation/room/{bookingId}`, and the nav tab was
 * `href: null` — rendered permanently disabled as "coming soon". The feature
 * existed and the patient had no door to it.
 *
 * **Backed by `GET /v1/conversations`** (Task 9), which replaced deriving this
 * list from `GET /v1/bookings`. That derivation filtered bookings to
 * `confirmed`/`in_progress`/`completed`/`cancelled` with an assigned doctor —
 * the identical rule `isConversationEligible` now applies server-side — but
 * resolved the doctor's name with a second request per row and approximated
 * recency from the booking's own timestamps rather than the conversation's
 * actual last message. The endpoint answers both directly: `entry.doctor` is
 * already resolved, and the page is already ordered by last-message time.
 */

export function PatientChatList() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["patient-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken,
    // Short: a doctor accepting a booking is what opens a conversation, and the
    // patient may be waiting on exactly that.
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const conversations = data?.conversations ?? [];

  return (
    <div
      data-slot="patient-chat-list"
      className="flex h-full min-h-0 w-full flex-col justify-start pb-4"
    >
      <PatientPageHeader title="Chat" />

      <div className={patientPageClass("narrow", "gap-4 pt-4")}>
        {isLoading ? (
          <ChatListLoading />
        ) : error ? (
          <ChatListError
            error={error}
            onRetry={() => void refetch()}
            isFetching={isFetching}
          />
        ) : conversations.length === 0 ? (
          <ChatListEmpty />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {conversations.map((entry) => (
              <ConversationRow key={entry.booking.bookingId} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ entry }: { entry: ConversationEntry }) {
  const { booking, doctor } = entry;
  const doctorLabel = assignedDoctorLabel(doctor?.fullName, booking.doctorId);
  const isLive = booking.status === "in_progress";
  const isHistory = isHistoryOnlyConversation(booking.status);

  return (
    <li data-slot="patient-chat-conversation">
      <Link
        href={`/patient/chat/${encodeURIComponent(booking.bookingId)}`}
        className="block rounded-(--radius-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <Card className="flex items-center gap-3 p-4 hover:border-(--border-strong)">
          {doctor?.fullName ? (
            <Avatar>{initialsOf(doctor.fullName)}</Avatar>
          ) : (
            <IconBadge tone="teal" className="rounded-(--radius-pill)">
              <Stethoscope />
            </IconBadge>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-(--text-heading)">
              {doctorLabel}
            </p>
            {/*
              The real last message when one exists, falling back to the
              appointment time for a conversation nobody has sent anything in
              yet — the same "nothing invented" boundary the rest of this row
              already holds to.
            */}
            {entry.lastMessage ? (
              <p className="mt-0.5 truncate text-[14px] text-(--text-muted)">
                {entry.lastMessage.preview}
              </p>
            ) : (
              <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-(--text-muted)">
                <CalendarClock className="size-3.5 shrink-0" />
                <span className="truncate">
                  {formatConsultationDateTime(booking.scheduledAt)}
                </span>
              </p>
            )}
          </div>
          {/*
            "Live" and "History" both state a fact from the booking status, not
            an unread count — the endpoint returns no per-conversation unread
            state and the list must not imply one.
          */}
          {isLive ? (
            <Chip tone="safe" icon={<Video />} className="shrink-0">
              Live
            </Chip>
          ) : isHistory ? (
            <Chip tone="neutral" className="shrink-0">
              History
            </Chip>
          ) : null}
          <ChevronRight className="size-[18px] shrink-0 text-(--text-subtle)" />
        </Card>
      </Link>
    </li>
  );
}

function ChatListLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2 text-[14px] text-(--text-muted)">
        <Spinner className="size-4" />
        Loading your conversations…
      </span>
      {[0, 1].map((row) => (
        <div
          key={row}
          className="h-[76px] animate-pulse rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-warm)"
        />
      ))}
    </div>
  );
}

function ChatListEmpty() {
  return (
    <Empty data-slot="patient-chat-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquareText />
        </EmptyMedia>
        <EmptyTitle>No open conversations</EmptyTitle>
        <EmptyDescription>
          Chat opens once a doctor accepts your booking, and stays open through
          the consultation. Book a consultation to start one.
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex justify-center">
        <BrandLinkButton href="/patient/booking" size="sm">
          Book a consultation
        </BrandLinkButton>
      </div>
    </Empty>
  );
}

function ChatListError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Alert variant="destructive" className="max-w-md">
        <MessageSquareText className="size-4" />
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
