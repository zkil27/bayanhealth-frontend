import AppButton from "@/components/primitives/AppButton";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Check, Ticket, X } from "lucide-react";
import { onAcceptBooking, patientBoardInfo } from "../../types/bookingBoard.types";
import { useState } from "react";
import { BookingRequestContent } from "./BookingRequestContent";
import { DoctorConsultationAccess } from "./DoctorConsultationAccess";
import { IssueIntakeLinkButton } from "./IssueIntakeLinkButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger
        render={
          // Outline rather than the solid `business` fill used elsewhere: this
          // button sits beside the solid-teal Accept action
          // (`IncomingRequestsCard`), and two solid buttons of the same weight
          // read as two equally strong calls to action when only one — Accept
          // — is the primary one.
          <AppButton type="button" variant="outline">
            View
          </AppButton>
        }
      />

      <DrawerContent className="mx-auto w-full max-w-lg rounded-t-4xl border border-border">
        <DrawerHeader>
          <div className="flex items-center justify-center p-2">
            <span className="absolute top-5 left-5 flex items-center gap-1 font-bold text-primary capitalize">
              <Ticket />
              booking request
            </span>

            <DrawerClose className="absolute top-5 right-5 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </div>

          <DrawerTitle className="flex justify-center">
            <div className="mr-4 flex items-center justify-center gap-2 text-lg">
              <Avatar className="relative size-15">
                <AvatarImage src={patient.avatar} />
                <AvatarFallback>{patient.initials}</AvatarFallback>
              </Avatar>
              {patient.name}
            </div>
          </DrawerTitle>
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex flex-col items-center justify-center rounded-lg bg-muted p-2 text-muted-foreground">
              <Badge variant="outline" className="h-10 border-none text-xl">
                <span>
                  {(() => {
                    const Icon =
                      bookingServices.find(
                        (s) => s.value === patient.serviceRequested,
                      )?.sticker || Check;
                    return <Icon className="size-6" />;
                  })()}
                </span>
                {bookingServices.find(
                  (service) => service.value === patient.serviceRequested,
                )?.label || "Unknown Service"}
              </Badge>
              <Badge
                variant="outline"
                className="flex items-center gap-0.5 border-0 p-1 text-xs text-muted-foreground"
              >
                {new Date(patient.timestamp).toLocaleString()}
              </Badge>
            </span>
          </div>
        </DrawerHeader>
        <div className="relative">
          {/*
            Video call and chat entry for the assigned doctor. `ConsultationVideo`
            (inside `DoctorConsultationAccess`) requests a Join_Credential from
            `confirmed` onward — the same point the patient can already join —
            so a doctor who could only join after formally starting had no way
            to be in the room when the patient arrives.
          */}
          <DoctorConsultationAccess bookingId={patient.bookingId} />
          <BookingRequestContent patient={patient} />
          <div className="px-4 pb-28">
            <IssueIntakeLinkButton bookingId={patient.bookingId} />
          </div>
        </div>

        <DrawerFooter className="sticky bottom-0 w-full border-t border-border bg-background p-4">
          <div className="flex w-full justify-center gap-2">
            <AppButton
              type="button"
              onClick={() => handleSendElsewhere(patient)}
              variant="ghost"
              className="text-xs hover:bg-muted"
            >
              Send to Other Doctors
            </AppButton>
            <AppButton
              type="button"
              onClick={() => handleAccept(patient)}
              variant="business"
              className="max-w-96 flex-1"
            >
              Confirm & Send Intake
            </AppButton>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
