import { PatientChatList } from "@/features/patient/components/chat/PatientChatList";

/**
 * `/patient/chat` — the Chat tab.
 *
 * The route stays live — only the nav entry point is gated `comingSoon` in
 * `@/components/layout/nav-items` (alongside Med Ed), so in-consultation chat
 * and any direct link here keep working. {@link PatientChatList} is backed by
 * `GET /v1/conversations` (Task 9).
 */
export default function Page() {
  return <PatientChatList />;
}
