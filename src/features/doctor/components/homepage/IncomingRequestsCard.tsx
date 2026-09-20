"use client";

import { useState } from "react";
import { Clock, MessageSquare, Ticket } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { NumberTicker } from "@/components/primitives/NumberTicker";
import { getRelativeTimeStringFromTimestamp } from "@/lib/utils";
import { bookingServices } from "@/types/booking.types";

import { usePatientBoard } from "../../hooks/usePatientBoard";
import type { onAcceptBooking, patientBoardInfo } from "../../types/bookingBoard.types";
import { DoctorDashboardDrawer } from "./DoctorDashboardDrawer";
import { QUEUE_SECTION_CLASS, queueSectionHeaderClass } from "./queueCard";

/** Card cap, matching the dashboard-wide "no card scrolls" rule. */
const VISIBLE_CAP = 4;

/** Format a Booking's minor-unit fee, or `null` when the booking carries no fee. */
function formatFee(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amountCents / 100,
    );
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * "Incoming requests" — scheduled bookings still awaiting intake confirmation
 * (Task 6 of the doctor-dashboard rebuild).
 *
 * This is the compact-card replacement for the old three-column board's
 * "booking requests" column (`DoctorDashboardBoard` + `bookingSteps` union).
 * It is not redundant with `RequestPool` or `ReadyToStartCard`: those cover
 * on-demand pool requests and consultations already confirmed `ready`, but a
 * scheduled booking newly assigned by auto-match still needs the doctor to
 * either **confirm** its submitted intake (moving it to `ready`, which is what
 * lands it on the Ready-to-start card) or **issue an intake link** when the
 * patient has not submitted one yet. Neither action exists anywhere else on
 * the dashboard, so dropping this column when the board was disassembled would
 * have silently removed a working feature rather than retiring dead code.
 *
 * The sibling "pending intakes" column *is* dead code and was not carried
 * forward: `intakeQueueStatus` is typed to allow `'in_progress'`
 * (`backend/src/lib/booking.ts`'s `INTAKE_QUEUE_STATUSES`), but no backend
 * write path — `setIntakeQueueStatus`, `claimOnDemandRequest`,
 * `routeAssignmentChangeForBooking`, `finalizeBookingAfterPaymentConfirm` —
 * ever sets that value. `usePatientBoard.board.pending` is permanently empty
 * in production, and the "Upcoming Consultations" card it fed is superseded
 * outright by {@link ../UpcomingTodayCard}.
 */
export function IncomingRequestsCard() {
  const [expanded, setExpanded] = useState(false);
  const { board, isConnecting, error, acceptPatient } = usePatientBoard();

  const items = board.requests;
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_CAP);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className={QUEUE_SECTION_CLASS} data-slot="incoming-requests-card">
      <h3 className={queueSectionHeaderClass("text-(--status-available-fg)")}>
        <Ticket className="size-4" />
        Incoming
        <span className="ml-auto flex h-4 items-center overflow-hidden font-mono text-xs text-(--text-subtle)">
          <NumberTicker value={items.length} />
        </span>
      </h3>

      <div className="flex flex-col gap-3">
        {isConnecting ? (
          <IncomingRequestsSkeleton />
        ) : error ? (
          <p className="p-4 text-center text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <Empty data-slot="incoming-requests-empty" className="gap-2 p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Ticket />
              </EmptyMedia>
              <EmptyTitle>No incoming requests</EmptyTitle>
              <EmptyDescription>
                New scheduled bookings awaiting intake confirmation appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visibleItems.map((item) => (
                <IncomingRequestRow
                  key={item.bookingId}
                  item={item}
                  onAccept={acceptPatient}
                />
              ))}
            </ul>
            {hiddenCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(true)}
              >
                {hiddenCount} more
              </Button>
            ) : expanded && items.length > VISIBLE_CAP ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-center text-xs"
                onClick={() => setExpanded(false)}
              >
                Show less
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Direct accept control, carried over from the old board's own `AcceptButton`
 * (Figma O9) — a solid pill would read as already-confirmed, so the pending
 * state says "Accepting…" with a spinner instead, matching `RequestPool`'s
 * pooled-accept button.
 */
function AcceptButton({
  patient,
  onAccept,
}: {
  patient: patientBoardInfo;
  onAccept: onAcceptBooking;
}) {
  const [accepting, setAccepting] = useState(false);

  const handleClick = async () => {
    setAccepting(true);
    try {
      await onAccept(patient);
    } finally {
      // On success the item leaves this list on the next render; on failure
      // (rolled back by usePatientBoard's mutation) it stays, so resetting
      // here either way lets the doctor retry rather than getting stuck
      // disabled.
      setAccepting(false);
    }
  };

  return (
    <Button type="button" onClick={handleClick} disabled={accepting} className="min-w-24">
      {accepting ? (
        <span className="flex items-center gap-1.5">
          <Spinner className="size-3.5" />
          Accepting…
        </span>
      ) : (
        "Accept"
      )}
    </Button>
  );
}

function IncomingRequestRow({
  item,
  onAccept,
}: {
  item: patientBoardInfo;
  onAccept: onAcceptBooking;
}) {
  const itemService = bookingServices.find((s) => s.value === item.serviceRequested);
  const fee = formatFee(item.amountCents, item.currency);

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground shadow-sm"
      data-slot="incoming-request-row"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-9">
            <AvatarImage src={item.avatar} />
            <AvatarFallback>{item.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{item.name}</span>
            <div className="flex flex-wrap items-center gap-2">
              {item.serviceRequested ? (
                <Badge className="h-6 bg-(--status-available-bg) text-xs text-(--status-available-fg)">
                  {itemService ? (
                    <span className="flex items-center">
                      <itemService.sticker className="mr-1 size-3" />
                      {itemService.label}
                      {item.channel ? ` · ${item.channel}` : ""}
                    </span>
                  ) : (
                    "Unknown service"
                  )}
                </Badge>
              ) : null}
              {fee ? <span className="font-mono text-xs text-muted-foreground">{fee}</span> : null}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              Requested {getRelativeTimeStringFromTimestamp(item.timestamp)}
            </p>
            {item.reasonExcerpt ? (
              <p
                data-slot="incoming-request-reason"
                className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground"
                title={item.reasonExcerpt}
              >
                <MessageSquare className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-2">
                  {item.intakeFormStatus === "draft" ? (
                    <span className="font-medium text-amber-700">Draft: </span>
                  ) : null}
                  {item.reasonExcerpt}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <DoctorDashboardDrawer patient={item} onAcceptBooking={onAccept} />
        <AcceptButton patient={item} onAccept={onAccept} />
      </div>
    </li>
  );
}

function IncomingRequestsSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <li key={i} className="flex flex-col gap-2 rounded-xl border p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
