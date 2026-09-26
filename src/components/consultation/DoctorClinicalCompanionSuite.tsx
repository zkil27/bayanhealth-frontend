"use client";

import { ClipboardList, FileText, MessagesSquare } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConsultationChatPanel } from "@/features/consultation/components/session/ConsultationChatPanel";
import { PatientIntakeReferenceTab } from "@/features/consultation/components/session/PatientIntakeReferenceTab";
import { DoctorDeliverablesPreviewTab } from "@/features/consultation/components/session/DoctorDeliverablesPreviewTab";

/**
 * Doctor-facing companion for the active consultation room (dual-pane doctor
 * view) — the counterpart to `PatientCompanionSuite` on the patient side.
 *
 * Three tabs:
 * 1. Patient Intake: the real submitted intake (safety screen, vitals, complaint).
 * 2. Conversation: the encrypted in-consultation chat thread.
 * 3. Patient Documents: live authentic paper preview of the clinical deliverables
 *    (Prescription, MedCert, Diagnostic, Referral, Care Guide) so the physician
 *    can inspect the exact artifact the patient receives.
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
      className="flex h-full min-h-0 flex-1 flex-col text-(--text-body)"
    >
      <Tabs defaultValue="intake" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="shrink-0 border-b border-(--border-subtle) bg-(--surface-card) px-3 py-2">
          <TabsList className="h-8.5 w-full gap-1 rounded-xl bg-(--border-subtle)/35 p-1">
            <TabsTrigger
              value="intake"
              className="flex-1 gap-1.5 rounded-lg py-1 text-xs font-semibold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <ClipboardList className="size-3.5" />
              Patient Intake
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex-1 gap-1.5 rounded-lg py-1 text-xs font-semibold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <MessagesSquare className="size-3.5" />
              Conversation
            </TabsTrigger>
            <TabsTrigger
              value="deliverables"
              className="flex-1 gap-1.5 rounded-lg py-1 text-xs font-semibold text-(--text-muted) hover:text-(--text-body) data-active:bg-(--surface-card) data-active:text-(--surface-nav) data-active:shadow-2xs transition-all"
            >
              <FileText className="size-3.5" />
              Documents Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="intake" className="min-h-0 flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <PatientIntakeReferenceTab bookingId={bookingId} />
        </TabsContent>

        <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
          <ConsultationChatPanel bookingId={bookingId} sessionId={sessionId} embedded />
        </TabsContent>

        <TabsContent value="deliverables" className="min-h-0 flex-1 overflow-hidden flex flex-col">
          <DoctorDeliverablesPreviewTab bookingId={bookingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
