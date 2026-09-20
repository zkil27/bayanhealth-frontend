"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIdToken } from "@/stores/useAuthStore";
import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";
import { ConsultationVideo } from "@/features/media/components/ConsultationVideo";

/**
 * The doctor's access to the video call and the chat room for one booking.
 *
 * The patient had both and the doctor had neither. `<ConsultationVideo />`
 * requests a Join_Credential from `GET /v1/bookings/{bookingId}/video-session`
 * for whichever participant is eligible (Requirement 20.6), and only the
 * patient's booking page ever rendered a video surface at all — so a doctor
 * about to run a consultation had no video entry point of their own. The chat
 * room was equally unreachable: the only doctor-side entry was the redirect
 * fired by "Start Consultation", so a doctor who navigated away had no route
 * back into the conversation.
 *
 * Chat is gated server-side on the booking being `in_progress` with an active
 * session (`lib/chat-access.ts`), which is exactly what starting the consultation
 * produces. So this shows the chat entry only once that is true, and says what
 * unlocks it otherwise, rather than offering a control that would return `409`.
 *
 * The video surface is not gated that way — the patient can already join from
 * `confirmed` — so the doctor gets it at the same point via `<ConsultationVideo
 * />`'s own eligibility check.
 */
export function DoctorConsultationAccess({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();

  const { data } = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken && !!bookingId,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const isLive = data?.status === "in_progress";
  const isVideoEligible = data?.status === "confirmed" || isLive;

  // Nothing to offer yet: render nothing rather than an empty panel explaining
  // an absent video surface and a locked chat room.
  if (!isVideoEligible) return null;

  return (
    <section
      data-slot="doctor-consultation-access"
      className="mx-4 mb-3 flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3"
    >
      <p className="text-xs font-semibold text-foreground">Consultation access</p>

      <ConsultationVideo bookingId={bookingId} bookingStatus={data?.status} />

      <div className="flex flex-wrap gap-2">
        {isLive ? (
          <Link href={`/consultation/room/${encodeURIComponent(bookingId)}`}>
            <Button size="sm" variant="outline" className="gap-1">
              <MessageSquare className="size-3.5" />
              Open chat room
            </Button>
          </Link>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {isLive
          ? "The consultation is in progress. The chat room and the video call are both open to you and the patient."
          : "The chat room opens for both of you once you start the consultation. You can join the video call now."}
      </p>
    </section>
  );
}
