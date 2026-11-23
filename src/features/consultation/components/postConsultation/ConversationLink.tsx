"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { withReturnTo } from "@/lib/safeReturnTo";
import { cn } from "@/lib/utils";

/**
 * The consultation's chat transcript, from the post-consult workspace
 * (clinical remarks Nov 16: the patient had "View conversation", the doctor had
 * no way back to it).
 *
 * Opens in a new tab so the documentation in progress stays where it is; the
 * thread's back arrow still returns here via `returnTo` if the doctor uses it
 * in the same tab. The thread is read-only once the booking is completed — an
 * open post-consult chat window needs backend support (see CHANGELOG_UI_V4).
 */
export function ConversationLink({
  bookingId,
  consultationId,
  compact = false,
  className,
}: {
  bookingId: string;
  consultationId: string;
  /** Icon-first on a phone header, where width is tight. */
  compact?: boolean;
  className?: string;
}) {
  const workspace = `/doctor/post-consultation/id?consultationId=${encodeURIComponent(
    consultationId,
  )}&bookingId=${encodeURIComponent(bookingId)}`;
  return (
    <Link
      href={withReturnTo(`/doctor/chat/${encodeURIComponent(bookingId)}`, workspace)}
      target="_blank"
      rel="noopener"
      aria-label="Open the conversation with the patient in a new tab"
      title="Conversation with the patient (opens in a new tab)"
      className={cn(
        buttonVariants({ variant: "outline", shape: "pill" }),
        "gap-1.5 border-(--border-default) px-3",
        compact ? "h-11" : "h-9",
        className,
      )}
    >
      <MessageSquare className="size-4 shrink-0" aria-hidden />
      <span className={cn(compact && "max-[419px]:sr-only")}>Conversation</span>
    </Link>
  );
}
