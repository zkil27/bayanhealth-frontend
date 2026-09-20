import { DoctorChatList } from "@/features/doctor/components/chat/DoctorChatList";

/**
 * `/doctor/chat` — the doctor's conversation list (Task 9).
 *
 * The route stays live — only the nav entry point is gated `comingSoon` in
 * `@/components/layout/nav-items` (alongside Med Ed). Nested under
 * `(homepage)` like every other top-level doctor section (`history`,
 * `schedule`, `profile`, `kyc`), so the sidebar and header stay visible — the
 * same nav-chrome-stays choice `PatientChatRoom.tsx` documents for the
 * patient side.
 */
export default function Page() {
  return <DoctorChatList />;
}
