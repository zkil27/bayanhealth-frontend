"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, Calendar, CalendarClock, MessageSquare, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { NumberTicker } from "@/components/primitives/NumberTicker";
import { useIdToken } from "@/stores/useAuthStore";
import { bookingServices } from "@/types/booking.types";

import {
  DECLINE_NOTE_MAX,
  acceptScheduledRequest,
  declineScheduledRequest,
  fetchScheduledRequests,
  type ScheduledRequestEntry,
} from "../../lib/api/scheduledRequests";
import { DOCTOR_INTAKE_QUEUE_QUERY_KEY } from "../../hooks/usePatientBoard";
import { LIVE_QUEUE_POLL_INTERVAL_MS } from "../../lib/pollIntervals";
import { QUEUE_CARD_CLASS, queueHeaderClass } from "./queueCard";

/** Card cap, matching the dashboard-wide "no card scrolls" rule. */
const VISIBLE_CAP = 4;

const SCHEDULED_REQUESTS_QUERY_KEY = "doctor-scheduled-requests";

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

function serviceLabel(serviceType: string): string | null {
  return bookingServices.find((s) => s.value === serviceType)?.label ?? null;
}

function formatScheduledAt(scheduledAt: string): string | null {
  const date = new Date(scheduledAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

/**
 * "Scheduled requests" — scheduled bookings auto-assigned by the slot-
 * reservation matcher, still awaiting the doctor's own accept/decline
 * decision (Task 11 of the doctor-dashboard rebuild, ADR-20260828-01).
 *
 * A patient booking one of the doctor's published slots is auto-assigned the
 * moment payment confirms (`doctorHoldingReservedSlot` in `matcher.ts`) — the
 * doctor never consented to *that patient*, only to publishing the time as
 * bookable. This card is the doctor's first chance to say no, on the same
 * broadcast-pool footing `RequestPool` already gives on-demand requests, but
 * for exactly one doctor rather than every approved one: the slot was already
 * theirs.
 *
 * **Accept** confirms the doctor will hold the appointment and moves it onto
 * the intake queue (`IncomingRequestsCard`/`ReadyToStartCard`) — the same
 * landing rule every other accept path on this dashboard already applies.
 *
 * **Decline** cancels the booking and refunds the patient's held payment
 * before releasing the slot, in that order — fail-closed, so a refund failure
 * leaves the booking completely untouched rather than cancelled without a
 * refund (`backend/src/lib/scheduled-requests.ts`). The doctor may add an
 * optional note explaining why; it is shown to the patient **in-app only**,
 * never in the email/SMS notification, which the confirmation dialog states
 * outright rather than leaving the doctor to guess whether it is safe to
 * write something candid.
 *
 * Rendered as `null` when `SCHEDULED_REQUEST_RESPONSE_ENABLED` is off for
 * this environment — the same absent-not-empty convention `RequestPool`
 * already uses for `ON_DEMAND_POOL_ENABLED`.
 */
export function ScheduledRequestsCard() {
  const idToken = useIdToken();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [declining, setDeclining] = useState<ScheduledRequestEntry | null>(null);

  const requestsQuery = useQuery({
    queryKey: [SCHEDULED_REQUESTS_QUERY_KEY, idToken],
    queryFn: () => fetchScheduledRequests(idToken ?? ""),
    enabled: !!idToken,
    refetchInterval: (query) =>
      query.state.data?.kind === "unavailable" ? false : LIVE_QUEUE_POLL_INTERVAL_MS,
    retry: false,
  });

  const invalidateAfterResponse = () => {
    void queryClient.invalidateQueries({ queryKey: [SCHEDULED_REQUESTS_QUERY_KEY] });
    // Shared constant, not a string literal — an accepted request lands on the
    // intake queue, the same handoff `RequestPool`'s own accept flow already
    // depends on (ADR-20260809-08). A decline does not need this queue
    // invalidated for its own sake, but invalidating it unconditionally is
    // harmless and keeps this one call site correct for both outcomes.
    void queryClient.invalidateQueries({ queryKey: [DOCTOR_INTAKE_QUEUE_QUERY_KEY] });
  };

  const accept = useMutation({
    mutationFn: (bookingId: string) => acceptScheduledRequest(idToken ?? "", bookingId),
    onSuccess: invalidateAfterResponse,
  });

  // Flag off for this environment: render nothing rather than an empty card —
  // the one state below where the feature itself is absent, not merely quiet.
  if (requestsQuery.data?.kind === "unavailable") return null;

  const requests = requestsQuery.data?.kind === "ok" ? requestsQuery.data.requests : [];
  const visibleRequests = expanded ? requests : requests.slice(0, VISIBLE_CAP);
  const hiddenCount = requests.length - visibleRequests.length;

  return (
    <div
      className={QUEUE_CARD_CLASS}
      data-slot="scheduled-requests-card"
    >
      <h3 className={queueHeaderClass("bg-(--status-soon-bg) text-(--status-soon-fg)")}>
        <CalendarClock />
        Scheduled Requests
        <span className="ml-auto flex h-4 items-center overflow-hidden font-mono text-sm">
          <NumberTicker value={requests.length} />
        </span>
      </h3>

      <div className="flex flex-col gap-3 p-4">
        {requestsQuery.isLoading ? (
          <ScheduledRequestsSkeleton />
        ) : requestsQuery.error ? (
          <div data-slot="scheduled-requests-error" className="flex flex-col items-center gap-3 p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Couldn&apos;t load scheduled requests</AlertTitle>
              <AlertDescription>
                {requestsQuery.error instanceof Error
                  ? requestsQuery.error.message
                  : "Something went wrong"}
              </AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={() => void requestsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <Empty data-slot="scheduled-requests-empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>No scheduled requests</EmptyTitle>
              <EmptyDescription>
                Bookings made against your published slots appear here awaiting
                your accept or decline.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visibleRequests.map((entry) => (
                <ScheduledRequestRow
                  key={entry.booking.bookingId}
                  entry={entry}
                  onAccept={() => accept.mutate(entry.booking.bookingId)}
                  isAccepting={
                    accept.isPending && accept.variables === entry.booking.bookingId
                  }
                  disabled={accept.isPending}
                  onDeclineClick={() => setDeclining(entry)}
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
            ) : expanded && requests.length > VISIBLE_CAP ? (
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

      <DeclineDialog
        entry={declining}
        idToken={idToken ?? ""}
        onClose={() => setDeclining(null)}
        onDeclined={invalidateAfterResponse}
      />
    </div>
  );
}

function ScheduledRequestRow({
  entry,
  onAccept,
  isAccepting,
  disabled,
  onDeclineClick,
}: {
  entry: ScheduledRequestEntry;
  onAccept: () => void;
  isAccepting: boolean;
  disabled: boolean;
  onDeclineClick: () => void;
}) {
  const { booking } = entry;
  const fee = formatFee(booking.amountCents, booking.currency);
  const service = serviceLabel(booking.serviceType);
  const scheduledLabel = formatScheduledAt(booking.scheduledAt);
  const shortRef = booking.bookingId.slice(-6).toUpperCase();

  return (
    <li
      className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground shadow-sm"
      data-slot="scheduled-request-row"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{shortRef.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            {/*
              The patient's own name when they have saved one, and the booking
              reference — labelled as one — when they have not. The doctor is
              already the assigned clinician for this booking (the patient
              chose their published slot), so this is disclosed on the same
              terms `IncomingRequestsCard` already uses.
            */}
            <span className="text-sm font-semibold">
              {entry.patientName ?? `Ref ${shortRef}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {service ? (
                <Badge className="h-6 bg-(--status-soon-bg) text-xs text-(--status-soon-fg)">
                  {service}
                  {booking.channel ? ` · ${booking.channel}` : ""}
                </Badge>
              ) : null}
              {fee ? <span className="font-mono text-xs text-muted-foreground">{fee}</span> : null}
            </div>
            {scheduledLabel ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="size-3 shrink-0" />
                {scheduledLabel}
              </p>
            ) : null}
            {entry.reasonExcerpt ? (
              <p
                data-slot="scheduled-request-reason"
                className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground"
                title={entry.reasonExcerpt}
              >
                <MessageSquare className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-2">
                  {entry.intakeFormStatus === "draft" ? (
                    <span className="font-medium text-amber-700">Draft: </span>
                  ) : null}
                  {entry.reasonExcerpt}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDeclineClick}
          disabled={disabled || isAccepting}
          data-slot="scheduled-request-decline-trigger"
        >
          <XCircle className="mr-1.5 size-3.5" />
          Decline
        </Button>
        <Button type="button" size="sm" onClick={onAccept} disabled={disabled} className="min-w-24">
          {isAccepting ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="size-3.5" />
              Accepting…
            </span>
          ) : (
            "Accept"
          )}
        </Button>
      </div>
    </li>
  );
}

/**
 * Decline confirmation with an optional note.
 *
 * The note's in-app-only scope is stated explicitly in the dialog copy rather
 * than assumed: a doctor writing a candid reason ("not comfortable with this
 * case") needs to know up front whether it could reach the patient's inbox,
 * not discover the answer afterward.
 */
function DeclineDialog({
  entry,
  idToken,
  onClose,
  onDeclined,
}: {
  entry: ScheduledRequestEntry | null;
  idToken: string;
  onClose: () => void;
  onDeclined: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refundFailed, setRefundFailed] = useState(false);

  const decline = useMutation({
    mutationFn: (bookingId: string) => declineScheduledRequest(idToken, bookingId, note),
    onSuccess: (outcome) => {
      if (outcome.kind === "refund_failed") {
        setRefundFailed(true);
        return;
      }
      setNote("");
      setRefundFailed(false);
      onDeclined();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not decline this request.");
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (open || decline.isPending) return;
    setNote("");
    setError(null);
    setRefundFailed(false);
    decline.reset();
    onClose();
  };

  const shortRef = entry ? entry.booking.bookingId.slice(-6).toUpperCase() : "";

  return (
    <Dialog open={entry !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-slot="decline-dialog">
        <DialogHeader>
          <DialogTitle>Decline this request?</DialogTitle>
          <DialogDescription>
            {entry?.patientName ?? `Ref ${shortRef}`} will be cancelled and fully
            refunded, and the slot will be released back to your availability.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decline-note" className="text-xs">
            Note to patient (optional)
          </Label>
          <Textarea
            id="decline-note"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, DECLINE_NOTE_MAX))}
            placeholder="e.g. I'm unable to take on new patients for this specialty this week."
            rows={3}
            className="resize-none text-sm"
            disabled={decline.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Shown to the patient in-app only — never sent by email or SMS.{" "}
            {note.length}/{DECLINE_NOTE_MAX}
          </p>
        </div>

        {refundFailed ? (
          <Alert variant="destructive" data-slot="decline-refund-failed">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Refund could not be completed</AlertTitle>
            <AlertDescription>
              This booking has not been changed — it is still confirmed and
              assigned to you. Try declining again in a moment.
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert variant="destructive" data-slot="decline-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={decline.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => entry && decline.mutate(entry.booking.bookingId)}
            disabled={decline.isPending}
          >
            {decline.isPending ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3.5" />
                Declining…
              </span>
            ) : (
              "Decline and refund"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduledRequestsSkeleton() {
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
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
