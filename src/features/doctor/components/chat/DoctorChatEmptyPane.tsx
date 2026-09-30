"use client";

import Link from "next/link";
import { MessageSquareText, ShieldAlert, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchConversationPage,
  type ConversationEntry,
} from "@/features/consultation/lib/api/conversations";
import { useIdToken } from "@/stores/useAuthStore";

export function DoctorChatEmptyPane() {
  const idToken = useIdToken();

  const { data } = useQuery({
    queryKey: ["doctor-conversations", idToken],
    queryFn: () => fetchConversationPage(idToken ?? "", undefined, 50),
    enabled: !!idToken,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  const conversations: ConversationEntry[] = data?.conversations ?? [];
  const latestBookingId = conversations[0]?.booking.bookingId;
  const liveCount = conversations.filter((c) => c.booking.status === "in_progress").length;

  return (
    <div
      data-slot="doctor-chat-empty-pane"
      className="flex h-full w-full flex-1 flex-col items-center justify-center p-6 text-center"
    >
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-(--border-subtle) bg-(--surface-warm) text-(--action-primary) shadow-2xs">
          <MessageSquareText className="size-8" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-lg font-bold text-(--text-heading)">
            Select a conversation
          </h2>
          <p className="text-xs leading-relaxed text-(--text-muted)">
            Choose a patient thread from the left sidebar to view messages, answer clinical triage, or
            coordinate consultations.
          </p>
        </div>

        {liveCount > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-(--border-subtle) bg-(--status-available-bg) px-3 py-1.5 text-xs font-semibold text-(--status-available-fg)">
            <span className="size-2 rounded-full bg-(--status-available-fg)" />
            <span>
              {liveCount} active {liveCount === 1 ? "consultation" : "consultations"} awaiting response
            </span>
          </div>
        ) : null}

        {latestBookingId ? (
          <Link
            href={`/doctor/chat/${encodeURIComponent(latestBookingId)}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-2 rounded-xl border-(--border-subtle) bg-(--surface-card) text-xs font-medium text-(--text-heading) hover:bg-(--surface-warm-soft)",
            )}
          >
            Open recent conversation
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        ) : null}

        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-(--text-subtle)">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>PHI protected · Messages are securely logged in consultation record</span>
        </div>
      </div>
    </div>
  );
}
