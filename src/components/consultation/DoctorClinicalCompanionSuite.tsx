"use client";

import { ClipboardList, MessagesSquare } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConsultationChatPanel } from "@/features/consultation/components/session/ConsultationChatPanel";
import { PatientIntakeReferenceTab } from "@/features/consultation/components/session/PatientIntakeReferenceTab";

/**
 * Doctor-facing companion for the active consultation room (dual-pane doctor
 * view) — the counterpart to `PatientCompanionSuite` on the patient side.
 *
 * Two tabs: the patient's real submitted intake (the same
 * `GET /v1/bookings/{bookingId}/intake` the pre-consult queue and the
 * post-consult workspace already read — see `PatientIntakeReferenceTab`) and
 * the conversation itself. There is no clinical-notes scratchpad here — the
 * doctor's SOAP note is written in the post-consult workspace, not live in
 * the call.
 */
export function DoctorClinicalCompanionSuite({
  bookingId,
  sessionId,
}: {
  bookingId: string;
  sessionId?: string;
}) {
  return (
    <div
      data-slot="doctor-clinical-companion-suite"
      className="flex h-full flex-col text-(--text-body)"
    >
      <Tabs defaultValue="intake" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="shrink-0 border-b border-(--border-subtle) bg-(--surface-card) p-3">
          <TabsList className="h-auto w-full gap-1 rounded-2xl bg-(--border-subtle)/50 p-1">
            <TabsTrigger
              value="intake"
              className="flex-1 gap-1.5 rounded-xl py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-xs"
            >
              <ClipboardList className="size-3.5" />
              Patient Intake
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex-1 gap-1.5 rounded-xl py-2 text-xs font-bold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-xs"
            >
              <MessagesSquare className="size-3.5" />
              Conversation
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="intake" className="min-h-0 flex-1 overflow-y-auto">
          <PatientIntakeReferenceTab bookingId={bookingId} />
        </TabsContent>

        <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
          <ConsultationChatPanel bookingId={bookingId} sessionId={sessionId} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
