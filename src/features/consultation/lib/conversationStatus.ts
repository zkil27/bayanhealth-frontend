/**
 * Conversation status classification, shared by the patient and doctor
 * conversation lists (Task 9).
 *
 * `GET /v1/conversations` already filters to eligible bookings server-side
 * (`backend/src/lib/chat-access.ts#isConversationEligible`), so unlike the
 * pre-Task-9 `PatientChatList.tsx` this module has nothing left to filter —
 * every entry the endpoint returns has a conversation to show. What is still
 * a client-side decision is how to label one: `isHistoryOnlyConversation`
 * distinguishes a still-open (`confirmed`/`in_progress`) conversation from a
 * closed (`completed`/`cancelled`) one, which is what drives the "Live" vs
 * "History" chip in both lists.
 */

/** Booking statuses during which the backend still accepts new messages. */
const CHAT_OPEN_STATUSES: ReadonlySet<string> = new Set([
  "confirmed",
  "in_progress",
]);

/**
 * True when the conversation is closed to new messages (read-only history).
 *
 * @param status - The conversation's `booking.status` (contract:
 *   `Booking.status`), as read off a `ConversationEntry`.
 */
export function isHistoryOnlyConversation(status: string | undefined): boolean {
  return !CHAT_OPEN_STATUSES.has(status ?? "");
}
