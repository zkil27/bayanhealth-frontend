import { DoctorChatShell } from "@/features/doctor/components/chat/DoctorChatShell";

/**
 * `/doctor/chat` layout — Messages app master-detail split layout.
 *
 * Wraps both `/doctor/chat` (root conversation list + empty preview pane)
 * and `/doctor/chat/[bookingId]` (selected conversation thread).
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DoctorChatShell>{children}</DoctorChatShell>;
}
