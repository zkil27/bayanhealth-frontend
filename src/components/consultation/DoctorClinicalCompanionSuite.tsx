"use client";

import { AlertCircle, ChevronsDown, ChevronsUp, ClipboardList, History, MessagesSquare, NotebookPen } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ChatUnreadBadge, useChatTabUnread } from "@/components/consultation/chatUnread";
import { ConsultationChatPanel } from "@/features/consultation/components/session/ConsultationChatPanel";
import { PatientHistoryPanel } from "@/features/consultation/components/patientHistory/PatientHistoryPanel";
import { PatientIntakeReferenceTab } from "@/features/consultation/components/session/PatientIntakeReferenceTab";
import { RoomNotesTab } from "@/features/consultation/components/session/RoomNotesTab";
import { RoomSafetyStrip } from "@/features/consultation/components/session/RoomSafetyStrip";
import type { ClinicalNotes } from "@/features/consultation/components/postConsultation/ClinicalNotesCard";

/**
 * Doctor-facing companion for the active consultation room (dual-pane doctor
 * view) — the counterpart to `PatientCompanionSuite` on the patient side.
 *
 * Four tabs:
 * 1. Patient Intake: the real submitted intake (safety screen, vitals, complaint).
 * 2. Past medical history: the versioned patient chart. Pre-filled from the
 *    intake on a first consult, from the latest version afterwards; edits are
 *    a draft on this device, saved as a version from the post-consult workspace.
 * 3. Notes: the doctor's own Subjective and Objective, written during the call
 *    (pilot feedback 2026-11). Same record as the post-consult workspace; the
 *    room owns the hook so End consultation can save them first.
 * 4. Conversation: the encrypted in-consultation chat thread.
 *
 * {@link RoomSafetyStrip} sits above all four so allergies and red flags stay
 * in view while the doctor types or chats.
 *
 * Below `lg` the suite is stacked under the video, so it can take over the
 * screen: `onToggleExpanded` flips the room between video-first and
 * panel-first (the room collapses the video to its compact strip while
 * `expanded`). Both props are optional; without them the toggle is not drawn.
 */
export function DoctorClinicalCompanionSuite({
  bookingId,
  sessionId,
  expanded = false,
  onToggleExpanded,
  notes,
  notesAvailable = false,
  demo = false,
}: {
  bookingId: string;
  sessionId?: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  /** The doctor's notes, owned by the room. Without it the Notes tab is not drawn. */
  notes?: ClinicalNotes;
  /** The consultation has started, so notes can be saved. */
  notesAvailable?: boolean;
  demo?: boolean;
}) {
  const chatTabs = useChatTabUnread("intake");
  return (
    <div
      data-slot="doctor-clinical-companion-suite"
      className="flex h-full min-h-0 flex-1 flex-col text-(--text-body)"
    >
      <RoomSafetyStrip bookingId={bookingId} />
      <Tabs
        value={chatTabs.tab}
        onValueChange={(v) => chatTabs.setTab(String(v))}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-card) px-3 py-2">
          <TabsList className="h-11 w-full min-w-0 flex-1 gap-1 rounded-xl bg-(--border-subtle)/35 p-1 lg:h-8.5">
            <TabsTrigger
              value="intake"
              className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <ClipboardList className="size-3.5 max-sm:hidden" aria-hidden />
              {/* Short labels on phones leave room for the Expand toggle beside the tabs. */}
              <span className="sm:hidden">Intake</span>
              <span className="hidden sm:inline">Patient Intake</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <History className="size-3.5 max-sm:hidden" aria-hidden />
              <span className="sm:hidden">History</span>
              <span className="hidden sm:inline xl:hidden">Past history</span>
              <span className="hidden xl:inline">Past medical history</span>
            </TabsTrigger>
            {notes ? (
              <TabsTrigger
                value="notes"
                className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
              >
                <NotebookPen className="size-3.5 max-sm:hidden" aria-hidden />
                Notes
                {/* Seen from any tab: a save that failed is never silent. */}
                {notes.saveFailed && notes.dirty ? (
                  <>
                    <AlertCircle className="size-3.5 text-(--attention-fg)" aria-hidden />
                    <span className="sr-only">(not saved)</span>
                  </>
                ) : null}
              </TabsTrigger>
            ) : null}
            <TabsTrigger
              value="chat"
              className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <MessagesSquare className="size-3.5 max-sm:hidden" aria-hidden />
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Conversation</span>
              <ChatUnreadBadge count={chatTabs.unread} />
            </TabsTrigger>
          </TabsList>
          {onToggleExpanded ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-(--border-default) bg-(--surface-card) px-3 text-xs max-sm:px-0 font-semibold text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:hidden"
            >
              {expanded ? (
                <>
                  <ChevronsDown className="size-4" aria-hidden />
                  {/* Icon-only on phones: four tabs need the width. */}
                  <span className="max-sm:sr-only">Show video</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="size-4" aria-hidden />
                  <span className="max-sm:sr-only">Expand</span>
                </>
              )}
            </button>
          ) : null}
        </div>

        <TabsContent value="intake" className="min-h-0 flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <PatientIntakeReferenceTab bookingId={bookingId} />
        </TabsContent>

        {/* Kept mounted so an open section editor survives switching tabs. */}
        <TabsContent value="history" keepMounted className="min-h-0 flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <PatientHistoryPanel bookingId={bookingId} mode="edit" showTitle={false} />
        </TabsContent>

        {/* Kept mounted so a half-typed note survives switching tabs. */}
        {notes ? (
          <TabsContent value="notes" keepMounted className="min-h-0 flex-1 flex flex-col overflow-y-auto overscroll-contain">
            <RoomNotesTab notes={notes} available={notesAvailable} demo={demo} />
          </TabsContent>
        ) : null}

        {/* Kept mounted so the conversation stays connected and can count
            unread messages while the intake tab is open. */}
        <TabsContent value="chat" keepMounted className="min-h-0 flex-1 overflow-hidden">
          <ConsultationChatPanel
            bookingId={bookingId}
            sessionId={sessionId}
            active={chatTabs.chatActive}
            onIncomingMessage={chatTabs.onIncomingMessage}
            embedded
            placeholder="Type a message to your patient…"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
