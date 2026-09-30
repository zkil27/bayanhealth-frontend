"use client";

import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DoctorChatSidebar } from "./DoctorChatSidebar";

interface DoctorChatShellProps {
  children: React.ReactNode;
}

export function DoctorChatShell({ children }: DoctorChatShellProps) {
  const params = useParams();
  const rawBookingId = params?.bookingId;
  const bookingId =
    typeof rawBookingId === "string"
      ? decodeURIComponent(rawBookingId)
      : Array.isArray(rawBookingId) && typeof rawBookingId[0] === "string"
        ? decodeURIComponent(rawBookingId[0])
        : undefined;

  return (
    <div
      data-slot="doctor-messages-app-shell"
      className="flex h-[calc(100dvh-5rem)] lg:h-full w-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-xs"
    >
      {/* Left Pane: Conversation Sidebar */}
      <aside
        data-slot="doctor-chat-sidebar-pane"
        className={cn(
          "flex flex-col border-r border-(--border-subtle) bg-(--surface-card)",
          bookingId
            ? "hidden md:flex md:w-80 lg:w-96 shrink-0"
            : "flex w-full md:w-80 lg:w-96 shrink-0",
        )}
      >
        <DoctorChatSidebar activeBookingId={bookingId} />
      </aside>

      {/* Right Pane: Conversation Content or Empty State */}
      <section
        data-slot="doctor-chat-main-pane"
        className={cn(
          "flex-1 min-w-0 flex flex-col h-full bg-(--surface-page) overflow-hidden",
          bookingId ? "flex w-full" : "hidden md:flex",
        )}
      >
        {children}
      </section>
    </div>
  );
}
