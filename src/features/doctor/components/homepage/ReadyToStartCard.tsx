"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDot, Eye, TicketCheck, TriangleAlert, UserRoundX, Video } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/primitives/NumberTicker";
import { useIdToken } from "@/stores/useAuthStore";

import { usePatientBoard } from "../../hooks/usePatientBoard";
import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { useStartConsultation } from "../../hooks/useStartConsultation";
import { useAssertNoShow } from "../../hooks/useAssertNoShow";
import { composeReadyToStartItems, type ReadyToStartItem } from "../../lib/readyToStart";
import { fetchBookingPresence, isPatientOnline } from "../../lib/api/presence";
import { PRESENCE_POLL_INTERVAL_MS } from "../../lib/pollIntervals";
import { noShowWaitRemainingMs } from "../../lib/noShowWait";
import { bookingServices } from "@/types/booking.types";
import { ReadyIntakeContent } from "./ReadyIntakeContent";
import { DoctorConsultationAccess } from "./DoctorConsultationAccess";
import { QUEUE_SECTION_CLASS, queueSectionHeaderClass } from "./queueCard";

/** Card cap, matching the dashboard-wide "no card scrolls" rule. */
const VISIBLE_CAP = 4;

function serviceLabel(serviceType?: string): string | null {
  if (!serviceType) return null;
  return bookingServices.find((s) => s.value === serviceType)?.label ?? null;
}

/**
 * "Ready to start" — the doctor dashboard's highest-urgency card (Task 3 of the
 * doctor-dashboard rebuild).
 *
 * Combines intake-queue entries the doctor has already confirmed as `ready` (or
 * flagged `need_review`) with bookings already `in_progress` today, so a doctor
 * returning to a consultation they started finds their way back here instead of
 * only through the redirect `useStartConsultation` fires on click. See
 * `lib/readyToStart.ts` for why these are two sources rather than one query.
 *
 * Every row polls `GET /v1/bookings/{id}/presence` for a "Patient waiting"
 * badge — a bounded poll over only the rows actually on screen, not every
 * booking in the queue. Presence renders in exactly three states, never two: a
 * badge when the patient is confirmed online, nothing when offline, and
 * nothing (not a false negative) when presence cannot be read — the same
 * online/offline/absent honesty `ReadyIntakeContent`'s red-flag screening
 * already holds itself to.
 *
 * **Backend constraint that shapes what this badge can actually mean**: the
 * endpoint is gated by `requireLiveChatBookingContext`, which requires the
 * booking to already be `in_progress` with an active session
 * (`backend/src/lib/chat-access.ts`). A not-yet-started `ready` row has
 * neither, so its presence read always resolves to the same session-less
 * `409` that `fetchBookingPresence` degrades to `null` — meaning the badge can
 * only ever appear on an **already-started** row. That is not a defect to
 * paper over: for that row it is a genuinely useful signal distinct from
 * "in progress" itself — whether the patient is still connected right now,
 * before the doctor clicks Rejoin — and for a not-yet-started row the honest
 * answer is "unknown", which is exactly what rendering no badge says.
 */
