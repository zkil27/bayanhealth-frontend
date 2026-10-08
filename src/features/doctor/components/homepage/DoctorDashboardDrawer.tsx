import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Ticket, X } from "lucide-react";
import { onAcceptBooking, patientBoardInfo } from "../../types/bookingBoard.types";
import { useState } from "react";
import { BookingRequestContent } from "./BookingRequestContent";
import { DoctorConsultationAccess } from "./DoctorConsultationAccess";
import { IssueIntakeLinkButton } from "./IssueIntakeLinkButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { bookingServices } from "@/types/booking.types";
import { toast } from "sonner";

interface DoctorDashboardDrawerProps {
  patient: patientBoardInfo;
  onAcceptBooking: onAcceptBooking;
}

/**
 * "View" drawer for an incoming (not yet confirmed) booking request
 * (`IncomingRequestsCard`).
 *
 * Trimmed down from a drawer that used to serve three different board
 * columns via a `bookingStep` prop — "booking requests", "pending intakes",
 * and "ready intakes". The other two are gone: "pending intakes" was dead
 * code (see `IncomingRequestsCard`'s own doc for why `intakeQueueStatus`
 * never actually reaches `in_progress`), and "ready intakes" is now served by
 * `ReadyToStartCard`'s own lightweight `ViewIntakeDrawer`, which does not need
 * this component's accept/cancel machinery. What is left is exactly the
 * incoming-request case: preview the booking and its intake, confirm it, or
 * send the patient elsewhere.
 */
export function DoctorDashboardDrawer({
  patient,
  onAcceptBooking,
}: DoctorDashboardDrawerProps) {
  const [open, setOpen] = useState(false);

  const handleAccept = (patient: DoctorDashboardDrawerProps["patient"]) => {
    onAcceptBooking(patient);
  };

  const handleSendElsewhere = (patient: DoctorDashboardDrawerProps["patient"]) => {
    toast.info(`${patient.name}'s request has been sent to other doctors.`);
    setOpen(false);
  };

  const service = bookingServices.find((s) => s.value === patient.serviceRequested);

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold">
            View
          </Button>
        }
      />

      <DrawerContent className="mx-auto w-full max-w-lg rounded-t-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) shadow-2xl">
        <DrawerHeader className="border-b border-(--border-subtle) bg-(--surface-warm) px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-(--teal-700)/25 bg-(--teal-700)/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-(--teal-700) uppercase">
              <Ticket className="size-3" />
              Booking Request
            </span>

            <DrawerClose
              render={
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 items-center justify-center rounded-lg text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Avatar className="size-12 rounded-xl border border-(--border-subtle)">
              <AvatarImage src={patient.avatar} />
              <AvatarFallback className="rounded-xl font-bold">{patient.initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <DrawerTitle className="text-base font-bold text-(--text-heading) truncate">
                {patient.name}
              </DrawerTitle>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-(--text-muted)">
                <span className="font-medium text-(--teal-800)">
                  {service?.label || "General Consultation"}
                </span>
                <span className="text-(--text-subtle)">·</span>
                <span>{new Date(patient.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </DrawerHeader>
        <div className="relative max-h-[60dvh] overflow-y-auto overscroll-contain">
          {/*
            Video call and chat entry for the assigned doctor. `ConsultationVideo`
            (inside `DoctorConsultationAccess`) requests a Join_Credential from
            `confirmed` onward — the same point the patient can already join —
            so a doctor who could only join after formally starting had no way
            to be in the room when the patient arrives.
          */}
          <DoctorConsultationAccess bookingId={patient.bookingId} />
          <BookingRequestContent patient={patient} />
          <div className="px-4 pb-6">
            <IssueIntakeLinkButton bookingId={patient.bookingId} />
          </div>
        </div>

        <DrawerFooter className="sticky bottom-0 w-full border-t border-(--border-subtle) bg-(--surface-warm) px-4 py-3 sm:px-6">
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              type="button"
              onClick={() => handleSendElsewhere(patient)}
              variant="outline"
              size="sm"
              className="h-11 px-3 text-xs sm:h-8"
            >
              Send to Other Doctors
            </Button>
            <Button
              type="button"
              onClick={() => handleAccept(patient)}
              variant="primary"
              size="sm"
              className="h-11 flex-1 text-sm font-semibold sm:h-8 sm:text-xs"
            >
              Confirm &amp; Send Intake
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
