"use client";

import { useCallback } from "react";
import { CalendarClock, FileQuestion, MessageSquare, Stethoscope } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  fetchBookingIntake,
  type BookingIntakeForm,
} from "../../lib/api/bookingIntake";
import type { patientBoardInfo } from "../../types/bookingBoard.types";

/**
 * What the doctor sees when deciding whether to accept a booking request.
 *
 * This panel took no props and made no request. It showed the same fabricated
 * details for every booking: `"63+ 9182758492"` wrapped in a copy control, an
 * emergency number `"63+ 9581728391"`, the literal `"PATIENT ADDRESS"`,
 * `"Tagalog | English"`, `"Preffered Name : NAME"`, and `"Messenger | Viber"`.
 * A copy-able fake phone number on a clinical screen is the worst of those — it
 * invites the doctor to act on it.
 *
 * **There is no patient contact endpoint.** The platform does not collect a
 * patient phone number, address, or emergency contact anywhere, so those fields
 * are removed rather than re-sourced — inventing them was the only way they could
 * ever have been populated.
 *
 * What IS real at this stage: the booking's service, channel, requested time, and
 * whether the patient has submitted their intake, plus the chief complaint once
 * they have. That is what the accept decision actually rests on.
 */
export function BookingRequestContent({
  patient,
}: {
  patient: patientBoardInfo;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const fetcher = useCallback(
    () => fetchBookingIntake(idToken ?? "", patient.bookingId),
    [idToken, patient.bookingId],
  );

  return (
    <ScrollArea className="h-72 max-h-72 pb-25 md:max-h-96">
      <div className="flex flex-col justify-center gap-4 px-4 md:flex-row">
        <Card className="w-full md:w-auto">
          <CardHeader>
            <CardTitle className="rounded-2xl bg-muted px-3 py-1.5 text-muted-foreground">
              Booking request
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
              <span className="capitalize">
                {patient.serviceRequested.replaceAll("-", " ")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
              <span>{new Date(patient.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {patient.bookingId}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full md:w-auto">
          <CardHeader>
            <CardTitle className="rounded-2xl bg-muted px-3 py-1.5 text-muted-foreground">
              Patient intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AsyncView<BookingIntakeForm | null>
              fetcher={fetcher}
              deps={[idToken, patient.bookingId]}
              empty={<NoIntakeYet />}
            >
              {(form) => (form ? <IntakeSummary form={form} /> : <NoIntakeYet />)}
            </AsyncView>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function NoIntakeYet() {
  return (
    <div
      className="flex flex-col items-center gap-1.5 py-4 text-center"
      data-slot="booking-request-no-intake"
    >
      <FileQuestion className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        Intake not submitted yet
      </p>
      <p className="text-xs text-muted-foreground">
        You can still accept and send the patient an intake link.
      </p>
    </div>
  );
}

function IntakeSummary({ form }: { form: BookingIntakeForm }) {
  const chiefComplaint = form.sections.purpose?.chiefComplaint?.trim();
  const screen = form.sections.details?.safetyScreen;
  const hasRedFlag = screen?.chestPain === true || screen?.dyspnea === true;

  return (
    <div className="flex flex-col gap-3" data-slot="booking-request-intake">
      <Badge variant="outline" className="w-fit capitalize">
        {form.status}
      </Badge>

      <div className="flex items-start gap-3">
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm">
          {chiefComplaint || (
            <span className="text-muted-foreground italic">
              No chief complaint recorded
            </span>
          )}
        </span>
      </div>

      {hasRedFlag ? (
        <Badge variant="destructive" className="w-fit">
          Red flag reported
        </Badge>
      ) : null}
    </div>
  );
}