export function ReadyToStartCard() {
  const [expanded, setExpanded] = useState(false);
  const { board, isConnecting: queueLoading, error: queueError } = usePatientBoard();
  const { bookings: todayBookings, isLoading: agendaLoading, error: agendaError } =
    useTodayAgenda();

  const isLoading = queueLoading || agendaLoading;
  const error = queueError ?? (agendaError instanceof Error ? agendaError.message : null);

  const items = composeReadyToStartItems(board.ready, todayBookings);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_CAP);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className={QUEUE_SECTION_CLASS} data-slot="ready-to-start-card">
      <h3 className={queueSectionHeaderClass("text-(--surface-brand)")}>
        <TicketCheck className="size-4" />
        Ready to Start
        <span className="ml-auto flex h-4 items-center overflow-hidden font-mono text-xs text-(--text-subtle)">
          <NumberTicker value={items.length} />
        </span>
      </h3>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <ReadyToStartSkeletonRows />
        ) : error ? (
          <p className="p-4 text-center text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <Empty data-slot="ready-to-start-empty" className="gap-2 p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TicketCheck />
              </EmptyMedia>
              <EmptyTitle>Nothing ready yet</EmptyTitle>
              <EmptyDescription>
                Consultations appear here once their intake is confirmed ready.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visibleItems.map((item) => (
                <ReadyRow key={item.bookingId} item={item} serviceLabel={serviceLabel(item.serviceType)} />
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

function ReadyRow({
  item,
  serviceLabel,
}: {
  item: ReadyToStartItem;
  serviceLabel: string | null;
}) {
  const idToken = useIdToken();
  const startConsultation = useStartConsultation();

  // Always attempted, never gated on `isInProgress` — the backend itself is
  // what decides whether presence is answerable. `GET /presence` requires a
  // *live* session (`requireLiveChatBookingContext`: booking `in_progress`
  // plus an active session), and a not-yet-started `ready` row has no session
  // to report presence for at all. `fetchBookingPresence` already degrades
  // that session-less `409` to `null`, so a not-yet-started row naturally
  // resolves to "no badge" through the same path an actual read failure
  // would — both are the honest "unknown" state, not a fabricated "offline".
  const presenceQuery = useQuery({
    queryKey: ["booking-presence", item.bookingId, idToken],
    queryFn: () => fetchBookingPresence(idToken ?? "", item.bookingId),
    enabled: !!idToken,
    refetchInterval: PRESENCE_POLL_INTERVAL_MS,
    retry: false,
  });

  const patientOnline = isPatientOnline(presenceQuery.data);

  const handleClick = () => {
    void startConsultation.start(item.bookingId);
  };

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground shadow-sm"
      data-slot="ready-to-start-row"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{item.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{item.name}</span>
              {item.isInProgress ? (
                <Badge className="h-5 bg-(--status-available-bg) text-(--status-available-fg) text-[11px]">
                  <CircleDot className="mr-0.5 size-2.5" />
                  In progress
                </Badge>
              ) : null}
              {/*
                Independent of "In progress" — see the presence query's own
                comment for why this can only ever be true on an in-progress
                row in practice, but the two badges say different things
                (started vs. still connected right now) and must not be
                collapsed into an either/or.
              */}
              {patientOnline === true ? (
                <Badge
                  className="h-5 bg-(--status-available-bg) text-(--status-available-fg) text-[11px]"
                  data-slot="patient-waiting-badge"
                >
                  Patient waiting
                </Badge>
              ) : null}
            </div>
            {serviceLabel ? (
              <span className="text-xs text-muted-foreground">{serviceLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ViewIntakeDrawer bookingId={item.bookingId} name={item.name} />
          {/*
            Not offered on an in-progress row: `settlePartialCapture` requires
            `status === 'confirmed'`, which a started consultation no longer is
            — see `ReadyToStartItem.bookingMode`'s own doc comment for why this
            field is only ever populated on a not-yet-started row in the first
            place.
          */}
          {!item.isInProgress ? <NoShowControl item={item} /> : null}
          <Button
            size="sm"
            onClick={handleClick}
            disabled={startConsultation.status === "starting"}
          >
            {startConsultation.status === "starting" ? (
              <>
                <Spinner className="mr-1.5 size-3.5" />
                {item.isInProgress ? "Rejoining…" : "Starting…"}
              </>
            ) : (
              <>
                <Video className="mr-1.5 size-3.5" />
                {item.isInProgress ? "Rejoin" : "Start"}
              </>
            )}
          </Button>
        </div>
      </div>

      {startConsultation.error ? (
        <Alert variant="destructive" data-slot="ready-to-start-row-error">
          <AlertDescription>{startConsultation.error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}

/** How often the no-show wait countdown is recomputed. */
const NO_SHOW_TICK_MS = 1000;

/**
 * "Patient didn't show" — the doctor-asserted no-show control
 * (ADR-20260808-03, ADR-20260909-01).
 *
 * Renders nothing for a booking this policy does not apply to: a scheduled
 * booking (its patient never agreed to on-demand's no-show terms) or one the
 * auto-matcher assigned directly rather than a doctor accepting it from the
 * pool (no `acceptedAt` at all, so there is no acceptance instant to measure
 * the ten-minute wait from — the backend's own settlement condition requires
 * `attribute_exists(acceptedAt)` and would reject the call regardless).
 *
 * Disabled with a live countdown until ten minutes have passed since
 * acceptance, so the doctor learns the wait from the button itself rather
 * than from a rejected call — the same reasoning
 * `ConfirmationStep`'s post-acceptance cancel panel applies to the patient
 * side of this identical window.
 */
function NoShowControl({ item }: { item: ReadyToStartItem }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const { assertNoShow, isAsserting, isSettled, errorMessage } = useAssertNoShow(
    item.bookingId,
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), NO_SHOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const hasAcceptedAt =
    typeof item.acceptedAt === "string" && item.acceptedAt.length > 0;
  if (item.bookingMode !== "on_demand" || !hasAcceptedAt) return null;

  // Settled: the row disappears once the intake-queue query this hook
  // invalidates on success re-fetches (the booking is now `cancelled`, so
  // `listDoctorIntakeQueue`'s own filter excludes it) — this state only
  // covers the brief window before that refetch lands, so it stays out of
  // the doctor's way rather than trying to explain the whole settlement here.
  if (isSettled) {
    return (
      <Badge
        className="h-8 bg-(--status-available-bg) text-(--status-available-fg)"
        data-slot="no-show-settled"
      >
        Recorded
      </Badge>
    );
  }

  const acceptedAtMs = new Date(item.acceptedAt as string).getTime();
  const remainingMs = noShowWaitRemainingMs(acceptedAtMs, nowMs);
  const waitElapsed = remainingMs === null;
  const remainingLabel = remainingMs !== null ? formatRemaining(remainingMs) : null;

  return (
    <div className="flex flex-col items-end gap-1" data-slot="no-show-control">
      <AlertDialog>
        <AlertDialogTrigger
          data-slot="no-show-trigger"
          disabled={!waitElapsed || isAsserting}
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-(--danger-fg)"
            />
          }
        >
          {isAsserting ? (
            <>
              <Spinner className="mr-1.5 size-3.5" />
              Recording…
            </>
          ) : (
            <>
              <UserRoundX className="mr-1.5 size-3.5" />
              {waitElapsed ? "Patient didn't show" : `Wait ${remainingLabel}`}
            </>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record this patient as a no-show?</AlertDialogTitle>
            <AlertDialogDescription>
              The held payment will be partially captured under our no-show
              policy, the rest released, and this booking cancelled. This
              cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction data-slot="no-show-confirm" onClick={assertNoShow}>
              Yes, record no-show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {errorMessage ? (
        <span
          data-slot="no-show-error"
          className="flex items-center gap-1 text-[11px] text-(--danger-fg)"
        >
          <TriangleAlert className="size-3 shrink-0" />
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

/** `M:SS` reading for the no-show wait countdown, matching `waitElapsed.ts`'s reading style. */
function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * "View" — the intake preview for a ready-to-start consultation.
 *
 * The old three-column board's "ready intakes" drawer rendered exactly this
 * (`ReadyIntakeContent`, plus `DoctorConsultationAccess` for the video/chat
 * entry) before the board was disassembled. It is carried over as its own
 * lightweight drawer here rather than by reusing `DoctorDashboardDrawer`
 * wholesale — that component also carries an accept/cancel flow and the
 * "Patient Preferred Communication App" panel that only apply to the
 * *incoming-request* stage (see `IncomingRequestsCard`), not to a consultation
 * already confirmed ready.
 */
function ViewIntakeDrawer({ bookingId, name }: { bookingId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-slot="ready-to-start-view-trigger"
      >
        <Eye className="mr-1.5 size-3.5" />
        View
      </Button>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>{name}</DrawerTitle>
          <DrawerClose className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </DrawerClose>
        </DrawerHeader>
        <DoctorConsultationAccess bookingId={bookingId} />
        <ReadyIntakeContent bookingId={bookingId} />
      </DrawerContent>
    </Drawer>
  );
}

function ReadyToStartSkeletonRows() {
  return (
    <ul className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </li>
      ))}
    </ul>
  );
}
