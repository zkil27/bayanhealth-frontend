/**
 * Minimum allowed chat message length, in characters (inclusive).
 * A message must contain at least this many characters to be accepted.
 */
export const MIN_CHAT_MESSAGE_LENGTH = 1;

/**
 * Maximum allowed chat message length, in characters (inclusive).
 * A message longer than this is rejected (Requirement 11.5).
 */
export const MAX_CHAT_MESSAGE_LENGTH = 4096;

/**
 * Result of validating a chat message.
 *
 * - `valid` — `true` when the message length is within the allowed range.
 * - `error` — present only when `valid` is `false`; a non-empty, user-facing
 *   message describing the allowed length so the UI can surface it
 *   (Requirement 11.5).
 */
export interface ChatMessageValidation {
  valid: boolean;
  error?: string;
}

/**
 * User-facing length error indication. Names the allowed range so the input
 * surface can show the allowed message length on rejection (Requirement 11.5).
 */
export const CHAT_MESSAGE_LENGTH_ERROR = `Message must be between ${MIN_CHAT_MESSAGE_LENGTH} and ${MAX_CHAT_MESSAGE_LENGTH} characters.`;

/**
 * Pure helper: validate a chat message's length.
 *
 * Accepts the message if and only if its length is between
 * {@link MIN_CHAT_MESSAGE_LENGTH} (1) and {@link MAX_CHAT_MESSAGE_LENGTH} (4096)
 * characters inclusive. Empty messages (length 0) and messages longer than 4096
 * characters are rejected with a length-related error indication
 * (Requirements 11.4, 11.5).
 *
 * @param text - The chat message text to validate.
 * @returns A {@link ChatMessageValidation} result. When `valid` is `false`,
 *   `error` carries a non-empty, length-related message for the UI.
 */
export function validateChatMessage(text: string): ChatMessageValidation {
  const length = text.length;
  if (length >= MIN_CHAT_MESSAGE_LENGTH && length <= MAX_CHAT_MESSAGE_LENGTH) {
    return { valid: true };
  }
  return { valid: false, error: CHAT_MESSAGE_LENGTH_ERROR };
}

/**
 * Whether a booking's chat conversation can still receive a new message
 * (ADR-20260909-01).
 *
 * `PatientChatRoom` hides its composer entirely once a booking is
 * `completed` or `cancelled` — the conversation is readable history only,
 * never writable again. Any UI that offers to open chat with a pre-filled
 * draft (e.g. the Care Recovery Roadmap's "Ask about this" /
 * "Something here is wrong" links) must check this first: seeding a
 * composer that will never render is a link to a dead end, not a real
 * destination.
 *
 * Extracted here, rather than left as an inline check in `PatientChatRoom`,
 * so the one rule has one home — a second place that guessed at the same
 * condition is exactly how the two could drift apart.
 *
 * @param bookingStatus - The booking's status, or `undefined` while it is
 *   still loading (treated as writable, matching `PatientChatRoom`'s own
 *   "not yet known to be read-only" default).
 */
export function isChatWritable(bookingStatus: string | undefined): boolean {
  return bookingStatus !== "completed" && bookingStatus !== "cancelled";
}
