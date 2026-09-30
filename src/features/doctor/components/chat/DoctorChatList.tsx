"use client";

import { DoctorChatSidebar } from "./DoctorChatSidebar";

export { DoctorChatSidebar };

/**
 * Backward-compatible export for `DoctorChatList`.
 * Delegates to `DoctorChatSidebar` which encapsulates search, filtering,
 * and high-density clinical conversation rows.
 */
export function DoctorChatList({ activeBookingId }: { activeBookingId?: string }) {
  return <DoctorChatSidebar activeBookingId={activeBookingId} />;
}
