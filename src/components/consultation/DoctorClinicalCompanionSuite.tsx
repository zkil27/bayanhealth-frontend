"use client";

import { ChevronsDown, ChevronsUp, ClipboardList, MessagesSquare } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConsultationChatPanel } from "@/features/consultation/components/session/ConsultationChatPanel";
import { PatientIntakeReferenceTab } from "@/features/consultation/components/session/PatientIntakeReferenceTab";
import { RoomSafetyStrip } from "@/features/consultation/components/session/RoomSafetyStrip";

/**
 * Doctor-facing companion for the active consultation room (dual-pane doctor
 * view) — the counterpart to `PatientCompanionSuite` on the patient side.
 *
 * Two tabs:
 * 1. Patient Intake: the real submitted intake (safety screen, vitals, complaint).
 * 2. Conversation: the encrypted in-consultation chat thread.
 *
 * {@link RoomSafetyStrip} sits above both tabs so allergies and red flags stay
 * in view on the Conversation tab too.
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
}: {
  bookingId: string;
  sessionId?: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  return (
    <div
      data-slot="doctor-clinical-companion-suite"
      className="flex h-full min-h-0 flex-1 flex-col text-(--text-body)"
    >
      <RoomSafetyStrip bookingId={bookingId} />
      <Tabs defaultValue="intake" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-card) px-3 py-2">
          <TabsList className="h-11 w-full min-w-0 flex-1 gap-1 rounded-xl bg-(--border-subtle)/35 p-1 lg:h-8.5">
            <TabsTrigger
              value="intake"
              className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <ClipboardList className="size-3.5" />
              {/* Short labels on phones leave room for the Expand toggle beside the tabs. */}
              <span className="sm:hidden">Intake</span>
              <span className="hidden sm:inline">Patient Intake</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex-1 gap-1.5 rounded-lg py-1 text-sm font-semibold lg:text-xs text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <MessagesSquare className="size-3.5" />
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Conversation</span>
            </TabsTrigger>
          </TabsList>
          {onToggleExpanded ? (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-(--border-default) bg-(--surface-card) px-3 text-xs font-semibold text-(--text-body) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:hidden"
            >
              {expanded ? (
                <>
                  <ChevronsDown className="size-4" aria-hidden />
                  Show video
                </>
              ) : (
                <>
                  <ChevronsUp className="size-4" aria-hidden />
                  Expand
                </>
              )}
            </button>
          ) : null}
        </div>

        <TabsContent value="intake" className="min-h-0 flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <PatientIntakeReferenceTab bookingId={bookingId} />
        </TabsContent>

        <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
          <ConsultationChatPanel
            bookingId={bookingId}
            sessionId={sessionId}
            embedded
            placeholder="Type a message to your patient…"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
