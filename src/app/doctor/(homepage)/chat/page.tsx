import { DoctorChatEmptyPane } from "@/features/doctor/components/chat/DoctorChatEmptyPane";

/**
 * `/doctor/chat` — Messages App view (Task 9).
 *
 * Inside `ChatLayout`, the conversation sidebar stays mounted on the left.
 * This page renders the right-pane empty / selection state on desktop,
 * while mobile viewports automatically present the conversation list full-width.
 */
export default function Page() {
  return <DoctorChatEmptyPane />;
}
